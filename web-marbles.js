var config = require('./config');
var colors = require('colors');

console.log(" Webbased Marble Racing".cyan);
console.log("   by "+"Z".green+"emanz"+"o".green);
console.log(" "+(new Date()).toLocaleString('nl').cyan);

/* set up physics world */
var Ammo = require('ammo-node');

// Physics variables
var collisionConfiguration,
	dispatcher,
	broadphase,
	solver,
	physicsWorld,
	terrainBody;
var dynamicObjects = [];
var transformAux1 = new Ammo.btTransform();
var transformAux2 = new Ammo.btTransform();

// Physics configuration
collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
broadphase = new Ammo.btDbvtBroadphase();
solver = new Ammo.btSequentialImpulseConstraintSolver();
physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
physicsWorld.setGravity( new Ammo.btVector3( 0, config.physics.gravity, 0 ) );

/* list of marble physics bodies */
var marbles = [];

function createTerrainShape() {
	// Up axis = 0 for X, 1 for Y, 2 for Z. Normally 1 = Y is used.
	var upAxis = 1;

	// hdt, height data type. "PHY_FLOAT" is used. Possible values are "PHY_FLOAT", "PHY_UCHAR", "PHY_SHORT"
	var hdt = "PHY_FLOAT";

	// Set this to your needs (inverts the triangles)
	var flipQuadEdges = false;

	// Creates height data buffer in Ammo heap
    var ammoHeightData = null;
	ammoHeightData = Ammo._malloc( 4 * mapObj.width * mapObj.depth );

	// Copy the javascript height data array to the Ammo one.
	var p = 0;
	var p2 = 0;
	for ( var j = 0; j < mapObj.depth; j ++ ) {
		for ( var i = 0; i < mapObj.width; i ++ ) {

			// write 32-bit float data to memory
			Ammo.HEAPF32[ammoHeightData + p2 >> 2] = mapObj.zArray[ p ];
			p++;
			
			// 4 bytes/float
			p2 += 4;
		}
	}

	// Creates the heightfield physics shape
	var heightFieldShape = new Ammo.btHeightfieldTerrainShape(
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
	var scaleX = mapObj.gridDistance;
	var scaleZ = mapObj.gridDistance;
	heightFieldShape.setLocalScaling( new Ammo.btVector3( scaleX, 1, scaleZ ) );

	heightFieldShape.setMargin( 0.05 );

	return heightFieldShape;

}

/* Load obj as heightfield */
var OBJHeightfield = require('./src/model-import/obj-heightfield');
var mapObj = new OBJHeightfield(config.marbles.mapRotation[0].name); // X forward, Z up. Write normals & Objects as OBJ Objects.
mapObj.centerOrigin("xyz");



// Collision flags
  // BODYFLAG_STATIC_OBJECT: 1,
  // BODYFLAG_KINEMATIC_OBJECT: 2,
  // BODYFLAG_NORESPONSE_OBJECT: 4,


/* Create the terrain body */
groundShape = createTerrainShape( mapObj );
var groundTransform = new Ammo.btTransform();
groundTransform.setIdentity();
// Shifts the terrain, since bullet re-centers it on its bounding box.
//groundTransform.setOrigin( new Ammo.btVector3( 0, ( mapObj.maxHeight + mapObj.minHeight ) / 2, 0 ) );
var groundMass = 0;
var groundLocalInertia = new Ammo.btVector3( 0, 0, 0 );
var groundMotionState = new Ammo.btDefaultMotionState( groundTransform );
var groundBody = new Ammo.btRigidBody( new Ammo.btRigidBodyConstructionInfo( groundMass, groundMotionState, groundShape, groundLocalInertia ) );
groundBody.setCollisionFlags(1); // Set static
physicsWorld.addRigidBody( groundBody );

/* Add start gate */
var gateSize = config.marbles.mapRotation[0].startGate.size;
var gateShape = new Ammo.btBoxShape(new Ammo.btVector3( gateSize[0], gateSize[1], gateSize[2] ));

var gateTransform = new Ammo.btTransform();
gateTransform.setIdentity();
var gatePosition = config.marbles.mapRotation[0].startGate.position;
gateTransform.setOrigin( new Ammo.btVector3( gatePosition.x,gatePosition.z,gatePosition.y ) );

var gateMass = 0;
var gatelocalInertia = new Ammo.btVector3(0, 0, 0);
gateShape.calculateLocalInertia(gateMass, gatelocalInertia);

var gateMotionState = new Ammo.btDefaultMotionState(gateTransform);
var gateRbInfo = new Ammo.btRigidBodyConstructionInfo(gateMass, gateMotionState, gateShape, gatelocalInertia);
var gateBody = new Ammo.btRigidBody(gateRbInfo);
gateBody.setCollisionFlags(2); // Set kinematic
console.log(gateBody.getCollisionFlags());

physicsWorld.addRigidBody(gateBody);

/* Express connections */
var express = require('express');
var mustacheExpress = require('mustache-express');
var compression = require('compression');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
app.use(compression({
  filter: function () { return true; }
}));
app.use(express.static(__dirname + '/public'));
app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
if (!config.express.cache) app.disable('view cache');
app.set('views', __dirname + '/templates');

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
	extended: true
})); 

