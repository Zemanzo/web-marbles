var config = require("./config");
var colors = require("colors");

console.log(" Webbased Marble Racing".cyan);
console.log("   by "+"Z".green+"emanz"+"o".green);
console.log(" "+(new Date()).toLocaleString('nl').cyan);

/* Database */
let sqlite3 = require('better-sqlite3');
let db = new sqlite3(config.database.path);

db.prepare("CREATE TABLE IF NOT EXISTS users ( id INTEGER UNIQUE, username TEXT, discriminator TEXT, avatar TEXT, access_token TEXT, refresh_token TEXT, refresh_last INTEGER, refresh_expire INTEGER, scope TEXT, stat_rounds_entered INTEGER, stat_marbles_entered INTEGER, PRIMARY KEY('id'))").run();

// Based on https://stackoverflow.com/questions/3144711/find-the-time-left-in-a-settimeout/36389263#36389263
var timeoutMap = {};
function setTrackableTimeout(callback, delay) { // Modify setTimeout
	var id = setTimeout(callback, delay); // Run the original, and store the id

	timeoutMap[id] = [Date.now(), delay]; // Store the start date and delay

	return id; // Return the id
};

function getTimeout(id) { // The actual getTimeLeft function
	var m = timeoutMap[id]; // Find the timeout in map

	// If there was no timeout with that id, return NaN, otherwise, return the time left clamped to 0
	return m ? Math.max(m[1] + m[0] - Date.now(), 0) : NaN;
}

/* Set up physics world */
var Ammo = require('ammo-node');

// Physics variables
var collisionConfiguration,
	dispatcher,
	broadphase,
	solver,
	physicsWorld,
	terrainBody;
var transformAux1 = new Ammo.btTransform();
var transformAux2 = new Ammo.btTransform();

// Physics configuration
collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
broadphase = new Ammo.btDbvtBroadphase();
solver = new Ammo.btSequentialImpulseConstraintSolver();
physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
physicsWorld.setGravity( new Ammo.btVector3( 0, config.physics.gravity, 0 ) );

// List of marble physics bodies
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
/* console.log(gateBody.getCollisionFlags()); */

physicsWorld.addRigidBody(gateBody);

/* Game logic */
var game = {
	logic: {
		state: "started" // "enter", "started"
	},
	startDelay: 2825, // length in ms of audio
	entered: []
};

game.addMarble = function(id,name,color){
	// Only allow marbles during entering phase
	if (game.logic.state === "enter"){
		
		// Make sure this person hasn't entered in this round yet
		if (!game.entered.includes(id)){
			game.entered.push(id);
			spawnMarble(name,color);
		}
	}
}

game.end = function(){
	if (game.logic.state === "started"){
		game.logic.state = "enter";
		console.log("Current state: ".magenta,game.logic.state);
	
		// Set starting gate to original position
		var origin = gateBody.getWorldTransform().getOrigin();
		/* console.log(origin.z()); */
		origin.setZ(config.marbles.mapRotation[0].startGate.position.y);
		/* console.log(origin.z()); */
		gateBody.activate();
		
		// Remove marble physics bodies
		for (i = marbles.length - 1; i >= 0; --i){
			physicsWorld.removeRigidBody(marbles[i].ammoBody);
		}
		
		// Clear the array of people that entered
		game.entered = [];
		
		// Clear the marble array
		marbles = [];
		
		// Send clients game restart so they can clean up on their side
		io.sockets.emit("clear", true);
		
		// Start the game after the entering period is over
		clearTimeout(game.enterTimeout);
		game.enterTimeout = setTrackableTimeout(
			game.start,
			config.marbles.rules.enterPeriod * 1000
		);
		
		/* setInterval(
			function(){
				console.log(getTimeout(game.enterTimeout));
			},1000
		); */
		
		return true;
	} else {
		return false;
	}
}

game.start = function(){
	if (game.logic.state === "enter"){
		game.logic.state = "started";
		console.log("Current state: ".magenta,game.logic.state);
		io.sockets.emit("start", true);
		
		setTimeout(function(){
			// Lower starting gate
			var origin = gateBody.getWorldTransform().getOrigin();
			origin.setZ(0);
			gateBody.activate();
			
			// Add bot marble to ensure physics not freezing
			spawnMarble("Nightbot","#000000");
		},game.startDelay);
		
		clearTimeout(game.gameplayTimeout);
		game.gameplayTimeout = setTrackableTimeout(
			game.end,
			config.marbles.rules.maxRoundLength * 1000
		);
		
		return true;
	} else {
		return false;
	}
}

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

app.get("/client", function (req, res) {
	if (Object.keys(req.query).length !== 0 && req.query.constructor === Object){
		
		// Add bot marble
		if ( 
			req.query.bot &&
			game.logic.state === "enter"
		){
			spawnMarble("nightbot","#000000");
			res.send("ok");
		}
		
		// Clear all marbles
		else if (req.query.clear){ 
			
			res.send(
				game.end() ? "ok" : "already waiting for start"
			);
			
		}
		
		// Start the game, move the startGate out of the way
		else if (req.query.start){ 
			
			res.send(
				game.start() ? "ok" : "already started"
			);
			
		}
		
		// Send over the gamestate when a new connection is made
		else if (req.query.gamestate){ 
			
			res.send(
				{
					gameState: game.logic.state,
					enterPeriod: config.marbles.rules.enterPeriod,
					maxRoundLength: config.marbles.rules.maxRoundLength,
					timeToEnter: getTimeout(game.enterTimeout),
					mapId: config.marbles.mapRotation[0].name
				}
			);
			
		}
		
		// Send map id -- DEPRECATED
		else if (req.query.dlmap){
			res.send(config.marbles.mapRotation[0].name);
			
		}
		
		// Got nothing for ya.
		else {
			res.send("You probably can't do that. Nice try tho gg.");
		}
	} else {
		res.render("client");
	}
});

