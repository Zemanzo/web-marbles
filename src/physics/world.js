const physics = require("./manager");
const EventEmitter = require("events");

// Constructor for starting area, starting gate, and finish line
function LevelCollider(colliderData, functionality, transform, id) {
	this.colliderData = colliderData;
	this.type = functionality;
	this.id = id; // Used for identifying colliders in callbacks
	this.transform = transform;
	this.ammoBody = null; // Unused by starting area
	this.isInWorld = false; // Flag to track whether it's added to the world
}

LevelCollider.prototype.addToWorld = function() {
	if(!this.isInWorld && this.ammoBody) {
		this.isInWorld = true;
		physicsWorld.ammoPhysicsWorld.addRigidBody(this.ammoBody);
	}
};

LevelCollider.prototype.removeFromWorld = function() {
	if(this.isInWorld) {
		this.isInWorld = false;
		physicsWorld.ammoPhysicsWorld.removeRigidBody(this.ammoBody);
	}
};


const physicsWorld = function() {
	let _collisionConfiguration,
		_dispatcher,
		_broadphase,
		_solver,
		ammoPhysicsWorld,
		_levelColliders = [], // Collection of all level colliders
		_startAreas = [], // Quicklist of start areas
		_startGates = [], // Quicklist of starting gates
		_specialColliders = [], // Quicklist of colliders that cause collision callbacks
		_physicsMarbles = [], // List of (active) marbles
		_ids = 1, // Starts at 1 to prevent conflicts with marble entryId 0
		_timeStep = 1 / 120, // Default, configurable
		_stepRemainder = 0,
		_maxTicksPerUpdate = 10,
		_updateInterval = null,
		_lastPhysicsUpdate = null,
		eventEmitter = null;

	// Physics configuration
	_collisionConfiguration = new physics.ammo.btDefaultCollisionConfiguration();
	_dispatcher = new physics.ammo.btCollisionDispatcher(_collisionConfiguration );
	_broadphase = new physics.ammo.btDbvtBroadphase();
	_solver = new physics.ammo.btSequentialImpulseConstraintSolver();
	ammoPhysicsWorld = new physics.ammo.btDiscreteDynamicsWorld(_dispatcher, _broadphase, _solver, _collisionConfiguration );
	ammoPhysicsWorld.setGravity( new physics.ammo.btVector3( 0, -10, 0 ) );

	// Used for physics-related events, such as finished/OoB marbles:
	// "marbleFinished" (entryId)
	eventEmitter = new EventEmitter();

	function _updatePhysics() {
		// Steps have to be constant WITHOUT bullet substepping
		ammoPhysicsWorld.stepSimulation( _timeStep, 0 );

		// Check collision pairs and handle callbacks
		let numManifolds = _dispatcher.getNumManifolds();
		for(let i = 0; i < numManifolds; i++) {
			let manifold = _dispatcher.getManifoldByIndexInternal(i);
			let contact = false;

			for(let p = 0; p < manifold.getNumContacts(); p++) {
				if(manifold.getContactPoint(p).getDistance() <= 0) {
					contact = true;
					break;
				}
			}

			if(contact) {
				let marble = null;
				let levelCollider = null;

				let body0 = manifold.getBody0().getUserIndex();
				let body1 = manifold.getBody1().getUserIndex();

				// Find the marble and levelCollider for this collision
				if(body0 > 0) {
					for(let m = 0; m < _specialColliders.length; m++) {
						if(_specialColliders[m].id === body0) {
							levelCollider = _specialColliders[m];
							break;
						}
					}
				} else {
					for(let m = 0; m < _physicsMarbles.length; m++) {
						if(_physicsMarbles[m].entryId === Math.abs(body0)) {
							marble = _physicsMarbles[m];
							break;
						}
					}
				}
				if(body1 > 0) {
					for(let m = 0; m < _specialColliders.length; m++) {
						if(_specialColliders[m].id === body1) {
							levelCollider = _specialColliders[m];
							break;
						}
					}
				} else {
					for(let m = 0; m < _physicsMarbles.length; m++) {
						if(_physicsMarbles[m].entryId === Math.abs(body1)) {
							marble = _physicsMarbles[m];
							break;
						}
					}
				}
				// Skip if either is not found
				if(marble === null || levelCollider === null) continue;

				if(levelCollider.type === "endarea") {
					// Only fire this event once
					if(!marble.finished) {
						marble.finished = true;
						eventEmitter.emit("marbleFinished", marble.entryId);
					}
				}
			}
		}
	}

	let _randomPositionInStartAreas = function() {
		let area = _startAreas[Math.floor(_startAreas.length * Math.random())];

		let transform = new physics.ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(
			new physics.ammo.btVector3(
				Math.random() * area.colliderData.width  - ( area.colliderData.width  * .5 ),
				Math.random() * area.colliderData.height - ( area.colliderData.height * .5 ),
				Math.random() * area.colliderData.depth  - ( area.colliderData.depth  * .5 )
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
		ammoPhysicsWorld,
		eventEmitter,

		createMarble(entryId, size) {
			let physicsMarble = {
				entryId,
				size,
				ammoBody: null,
				finished: false
			};
			// Create physics body
			let sphereShape = physics.defaultMarble;
			if(size !== 0.2) { // TODO: Magic number
				sphereShape = new physics.ammo.btSphereShape(size); // Create new collision shape if the radius does not match
			}
			sphereShape.setMargin( 0.05 );
			let mass = 4 / 3 * Math.PI * (size ** 3);
			let localInertia = new physics.ammo.btVector3( 0, 0, 0 );
			sphereShape.calculateLocalInertia( mass, localInertia );
			let transform = new physics.ammo.btTransform();
			transform.setIdentity();
			transform.setOrigin( _randomPositionInStartAreas() );
			let motionState = new physics.ammo.btDefaultMotionState( transform );
			let bodyInfo = new physics.ammo.btRigidBodyConstructionInfo( mass, motionState, sphereShape, localInertia );
			physicsMarble.ammoBody = new physics.ammo.btRigidBody( bodyInfo );

			// User index for marbles are their negative entryId
			physicsMarble.ammoBody.setUserIndex(-entryId);

			// Add to physics world
			ammoPhysicsWorld.addRigidBody(physicsMarble.ammoBody);
			_physicsMarbles.push(physicsMarble);
		},

		destroyMarble(entryId) {
			for(let i = 0; i < _physicsMarbles.length; i++) {
				if(_physicsMarbles[i].entryId === entryId) {
					ammoPhysicsWorld.removeRigidBody(_physicsMarbles[i].ammoBody);
					_physicsMarbles.splice(i, 1);
					return;
				}
			}
		},

		// Takes a prefabCollider from project data, and its world transform
		createCollider(collider, transform) {
			let newCollider = new LevelCollider(collider.colliderData, collider.functionality, transform, _ids++);

			// For starting areas, we can skip collider creation
			if(collider.functionality === "startarea") {
				_levelColliders.push(newCollider);
				_startAreas.push(newCollider);
				return newCollider;
			}

			let shape;

			switch (collider.colliderData.shape) {
			case "box":
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
			case "mesh": {
				let modelShape = physics.shapes[collider.colliderData.model];
				if(modelShape) {
					if(collider.colliderData.convex) {
						shape = physics.shapes[collider.colliderData.model].convex;
					} else {
						shape = physics.shapes[collider.colliderData.model].concave;
					}
				}
				if(!shape) {
					console.error(`Attempted to use (${collider.colliderData.convex ? "convex" : "concave"}) collider shape from ${collider.colliderData.model}, but it doesn't exist.`);
					return null;
				}
				break;
			}
			default:
				console.error(`Unable to generate collider of unknown type ${collider.colliderData.shape}.`);
				return null;
			}

			let mass = 0;
			let localInertia = new physics.ammo.btVector3(0, 0, 0);

			shape.calculateLocalInertia(mass, localInertia);

			let motionState = new physics.ammo.btDefaultMotionState(transform);
			let rigidBodyInfo = new physics.ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
			newCollider.ammoBody = new physics.ammo.btRigidBody(rigidBodyInfo);
			newCollider.ammoBody.setCollisionFlags(1); // Static by default
			newCollider.ammoBody.setUserIndex(newCollider.id);

			switch (collider.functionality) {
			case "startgate":
				_startGates.push(newCollider);
				newCollider.ammoBody.setCollisionFlags(2); // Kinematic
				break;
			case "endarea":
				_specialColliders.push(newCollider);
				newCollider.ammoBody.setCollisionFlags(5); // Static + no contact reponse
				break;
			case "static":
				break;
			default:
				console.warn(`Created level collider with unknown functionality "${collider.functionality}". Collider is treated as static.`);
				break;
			}

			newCollider.addToWorld();
			_levelColliders.push(newCollider);
			return newCollider;
		},

		destroyCollider(levelCollider) {
			// Erase from _startAreas
			if(levelCollider.type === "startarea") {
				for(let i = 0; i < _startAreas.length; i++) {
					if(_startAreas[i] === levelCollider) {
						_startAreas.splice(i, 1);
						return;
					}
				}
			}
			// Erase from _startGates
			if(levelCollider.type === "startgate") {
				for(let i = 0; i < _startGates.length; i++) {
					if(_startGates[i] === levelCollider) {
						_startGates.splice(i, 1);
						return;
					}
				}
			}
			// Erase from _specialColliders, currently "endarea" only
			if(levelCollider.type === "endarea") {
				for(let i = 0; i < _specialColliders.length; i++) {
					if(_specialColliders[i] === levelCollider) {
						_specialColliders.splice(i, 1);
						return;
					}
				}
			}
			// Erase from _levelColliders, remove from world if needed
			for(let i = 0; i < _levelColliders.length; i++) {
				if(_levelColliders[i] === levelCollider) {
					levelCollider.removeFromWorld();
					_levelColliders.splice(i, 1);
					return;
				}
			}
		},

		// Clears the world of all level colliders
		clearColliders() {
			_startAreas = [];
			_startGates = [];
			_specialColliders = [];
			for(let i = 0; i < _levelColliders.length; i++) {
				_levelColliders[i].removeFromWorld();
			}
			_levelColliders = [];
			_ids = 1;
		},

		// "Opens" the gates by removing them from the world
		openGates() {
			for(let i = 0; i < _startGates.length; i++) {
				_startGates[i].removeFromWorld();
			}
			// To ensure no marbles are stuck sleeping, all are awoken manually
			for(let i = 0; i < _physicsMarbles.length; i++) {
				_physicsMarbles[i].ammoBody.activate();
			}
		},

		closeGates() {
			for(let i = 0; i < _startGates.length; i++) {
				_startGates[i].addToWorld();
			}
		},

		startUpdateInterval() {
			this.stopUpdateInterval();
			_lastPhysicsUpdate = Date.now();

			_updateInterval = setInterval(function() {
				let now = Date.now();
				let deltaTime = (now - _lastPhysicsUpdate) / 1000;
				_lastPhysicsUpdate = now;

				// Update physics with constant _timeStep substeps
				_stepRemainder += deltaTime;
				let ticks = 0;
				while(ticks < _maxTicksPerUpdate && _stepRemainder > _timeStep) {
					_updatePhysics();
					_stepRemainder -= _timeStep;
					ticks++;
				}
				_stepRemainder %= _timeStep; // Skip any remaining ticks if we're too far behind
			}, _timeStep * 1000);
		},

		setTickRate(tickRate) {
			_timeStep = 1 / tickRate;
			if(_updateInterval) {
				this.stopUpdateInterval();
				this.startUpdateInterval();
			}
		},

		stopUpdateInterval() {
			if(_updateInterval !== null) {
				clearInterval(_updateInterval);
				_updateInterval = null;
			}
		},

		setGravity(force) {
			ammoPhysicsWorld.setGravity( new physics.ammo.btVector3( 0, -force, 0 ) ); // Downwards force by default
		},

		// Returns the positions and angular velocities of all marbles in the physics world
		getMarbleTransforms() {
			if(_physicsMarbles.length === 0) return null;

			let transform = new physics.ammo.btTransform();
			let _pos = new Float32Array(_physicsMarbles.length * 3);
			let _rot = new Float32Array(_physicsMarbles.length * 3);

			for (let i = 0; i < _physicsMarbles.length; i++) {
				let ms = _physicsMarbles[i].ammoBody.getMotionState();
				if (ms) {
					ms.getWorldTransform( transform );
					let p = transform.getOrigin();
					let r = _physicsMarbles[i].ammoBody.getAngularVelocity();

					_pos[i * 3 + 0] = p.x();
					_pos[i * 3 + 1] = p.y();
					_pos[i * 3 + 2] = p.z();

					_rot[i * 3 + 0] = r.x();
					_rot[i * 3 + 1] = r.y();
					_rot[i * 3 + 2] = r.z();
				}
			}

			return {
				position: _pos,
				rotation: _rot
			};
		}
	};
}();

module.exports = physicsWorld;
