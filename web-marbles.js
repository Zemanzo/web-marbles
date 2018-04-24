const config = require('./config');
const colors = require('colors');

console.log(" Webbased Marble Racing".cyan);
console.log("   by "+"Z".green+"emanz"+"o".green);
console.log(" "+(new Date()).toLocaleString('nl').cyan);

/* set up physics world */
const CANNON = require('cannon');
var world = new CANNON.World();
world.gravity.set(0,0,-50);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 5;
world.defaultContactMaterial.contactEquationStiffness = 5e6;
world.defaultContactMaterial.contactEquationRelaxation = 10;
world.quatNormalizeFast = true; // Since we have many bodies and they don't move very much, we can use the less accurate quaternion normalization
world.quatNormalizeSkip = 4; // ...and we do not have to normalize every step.

/* list of marble physics bodies */
var marbles = [];

/* ground plane */
var groundShape = new CANNON.Plane(new CANNON.Vec3(0,0,1));
var groundBody = new CANNON.Body({ mass: 0 });
groundBody.addShape(groundShape);
groundBody.position.set(0,0,-150);
world.add(groundBody);

/* Load obj as heightfield */
const OBJHeightfield = require('./src/model-import/obj-heightfield');
var mapObj = new OBJHeightfield("map2v2.obj"); // X forward, Z up. Write normals & Objects as OBJ Objects.

/* Create the heightfield */
var slipperyContact = new CANNON.Material();
slipperyContact.friction = 0.001;
var hfShape = new CANNON.Heightfield(mapObj.heightArray, {
	elementSize: mapObj.elementSize
});
var hfBody = new CANNON.Body({ 
	mass: 0,
    material: slipperyContact
});
hfBody.addShape(hfShape);
hfBody.position.set(0, 0, 0);
world.add(hfBody);

/* Express connections */
var express = require('express');
var mustacheExpress = require('mustache-express');
var compression = require('compression');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
app.use(compression());
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
	let str = "";
	str += JSON.stringify(world.time) + "<br/>";
	str += JSON.stringify(world.stepnumber) + "<br/>";
	for (key in world.bodies){
		str += JSON.stringify(world.bodies[key].position) + "<br/>";
	}
	res.send(mapObj.heightArray);
});

app.get("/client", function (req, res) {
	if (Object.keys(req.query).length !== 0 && req.query.constructor === Object){
		if (req.query.marble){ // Add new marble
			for(i=0;i<100;i++){
				var basicContact = new CANNON.Material();
				basicContact.friction = 0.3;
				var boxShape = new CANNON.Box(new CANNON.Vec3(0.2,0.2,0.2));
				var sphereShape = new CANNON.Sphere(req.query.size || 0.2);
				var sphereBody = new CANNON.Body({
					mass: 5,
					material: basicContact
				});
				sphereBody.addShape(boxShape);
				/* sphereBody.linearDamping = 0.2; */
				sphereBody.position.set(
					Math.random()*24,
					Math.random()*24,
					1
				);
				sphereBody.position.vadd(hfBody.position, sphereBody.position);
				
				// Add optional paramaters
				sphereBody.tags = {};
				sphereBody.tags.color = "#"+req.query.color || "#00ff00";
				sphereBody.tags.size = req.query.size || 0.2;
				marbles.push(sphereBody);
				
				world.addBody(sphereBody);
				
				io.sockets.emit("new marble", sphereBody.tags);
			}
			res.send("ok");
		} else if (req.query.clear){ // Clear all marbles
			for (i = marbles.length - 1; i >= 0; --i){
				world.remove(marbles[i]);
			}
			marbles = [];
			res.send("ok");
		} else if (req.query.dlmap){ // Send map
			res.send(JSON.stringify(mapObj.parsed));
		}  else if (req.query.interpreted){ // Send interpreted map
			res.send(JSON.stringify(mapObj.vertices));
		} else {
			res.send("???");
		}
	} else {
		res.render("client");
	}
});

/* Express listener */
var server = http.listen(config.express.port, function () {
  var port = server.address().port;
  console.log(currentHourString()+"EXPRESS: Listening at port %s".cyan, port);
});

/* Sockets */
let pos;
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
			rot = new Float32Array(marbles.length*4);
			for (i = 0; i < marbles.length; i++){
				pos[i*3+0] = marbles[i].position.x;
				pos[i*3+1] = marbles[i].position.y;
				pos[i*3+2] = marbles[i].position.z;
				
				rot[i*4+0] = marbles[i].quaternion.x;
				rot[i*4+1] = marbles[i].quaternion.y;
				rot[i*4+2] = marbles[i].quaternion.z;
				rot[i*4+3] = marbles[i].quaternion.w;
			}
			callback({pos:pos.buffer,rot:rot.buffer});
		} else {
			callback(0); // Still need to send the callback so the client doesn't lock up waiting for packets.
		}
	});
});

io.on("disconnect", function(socket){
	console.log("A user disconnected...".red);
});

/* Physics interval */
physStepInterval = setInterval(function(){
	world.step(1/config.physics.steps);
},1000/config.physics.steps);

/* Other */
function pad(num,size) {
    var s = "000000000" + num;
    return s.substr(s.length-size);
}

function currentHourString() {
	var date = new Date();
	return "["+pad(date.getHours(),2)+":"+pad(date.getMinutes(),2)+"] ";
}

function concatBuffers(buffer1, buffer2) {
	var tmp = new Float32Array(buffer1.byteLength + buffer2.byteLength);
	tmp.set(new Float32Array(buffer1), 0);
	tmp.set(new Float32Array(buffer2), buffer1.byteLength);
	return tmp.buffer;
};