app.get("/", function (req, res) {
	res.render("index");
});

var enteredJWTs = [];
app.get("/client", function (req, res) {
	if (Object.keys(req.query).length !== 0 && req.query.constructor === Object){
		
		if (req.query.marble){ // Add new marble
			jwt.verify(req.query.jwt, config.twitch.pem, (error, decoded) => {
				if (error){
					res.send("JWT invalid");
				} else if (!enteredJWTs.includes(req.query.jwt)){
					spawnMarble(
						req.query.jwt,
						req.query.size,
						req.query.color,
						req.query.name
					);
					res.send("ok");
				} else {
					res.send("Already entered");
				}
			});
			
		} else if (req.query.bot){ // Add new marble
			spawnMarble(
				false,
				.2,
				"000000",
				"nightbot"
			);
			res.send("ok");
			
		} else if (req.query.clear){ // Clear all marbles
		
			// Set starting gate to original position
			var origin = gateBody.getWorldTransform().getOrigin();
			origin.setZ(config.marbles.mapRotation[0].startGate.position.z);
			gateBody.activate();
			
			// Remove marble physics bodies
			for (i = marbles.length - 1; i >= 0; --i){
				physicsWorld.removeRigidBody(marbles[i].ammoBody);
			}
			
			// Clear the jwt array
			enteredJWTs = [];
			
			// Clear the marble array
			marbles = [];
			
			// Send clients game restart so they can clean up on their side
			io.sockets.emit("clear", true);
			res.send("ok");
			
		} else if (req.query.start){ // Start the game, move the startGate out of the way
			var origin = gateBody.getWorldTransform().getOrigin();
			origin.setZ(0);
			gateBody.activate();
			res.send("ok");
			
		} else if (req.query.dlmap){ // Send map id
			res.send(config.marbles.mapRotation[0].name);
			
		} else {
			res.send("You probably can't do that. Nice try tho gg.");
		}
	} else {
		res.render("client",{
			clientId: config.twitch.clientId,
			redirectUri: config.twitch.root + config.twitch.redirectUri
		});
	}
});

//

function spawnMarble(jwt,radius,color,name){
	if (jwt){
		// Add jwt to list of people that entered
		enteredJWTs.push(jwt);
	}
	
	// Create physics body
	var size = (Math.random() > .95 ? (.3 + Math.random() * .7) : false) || radius || 0.2;
	var sphereShape =  new Ammo.btSphereShape(size);
	sphereShape.setMargin( 0.05 );
	var mass = (size || 0.5) * 5;
	var localInertia = new Ammo.btVector3( 0, 0, 0 );
	sphereShape.calculateLocalInertia( mass, localInertia );
	var transform = new Ammo.btTransform();
	transform.setIdentity();
	transform.setOrigin( new Ammo.btVector3( Math.random()*3-20, mapObj.maxZ + 1, Math.random()*3+1 ) );
	var motionState = new Ammo.btDefaultMotionState( transform );
	var bodyInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, sphereShape, localInertia );
	var ammoBody = new Ammo.btRigidBody( bodyInfo );
	
	// Add metadata
	var body = {
		ammoBody: ammoBody,
		tags: {}
	}
	body.tags.color = "#"+color || "#00ff00";
	body.tags.size = size;
	body.tags.useFancy = (Math.random() > .99);
	body.tags.name = name || "Nightbot";
	
	// Add to physics world
	marbles.push(body);
	physicsWorld.addRigidBody( body.ammoBody );
	
	// Send client info on new marble
	io.sockets.emit("new marble", body.tags);
}

//

/* Twitch */
var request = require('request');
var jwt = require('jsonwebtoken');
var jwkToPem = require('jwk-to-pem');

