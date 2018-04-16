const config = require('./config');
const colors = require('colors');

console.log(" Webbased Marble Racing".cyan);
console.log("   by "+"Z".green+"emanz"+"o".green);
console.log(" "+(new Date()).toLocaleString('nl').cyan);

const CANNON = require('cannon');

var size = .1;
var interval, physStepInterval;

// Spheres
var world = new CANNON.World();

world.gravity.set(0,0,-50);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 5;

world.defaultContactMaterial.contactEquationStiffness = 5e6;
world.defaultContactMaterial.contactEquationRelaxation = 10;

/* // Since we have many bodies and they don't move very much, we can use the less accurate quaternion normalization
world.quatNormalizeFast = true;
world.quatNormalizeSkip = 4; // ...and we do not have to normalize every step. */

// ground plane
var groundShape = new CANNON.Plane(new CANNON.Vec3(0,0,1));
var groundBody = new CANNON.Body({ mass: 0 });
groundBody.addShape(groundShape);
groundBody.position.set(0,0,-1000);
world.add(groundBody);

/* var obj = new OBJFile(fs.readFileSync("resources/mapObj.obj","utf-8"));
var heightMap = obj.parse();
var zVertices = Array.from(heightMap.models[0].vertices, x => x.x);
var distanceBetween = Math.abs(heightMap.models[0].vertices[1].x - heightMap.models[0].vertices[0].x); */

// Load obj as heightfield
const OBJHeightfield = require('./src/model-import/obj-heightfield');
var mapObj = new OBJHeightfield("map2.obj");

/* console.log(mapObj.heightArray); */

// Create the heightfield
var hfShape = new CANNON.Heightfield(mapObj.heightArray, {
	elementSize: mapObj.elementSize
});
var hfBody = new CANNON.Body({ mass: 0 });
hfBody.addShape(hfShape);
hfBody.position.set(-25, -25, -50);
world.add(hfBody);

// Add spheres
for(var i=0; i<15 - 1; i++){
	for (var j = 0; j < 15 - 1; j++) {
		if(i===0 || i >= 15-2 || j===0 || j >= 15-2)
			continue;
		var sphereShape = new CANNON.Sphere(0.3);
		var sphereBody = new CANNON.Body({ mass: 1 });
		sphereBody.addShape(sphereShape);
		sphereBody.position.set(0.25 + i, 0.25 + j, 30);
		sphereBody.position.vadd(hfBody.position, sphereBody.position);
		world.addBody(sphereBody);
	}
}

/* var bodies = [];
var i = 0;
interval = setInterval(function(){
	// Sphere
	i++;
	var sphereShape = new CANNON.Sphere(size);
	var b1 = new CANNON.Body({ mass: 5 });
	b1.addShape(sphereShape);
	b1.position.set(Math.random(),Math.random(),30);
	world.add(b1);
	bodies.push(b1);
},500);

setTimeout(function(){
	clearInterval(interval)
},10050); */

// Express connections
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
if (config.express.cache) app.disable('view cache');
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

const util = require('util');
app.get("/client", function (req, res) {
	res.render('client');
});

/* Express listener */
var server = http.listen(config.express.port, function () {
  var port = server.address().port;
  console.log(currentHourString()+"EXPRESS: Listening at port %s".cyan, port);
});

io.on('connection', function(socket){
  console.log('A user connected!'.green);
});
io.on('disconnecting', function(socket){
  console.log('A user disconnected...'.red);
});

physStepInterval = setInterval(function(){
	world.step(1/config.physics.steps);
},1000/config.physics.steps);

physSocketEmitInterval = setInterval(function(){
	let pos = [];
	for (key in world.bodies){
		pos.push(world.bodies[key].position);
	}
	io.emit('physics step', {positions: pos});
},1000/config.network.tickrate);

function pad(num,size) {
    var s = "000000000" + num;
    return s.substr(s.length-size);
}

function currentHourString() {
	var date = new Date();
	return "["+pad(date.getHours(),2)+":"+pad(date.getMinutes(),2)+"] ";
}