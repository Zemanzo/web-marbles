var CANNON = require('cannon');

var size = 1;
var interval, steppies;

// Spheres
var world = new CANNON.World();

world.gravity.set(0,0,-50);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 5;

world.defaultContactMaterial.contactEquationStiffness = 5e6;
world.defaultContactMaterial.contactEquationRelaxation = 10;

// Since we have many bodies and they don't move very much, we can use the less accurate quaternion normalization
world.quatNormalizeFast = true;
world.quatNormalizeSkip = 4; // ...and we do not have to normalize every step.

// ground plane
var groundShape = new CANNON.Plane(new CANNON.Vec3(0,0,1));
var groundBody = new CANNON.Body({ mass: 0 });
groundBody.addShape(groundShape);
groundBody.position.set(0,0,0);
world.add(groundBody);

// plane -x
var planeShapeXmin = new CANNON.Plane();
var planeXmin = new CANNON.Body({ mass: 0 });
planeXmin.addShape(planeShapeXmin);
planeXmin.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0),Math.PI/2);
planeXmin.position.set(-5,0,0);
world.add(planeXmin);

// Plane +x
var planeShapeXmax = new CANNON.Plane();
var planeXmax = new CANNON.Body({ mass: 0 });
planeXmax.addShape(planeShapeXmax);
planeXmax.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0),-Math.PI/2);
planeXmax.position.set(5,0,0);
world.add(planeXmax);

// Plane -y
var planeShapeYmin = new CANNON.Plane();
var planeYmin = new CANNON.Body({ mass: 0 });
planeYmin.addShape(planeShapeYmin);
planeYmin.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
planeYmin.position.set(0,-5,0);
world.add(planeYmin);

// Plane +y
var planeShapeYmax = new CANNON.Plane();
var planeYmax = new CANNON.Body({ mass: 0 });
planeYmax.addShape(planeShapeYmax);
planeYmax.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),Math.PI/2);
planeYmax.position.set(0,5,0);
world.add(planeYmax);

var bodies = [];
var i = 0;
interval = setInterval(function(){
	// Sphere
	i++;
	var sphereShape = new CANNON.Sphere(size);
	var b1 = new CANNON.Body({ mass: 5 });
	b1.addShape(sphereShape);
	b1.position.set(2*size*Math.sin(i),2*size*Math.cos(i),7*2*size);
	world.add(b1);
	bodies.push(b1);
},100);

setTimeout(function(){
	clearInterval(interval)
},10050);

steppies = setInterval(function(){
	world.step(1/20);
},1000/20);

// Express connections
var express = require('express');
var compression = require('compression');
var app = express();
app.use(compression());
app.use(express.static(__dirname + '/public'));

var bodyParser = require('body-parser');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

app.get("/", function (req, res) {
	let str = "";
	str += JSON.stringify(world.time) + "<br/>";
	str += JSON.stringify(world.stepnumber) + "<br/>";
	for (key in world.bodies){
		str += JSON.stringify(world.bodies[key].position) + "<br/>";
	}
	res.send(str);
});

var server = app.listen(3004, function () {
  var port = server.address().port;
  console.log("EXPRESS: Listening at port %s", port);
});