// Discord integration

let discord, discordClient;
discord = require("discord.js");
botClient = new discord.Client();

botClient.on("ready", function() {
	console.log(currentHourString()+"DISCORD: "+"Discord bot is ready!".green);
});

botClient.on("message", function(message) {
	if (message.channel.id == config.discord.gameplayChannelId){
		if (message.author.id != config.discord.webhookId){ // Make sure we're not listening to our own blabber
		
			io.sockets.emit("chat message", {
				username: message.author.username,
				discriminator: message.author.discriminator,
				content: message.content
			});
			
			chat.testMessage(message.content, message.author.id, message.author.username);
		
			if (message.content === "!doot") {
				message.reply("🎺");
			}
		}
	}
});

botClient.login(config.discord.botToken);

//

let chat = {};
chat.testMessage = function(messageContent,id,username){
	if (messageContent.startsWith("!marble")) {
				
		let colorRegEx = /#(?:[0-9a-fA-F]{3}){1,2}$/g
		let match = messageContent.match(colorRegEx);
		
		let color = (match === null ? undefined : match[0]);
		
		game.addMarble(
			id,
			username,
			color
		);
	}
}

//

function spawnMarble(name,color){
	
	// Create physics body
	var size = (Math.random() > .95 ? (.3 + Math.random() * .7) : false) || 0.2;
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
	body.tags.color = color || randomHexColor();
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

let request = require('request');
app.get("/chat", function (req, res) {
	
	if (req.query){
		
		if (req.query.code){
			let options = {
				url: "https://discordapp.com/api/oauth2/token",
				form: {
					client_id: config.discord.clientId,
					client_secret: config.discord.clientSecret,
					grant_type: "authorization_code",
					code: req.query.code,
					redirect_uri: config.discord.redirectUriRoot+"chat",
					scope: config.discord.scope
				}
			};
			
			let callback = function (error, response, token_body) {
				if (!error && response.statusCode === 200) {
					
					token_body = JSON.parse(token_body);
					
					request.get({
						url: "https://discordapp.com/api/users/@me",
						headers: {
							"Authorization": "Bearer "+token_body.access_token
						}
					},function (error, response, user_body){
						if (!error && response.statusCode === 200) {
							
							user_body = JSON.parse(user_body);
							
							let exists = db.prepare("SELECT id FROM users WHERE id = ?").get(user_body.id);
							if (exists){
								db.prepare(
									"UPDATE OR REPLACE users SET access_token = ?, refresh_token = ?, refresh_last = ?, refresh_expire = ?, scope = ? WHERE id = ?"
								).run([
									token_body.access_token,
									token_body.refresh_token,
									now(),
									token_body.expires_in,
									config.discord.scope,
									user_body.id
								]);
							} else {
								db.prepare(
									"INSERT OR ABORT INTO users (id, username, discriminator, avatar, access_token, refresh_token, refresh_last, refresh_expire, scope) VALUES (?,?,?,?,?,?,?,?,?)"
								).run([
									user_body.id,
									user_body.username,
									user_body.discriminator,
									user_body.avatar,
									token_body.access_token,
									token_body.refresh_token,
									now(),
									token_body.expires_in,
									config.discord.scope
								]);
							}
							
							res.render("chat",{
								invitelink: config.discord.inviteLink,
								user_data: JSON.stringify({
									id: user_body.id,
									username: user_body.username,
									access_token: token_body.access_token,
									expires_in: token_body.expires_in,
									discriminator: user_body.discriminator,
									avatar: user_body.avatar,
								}),
								success: true
							});
							
						} else {
							console.log(error,response.statusCode);
						}
					});
					
				} else {
					
					res.render("chat",{
						invitelink: config.discord.inviteLink,
						success: false
					});
					
				}
			};
			
			request.post(options,callback);
			return;
		}
		
	}
	res.render("chat",{
		invitelink: config.discord.inviteLink,
		client_id: config.discord.clientId,
		redirect_uri: encodeURIComponent(config.discord.redirectUriRoot+"chat"),
		scope: encodeURIComponent(config.discord.scope) // separated with spaces
	});
	
});

app.get("/editor", function (req, res) {
	if (config.editor.enabled)
		res.render("editor",{});
	else 
		res.render("editorDisabled",{});
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
				
			var gorig = gateBody.getWorldTransform().getOrigin();
			var swPos = [gorig.x(),gorig.y(),gorig.z()];
			/* console.log(swPos); */
			
			callback({pos:pos.buffer,rot:rot.buffer,startGate:swPos});
		} else {
			callback(0); // Still need to send the callback so the client doesn't lock up waiting for packets.
		}
	});
	
	// Discord chat
	const chatWebhook = new discord.WebhookClient(config.discord.webhookId,config.discord.webhookToken)
	socket.on("chat incoming", (obj) => {
		
		let row = db.prepare("SELECT access_token, username, avatar, discriminator FROM users WHERE id = ?").get(obj.id);
		if (row && row.access_token == obj.access_token){
			
			chat.testMessage(obj.message, obj.id, row.username);
			
			chatWebhook.send(obj.message,{
				username: row.username,
				avatarURL: "https://cdn.discordapp.com/avatars/"+obj.id+"/"+row.avatar+".png",
				disableEveryone: true,
			});
			
			io.sockets.emit("chat message", {
				username: row.username,
				discriminator: row.discriminator,
				content: obj.message
			});
		} else {
			console.log("User ID and access token mismatch!",row);
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

function randomHexColor(){
	return '#'+(Math.random()*0xffffff|0).toString(16);
}

function now(){
	return (new Date()).getTime();
}


// Start the game loop
game.end();