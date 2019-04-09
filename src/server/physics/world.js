const config = require("../config");
const physics = require("./manager");

// Constructor for starting area, starting gate, and finish line
// WIP: Might be useful encapsulation, might be gutter trash
function LevelCollider(colliderData, transform) {
	this.colliderData = colliderData;
	this.transform = transform;
	this.ammoBody = null; // Unused by starting area
}

LevelCollider.prototype.removeFromWorld = function() {
	// For opening starting gate?
};


module.exports = function() {
	let _collisionConfiguration,
		_dispatcher,
		_broadphase,
		_solver,
		_physicsWorld,
		startAreas = [];

	// Physics configuration
	_collisionConfiguration = new physics.ammo.btDefaultCollisionConfiguration();
	_dispatcher = new physics.ammo.btCollisionDispatcher(_collisionConfiguration );
	_broadphase = new physics.ammo.btDbvtBroadphase();
	_solver = new physics.ammo.btSequentialImpulseConstraintSolver();
	_physicsWorld = new physics.ammo.btDiscreteDynamicsWorld(_dispatcher, _broadphase, _solver, _collisionConfiguration );
	_physicsWorld.setGravity( new physics.ammo.btVector3( 0, config.physics.gravity, 0 ) );

	let _lastPhysicsUpdate = Date.now();

	function _updatePhysics( deltaTime ) {
		_physicsWorld.stepSimulation( deltaTime, 10 );
	}

	let _updateInterval;
	let _startUpdateInterval = function() {
		_updateInterval = setInterval(function() {
			let now = Date.now();
			let deltaTime = (now - _lastPhysicsUpdate) / 1000;
			_lastPhysicsUpdate = now;
			_updatePhysics(deltaTime);
		}, 1000 / config.physics.steps);
	};

	_startUpdateInterval();

	let _randomPositionInStartAreas = function() {
		let area = startAreas[Math.floor(startAreas.length * Math.random())];

		let transform = new physics.ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(
			new physics.ammo.btVector3(
				Math.random() * area.prefabEntity.colliderData.width  - ( area.prefabEntity.colliderData.width  * .5 ),
				Math.random() * area.prefabEntity.colliderData.height - ( area.prefabEntity.colliderData.height * .5 ),
				Math.random() * area.prefabEntity.colliderData.depth  - ( area.prefabEntity.colliderData.depth  * .5 )
			)
		);

		// Clone the transform because op_mul modifies the transform it is called on
		let newTransform = new physics.ammo.btTransform();
		newTransform.setIdentity();
		newTransform.setOrigin(area.transform.getOrigin());
		newTransform.setRotation(area.transform.getRotation());

		newTransform.op_mul(transform); // Modifies "newTransform"

		let origin = newTransform.getOrigin();

		return origin;
	};

	return {
		map: null,
		updateInterval: null,
		gates: [],
		startAreas,
		endAreas: [],

		createMarble(marble) {
			// Create physics body
			let sphereShape = physics.shapes.defaultMarble;
			if(0.2 !== marble.size) { // TODO: Magic number
				sphereShape = new physics.ammo.btSphereShape(marble.size); // Create new collision shape if the radius does not match
			}
			sphereShape.setMargin( 0.05 );
			let mass = (marble.size || 0.5) * 5; // TODO
			let localInertia = new physics.ammo.btVector3( 0, 0, 0 );
			sphereShape.calculateLocalInertia( mass, localInertia );
			let transform = new physics.ammo.btTransform();
			transform.setIdentity();
			transform.setOrigin( _randomPositionInStartAreas() );
			let motionState = new physics.ammo.btDefaultMotionState( transform );
			let bodyInfo = new physics.ammo.btRigidBodyConstructionInfo( mass, motionState, sphereShape, localInertia );
			marble.ammoBody = new physics.ammo.btRigidBody( bodyInfo );

			// For future reference: setUserPointer doesn't work (out of the box, anyway. Maybe not at all for Js objects), setUserIndex only works for numbers
			//marble.ammoBody.setUserIndex(42);

			// Add to physics world
			_physicsWorld.addRigidBody(marble.ammoBody);
		},

		destroyMarble(marble) {
			_physicsWorld.removeRigidBody(marble.ammoBody);
		},

		setAllGatesState(newGateState) {
			for (let gate of this.gates) {
				this.setGateState(gate, newGateState);
			}
		},

		setGateState(gate, newGateState) {
			let offset;
			if (newGateState === "close") {
				gate.state = "closed";
				offset = 0;
			} else {
				gate.state = "opened";
				offset = (gate.collider.colliderData.height + 2);
			}

			let origin = gate.rigidBody.getWorldTransform().getOrigin();

			origin.setY(
				gate.transform.getOrigin().y() - offset
			);
			gate.rigidBody.activate();
		},

		addStartGate(collider, transform) {
			let gate = this.addPrimitiveCollider(collider, transform);

			// Gates are closed by default
			gate.state = "closed";
			this.gates.push(gate);

			return gate;
		},

		addPrimitiveCollider(collider, transform) {
			let shape;

			switch (collider.colliderData.shape) {
			case "box":
			default:
				shape = new physics.ammo.btBoxShape(
					new physics.ammo.btVector3(
						collider.colliderData.width * .5,
						collider.colliderData.height * .5,
						collider.colliderData.depth * .5
					)
				);
				break;
			case "sphere":
				shape = new physics.ammo.btSphereShape( collider.colliderData.radius );
				break;
			case "cone":
				shape = new physics.ammo.btConeShape(
					collider.colliderData.radius,
					collider.colliderData.height
				);
				break;
			case "cylinder":
				shape = new physics.ammo.btCylinderShape(
					new physics.ammo.btVector3(
						collider.colliderData.radius,
						collider.colliderData.height * .5,
						collider.colliderData.radius
					)
				);
				break;
			}

			if (!transform) {
				transform = new physics.ammo.btTransform();
				transform.setIdentity();
				transform.setOrigin(
					new physics.ammo.btVector3(
						collider.position.x,
						collider.position.y,
						collider.position.z
					)
				);
				transform.setRotation(
					new physics.ammo.btQuaternion(
						collider.rotation.x,
						collider.rotation.y,
						collider.rotation.z,
						collider.rotation.w
					)
				);
			}

			let mass = 0;
			let localInertia = new physics.ammo.btVector3(0, 0, 0);

			shape.calculateLocalInertia(mass, localInertia);

			let motionState = new physics.ammo.btDefaultMotionState(transform);
			let rigidBodyInfo = new physics.ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
			let rigidBody = new physics.ammo.btRigidBody(rigidBodyInfo);

			switch (collider.functionality) {
			case "startgate":
			case "dynamic":
				rigidBody.setCollisionFlags(2);
				break;
			case "static":
			default:
				rigidBody.setCollisionFlags(1);
				break;
			}

			_physicsWorld.addRigidBody(rigidBody);

			return {
				rigidBody,
				collider,
				transform
			};
		},

		startUpdateInterval() {
			this.stopUpdateInterval();
			_startUpdateInterval();
		},

		stopUpdateInterval() {
			clearInterval(_updateInterval);
		},

		addTerrainCollider(mapObj) {
			function createTerrainShape() {
				// Up axis = 0 for X, 1 for Y, 2 for Z. Normally 1 = Y is used.
				let upAxis = 1;

				// hdt, height data type. "PHY_FLOAT" is used. Possible values are "PHY_FLOAT", "PHY_UCHAR", "PHY_SHORT"
				let hdt = "PHY_FLOAT";

				// Set this to your needs (inverts the triangles)
				let flipQuadEdges = false;

				// Creates height data buffer in Ammo heap
				let ammoHeightData = null;
				ammoHeightData = physics.ammo._malloc(4 * mapObj.width * mapObj.depth);

				// Copy the javascript height data array to the Ammo one.
				let p = 0,
					p2 = 0;

				for (let j = 0; j < mapObj.depth; j++) {
					for (let i = 0; i < mapObj.width; i++) {
						// write 32-bit float data to memory
						physics.ammo.HEAPF32[ammoHeightData + p2 >> 2] = mapObj.zArray[p];
						p++;

						// 4 bytes/float
						p2 += 4;
					}
				}

				// Creates the heightfield physics shape
				let heightFieldShape = new physics.ammo.btHeightfieldTerrainShape(
					mapObj.width,
					mapObj.depth,
					ammoHeightData,
					1,
					mapObj.minZ,
					mapObj.maxZ,
					upAxis,
					hdt,
					flipQuadEdges
				);

				// Set horizontal scale
				let scaleX = mapObj.gridDistance;
				let scaleZ = mapObj.gridDistance;
				heightFieldShape.setLocalScaling(new physics.ammo.btVector3(scaleX, 1, scaleZ));

				heightFieldShape.setMargin(0.05);

				return heightFieldShape;
			}

			// Create the terrain body
			let groundShape = createTerrainShape(mapObj);
			let groundTransform = new physics.ammo.btTransform();
			groundTransform.setIdentity();
			let groundMass = 0;
			let groundLocalInertia = new physics.ammo.btVector3(0, 0, 0);
			let groundMotionState = new physics.ammo.btDefaultMotionState(groundTransform);
			let groundBody = new physics.ammo.btRigidBody(new physics.ammo.btRigidBodyConstructionInfo(groundMass, groundMotionState, groundShape, groundLocalInertia));

			// Set static
			groundBody.setCollisionFlags(1);

			_physicsWorld.addRigidBody(groundBody);
		}
	};
}();
