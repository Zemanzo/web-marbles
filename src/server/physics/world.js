module.exports = function(Ammo, config) {
	// Physics letiables
	let collisionConfiguration,
		dispatcher,
		broadphase,
		solver,
		physicsWorld;

	// Physics configuration
	collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
	dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
	broadphase = new Ammo.btDbvtBroadphase();
	solver = new Ammo.btSequentialImpulseConstraintSolver();
	physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
	physicsWorld.setGravity( new Ammo.btVector3( 0, config.physics.gravity, 0 ) );

	function createTerrainShape() {
		// Up axis = 0 for X, 1 for Y, 2 for Z. Normally 1 = Y is used.
		let upAxis = 1;

		// hdt, height data type. "PHY_FLOAT" is used. Possible values are "PHY_FLOAT", "PHY_UCHAR", "PHY_SHORT"
		let hdt = "PHY_FLOAT";

		// Set this to your needs (inverts the triangles)
		let flipQuadEdges = false;

		// Creates height data buffer in Ammo heap
		let ammoHeightData = null;
		ammoHeightData = Ammo._malloc( 4 * mapObj.width * mapObj.depth );

		// Copy the javascript height data array to the Ammo one.
		let p = 0,
			p2 = 0;
		for ( let j = 0; j < mapObj.depth; j ++ ) {
			for ( let i = 0; i < mapObj.width; i ++ ) {
				// write 32-bit float data to memory
				Ammo.HEAPF32[ammoHeightData + p2 >> 2] = mapObj.zArray[ p ];
				p++;

				// 4 bytes/float
				p2 += 4;
			}
		}

		// Creates the heightfield physics shape
		let heightFieldShape = new Ammo.btHeightfieldTerrainShape(
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
		heightFieldShape.setLocalScaling( new Ammo.btVector3( scaleX, 1, scaleZ ) );

		heightFieldShape.setMargin( 0.05 );

		return heightFieldShape;
	}

	/* Load obj as heightfield */
	let OBJHeightfield = require("../model-import/obj-heightfield");
	let fs = require("fs");
	let file = fs.readFileSync( config.marbles.resources + config.marbles.mapRotation[0].name, "utf-8" );
	let mapObj = new OBJHeightfield(file); // X forward, Z up. Write normals & Objects as OBJ Objects.
	mapObj.centerOrigin("xyz");

	// Collision flags
	// BODYFLAG_STATIC_OBJECT: 1,
	// BODYFLAG_KINEMATIC_OBJECT: 2,
	// BODYFLAG_NORESPONSE_OBJECT: 4,

	/* Create the terrain body */
	let groundShape = createTerrainShape( mapObj );
	let groundTransform = new Ammo.btTransform();
	groundTransform.setIdentity();
	// Shifts the terrain, since bullet re-centers it on its bounding box.
	//groundTransform.setOrigin( new Ammo.btVector3( 0, ( mapObj.maxHeight + mapObj.minHeight ) / 2, 0 ) );
	let groundMass = 0;
	let groundLocalInertia = new Ammo.btVector3( 0, 0, 0 );
	let groundMotionState = new Ammo.btDefaultMotionState( groundTransform );
	let groundBody = new Ammo.btRigidBody( new Ammo.btRigidBodyConstructionInfo( groundMass, groundMotionState, groundShape, groundLocalInertia ) );
	groundBody.setCollisionFlags(1); // Set static
	physicsWorld.addRigidBody( groundBody );

	/* Add start gate */
	let gateSize = config.marbles.mapRotation[0].startGate.size;
	let gateShape = new Ammo.btBoxShape(new Ammo.btVector3( gateSize[0], gateSize[1], gateSize[2] ));

	let gateTransform = new Ammo.btTransform();
	gateTransform.setIdentity();
	let gatePosition = config.marbles.mapRotation[0].startGate.position;
	gateTransform.setOrigin( new Ammo.btVector3( gatePosition.x, gatePosition.z, gatePosition.y ) );

	let gateMass = 0;
	let gatelocalInertia = new Ammo.btVector3(0, 0, 0);
	gateShape.calculateLocalInertia(gateMass, gatelocalInertia);

	let gateMotionState = new Ammo.btDefaultMotionState(gateTransform);
	let gateRbInfo = new Ammo.btRigidBodyConstructionInfo(gateMass, gateMotionState, gateShape, gatelocalInertia);
	let gateBody = new Ammo.btRigidBody(gateRbInfo);
	gateBody.setCollisionFlags(2); // Set kinematic
	/* console.log(gateBody.getCollisionFlags()); */

	physicsWorld.addRigidBody(gateBody);

	let lastPhysicsUpdate = Date.now();
	/* Physics interval */
	let physStepInterval = setInterval(function() {
		let now = Date.now();
		let deltaTime = (now - lastPhysicsUpdate) / 1000;
		lastPhysicsUpdate = now;
		updatePhysics(deltaTime);
	}, 1000 / config.physics.steps);

	function updatePhysics( deltaTime ) {
		physicsWorld.stepSimulation( deltaTime, 10 );
	}

	function stopUpdateInterval() {
		clearInterval(physStepInterval);
	}

	return {
		physics: physicsWorld,
		map: mapObj,
		gateBody,
		stopUpdateInterval,

		openGate() {
			let origin = this.gateBody.getWorldTransform().getOrigin();
			origin.setZ(0);
			this.gateBody.activate();
		},

		closeGate() {
			let origin = this.gateBody.getWorldTransform().getOrigin();
			origin.setZ(config.marbles.mapRotation[0].startGate.position.y);
			this.gateBody.activate();
		}
	};
};