// Get the public JSON Web Key from twitch to use for JWT reponse verification
request.get({url:"https://id.twitch.tv/oauth2/keys", json:true}, function (error, response, body) {
	if (!error && response.statusCode === 200) {
		config.twitch.jwk = body.keys[0];
		config.twitch.pem = jwkToPem(config.twitch.jwk);
	}
})

function verifyAndParseJWT(jwt,callback){
	jwt.verify(jwt, config.twitch.pem, callback(error, decoded));
}

// Redirect URI, users land here after Twitch authorization
app.get("/"+config.twitch.redirectUri, function (req, res) {
	/* request.post(
		'https://id.twitch.tv/oauth2/token',
		{ 
			json: {
				client_id: config.twitch.clientId,
				client_secret: config.twitch.clientSecret,
				code: req.query.code,
				grant_type: "authorization_code",
				redirect_uri: config.twitch.root + config.twitch.redirectUri
			}
		},
		function (error, response, body) {
			if (!error && response.statusCode === 200) {
				jwt.verify(body.id_token, config.twitch.pem, function (error, decoded) {
					console.log(decoded);
					res.render("account",{
						name: decoded.preferred_username,
						jwt: JSON.stringify(body)
					});
				});
			} else if (response.statusCode === 200 || response.statusCode === 400){
				console.log(error, body, response)
				res.send("rip");
			}
		}
	); */
	res.render("account");
});

//

app.get("/debug", function (req, res) {
	res.render("ammo",{
		map: JSON.stringify(mapObj.parsed)
	});
});

/* Express listener */
var server = http.listen(config.express.port, function () {
  var port = server.address().port;
  console.log(currentHourString()+"EXPRESS: Listening at port %s".cyan, port);
});

/* Sockets */
let pos, rot;
io.on("connection", function(socket){
	console.log("A user connected!".green);
	
	var initialMarbleData = [];
	for (i = 0; i < marbles.length; i++){
		initialMarbleData.push({
			pos: marbles[i].position,
			id: marbles[i].id,
			tags: marbles[i].tags
		});
	}
	/* console.log(initialMarbleData); */
	socket.emit("initial data", initialMarbleData);
	
	// Request physics
	socket.on("request physics", (timestamp, callback) => {
		if (marbles.length !== 0){
			pos = new Float32Array(marbles.length*3);
			rot = new Float64Array(marbles.length*4);
			for (i = 0; i < marbles.length; i++){
				var ms = marbles[i].ammoBody.getMotionState();
				if (ms){
					ms.getWorldTransform( transformAux1 );
					var p = transformAux1.getOrigin();
					var q = transformAux1.getRotation();
					
					pos[i*3+0] = p.x();
					pos[i*3+1] = p.z();
					pos[i*3+2] = p.y();
					
					rot[i*4+0] = q.x();
					rot[i*4+1] = q.z();
					rot[i*4+2] = q.y();
					rot[i*4+3] = q.w();
				}
			}
			
			var ms = gateBody.getMotionState();
			var swOrig, swPos;
			if (ms){
				ms.getWorldTransform( transformAux2 );
				swOrig = transformAux2.getOrigin();
				swPos = [swOrig.x(),swOrig.y(),swOrig.z()];
				console.log(swOrig,swPos);
			}
			
			callback({pos:pos.buffer,rot:rot.buffer,startGate:swPos});
		} else {
			callback(0); // Still need to send the callback so the client doesn't lock up waiting for packets.
		}
	});
});

io.on("disconnected", function(socket){
	console.log("A user disconnected...".red);
});

var lastPhysicsUpdate = Date.now();
/* Physics interval */
physStepInterval = setInterval(function(){
    var now = Date.now();
    var deltaTime = (now - lastPhysicsUpdate)/1000;
    lastPhysicsUpdate = now;
	updatePhysics(deltaTime)
},1000/config.physics.steps);

function updatePhysics( deltaTime ) {

	physicsWorld.stepSimulation( deltaTime, 10 );

	// Update objects
	for ( var i = 0, il = dynamicObjects.length; i < il; i++ ) {
		var objThree = dynamicObjects[ i ];
		var objPhys = objThree.userData.physicsBody;
		var ms = objPhys.getMotionState();
		if ( ms ) {

			ms.getWorldTransform( transformAux1 );
			var p = transformAux1.getOrigin();
			var q = transformAux1.getRotation();
			objThree.position.set( p.x(), p.y(), p.z() );
			objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );

		}
	}
}

/* Other */
function pad(num,size) {
    var s = "000000000" + num;
    return s.substr(s.length-size);
}

function currentHourString() {
	var date = new Date();
	return "["+pad(date.getHours(),2)+":"+pad(date.getMinutes(),2)+"] ";
}