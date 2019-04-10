const physics = require("./manager");

// Constructor for starting area, starting gate, and finish line
function MapCollider(colliderData, functionality, transform, id) {
	this.colliderData = colliderData;
	this.type = functionality;
	this.id = id; // Used for identifying colliders in callbacks
	this.transform = transform;
	this.ammoBody = null; // Unused by starting area
	this.isInWorld = false; // Flag to track whether it's added to the world
}

MapCollider.prototype.addToWorld = function() {
	if(!this.isInWorld && this.ammoBody) {
		this.isInWorld = true;
		physics.world.physicsWorld.addRigidBody(this.ammoBody);
	}
};

MapCollider.prototype.removeFromWorld = function() {
	if(this.isInWorld) {
		this.isInWorld = false;
		physics.world.physicsWorld.removeRigidBody(this.ammoBody);
	}
};


module.exports = function() {
	let _collisionConfiguration,
		_dispatcher,
		_broadphase,
		_solver,
		physicsWorld,
		_mapColliders = [], // Collection of all map colliders
		_startAreas = [], // Quicklist of start areas
		_startGates = [], // Quicklist of starting gates
		_specialColliders = [], // Quicklist of colliders that cause collision callbacks
		_marbles = [], // List of (active) Marble object references
		_ids = 1, // Starts at 1 to prevent conflicts with marble entryId 0
		_timeStep = 1 / 120, // Default, configurable
		_stepRemainder = 0,
		_maxTicksPerUpdate = 10,
		_updateInterval = null,
		_lastPhysicsUpdate = null;

	// Physics configuration
	_collisionConfiguration = new physics.ammo.btDefaultCollisionConfiguration();
	_dispatcher = new physics.ammo.btCollisionDispatcher(_collisionConfiguration );
	_broadphase = new physics.ammo.btDbvtBroadphase();
	_solver = new physics.ammo.btSequentialImpulseConstraintSolver();
	physicsWorld = new physics.ammo.btDiscreteDynamicsWorld(_dispatcher, _broadphase, _solver, _collisionConfiguration );
	physicsWorld.setGravity( new physics.ammo.btVector3( 0, -10, 0 ) );

	function _updatePhysics() {
		// Steps have to be constant WITHOUT bullet substepping
		physicsWorld.stepSimulation( _timeStep, 0 );

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
				let mapCollider = null;

				let body0 = manifold.getBody0().getUserIndex();
				let body1 = manifold.getBody1().getUserIndex();

				// Find the marble and mapCollider for this collision
				if(body0 > 0) {
					for(let m = 0; m < _specialColliders.length; m++) {
						if(_specialColliders[m].id === body0) {
							mapCollider = _specialColliders[m];
							break;
						}
					}
				} else {
					for(let m = 0; m < _marbles.length; m++) {
						if(_marbles[m].entryId === Math.abs(body0)) {
							marble = _marbles[m];
							break;
						}
					}
				}
				if(body1 > 0) {
					for(let m = 0; m < _specialColliders.length; m++) {
						if(_specialColliders[m].id === body1) {
							mapCollider = _specialColliders[m];
							break;
						}
					}
				} else {
					for(let m = 0; m < _marbles.length; m++) {
						if(_marbles[m].entryId === Math.abs(body1)) {
							marble = _marbles[m];
							break;
						}
					}
				}
				// Skip if either is not found
				if(marble === null || mapCollider === null) continue;

				if(mapCollider.type === "endarea") {
					if(marble.onMarbleFinish) marble.onMarbleFinish();
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
		updateInterval: null,
		physicsWorld,

		createMarble(marble) {
			// Create physics body
			let sphereShape = physics.shapes.defaultMarble;
			if(0.2 !== marble.size) { // TODO: Magic number
				sphereShape = new physics.ammo.btSphereShape(marble.size); // Create new collision shape if the radius does not match
			}
			sphereShape.setMargin( 0.05 );
			let mass = 4 / 3 * Math.PI * (marble.size ** 3);
			let localInertia = new physics.ammo.btVector3( 0, 0, 0 );
			sphereShape.calculateLocalInertia( mass, localInertia );
			let transform = new physics.ammo.btTransform();
			transform.setIdentity();
			transform.setOrigin( _randomPositionInStartAreas() );
			let motionState = new physics.ammo.btDefaultMotionState( transform );
			let bodyInfo = new physics.ammo.btRigidBodyConstructionInfo( mass, motionState, sphereShape, localInertia );
			marble.ammoBody = new physics.ammo.btRigidBody( bodyInfo );

			// User index for marbles are their negative entryId
			marble.ammoBody.setUserIndex(-marble.entryId);

			// Add to physics world
			physicsWorld.addRigidBody(marble.ammoBody);
			_marbles.push(marble);
		},

		destroyMarble(marble) {
			physicsWorld.removeRigidBody(marble.ammoBody);
			for(let i = 0; i < _marbles.length; i++) {
				if(_marbles[i] === marble) {
					_marbles.splice(i, 1);
					return;
				}
			}
		},

		// Takes a prefabCollider from project data, and its world transform
		createCollider(collider, transform) {
			let newCollider = new MapCollider(collider.colliderData, collider.functionality, transform, _ids++);

			// For starting areas, we can skip collider creation
			if(collider.functionality === "startarea") {
				_mapColliders.push(newCollider);
				_startAreas.push(newCollider);
				return newCollider;
			}

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
				console.warn(`Created map collider with unknown functionality "${collider.functionality}". Collider is treated as static.`);
				break;
			}

			newCollider.addToWorld();
			_mapColliders.push(newCollider);
			return newCollider;
		},

		destroyCollider(mapCollider) {
			// Erase from _startAreas
			if(mapCollider.type === "startarea") {
				for(let i = 0; i < _startAreas.length; i++) {
					if(_startAreas[i] === mapCollider) {
						_startAreas.splice(i, 1);
						return;
					}
				}
			}
			// Erase from _startGates
			if(mapCollider.type === "startgate") {
				for(let i = 0; i < _startGates.length; i++) {
					if(_startGates[i] === mapCollider) {
						_startGates.splice(i, 1);
						return;
					}
				}
			}
			// Erase from _specialColliders, currently "endarea" only
			if(mapCollider.type === "endarea") {
				for(let i = 0; i < _specialColliders.length; i++) {
					if(_specialColliders[i] === mapCollider) {
						_specialColliders.splice(i, 1);
						return;
					}
				}
			}
			// Erase from _mapColliders, remove from world if needed
			for(let i = 0; i < _mapColliders.length; i++) {
				if(_mapColliders[i] === mapCollider) {
					mapCollider.removeFromWorld();
					_mapColliders.splice(i, 1);
					return;
				}
			}
		},

		// Clears the world of all map colliders
		clearColliders() {
			_startAreas = [];
			_startGates = [];
			_specialColliders = [];
			for(let i = 0; i < _mapColliders.length; i++) {
				_mapColliders[i].removeFromWorld();
			}
			_mapColliders = [];
			_ids = 1;
		},

		openGates() {
			for(let i = 0; i < _startGates.length; i++) {
				_startGates[i].removeFromWorld();
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
			physicsWorld.setGravity( new physics.ammo.btVector3( 0, force, 0 ) );
		}
	};
}();

// Physics will run by default
module.exports.startUpdateInterval();
