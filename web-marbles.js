const config = require('./config');
const colors = require('colors');

console.log(" Webbased Marble Racing".cyan);
console.log("   by "+"Z".green+"emanz"+"o".green);
console.log(" "+(new Date()).toLocaleString('nl').cyan);

const CANNON = require('cannon');
var world = new CANNON.World();
world.gravity.set(0,0,-50);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 5;
world.defaultContactMaterial.contactEquationStiffness = 5e6;
world.defaultContactMaterial.contactEquationRelaxation = 10;
world.quatNormalizeFast = true; // Since we have many bodies and they don't move very much, we can use the less accurate quaternion normalization
world.quatNormalizeSkip = 4; // ...and we do not have to normalize every step.

// ground plane
var groundShape = new CANNON.Plane(new CANNON.Vec3(0,0,1));
var groundBody = new CANNON.Body({ mass: 0 });
groundBody.addShape(groundShape);
groundBody.position.set(0,0,-1000);
world.add(groundBody);

// Load obj as heightfield
const OBJHeightfield = require('./src/model-import/obj-heightfield');
var mapObj = new OBJHeightfield("map2.obj");

// Create the heightfield
var hfShape = new CANNON.Heightfield(mapObj.heightArray, {
	elementSize: mapObj.elementSize
});
var hfBody = new CANNON.Body({ mass: 0 });
hfBody.addShape(hfShape);
hfBody.position.set(-25, -25, -10);
world.add(hfBody);

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
		if (req.query.marble){
			var sphereShape = new CANNON.Sphere(0.3);
			var sphereBody = new CANNON.Body({ mass: 1 });
			sphereBody.addShape(sphereShape);
			sphereBody.linearDamping = 0.2;
			sphereBody.position.set(18 + (Math.random()*4 - 2), 18 + (Math.random()*4 - 2), 20);
			sphereBody.position.vadd(hfBody.position, sphereBody.position);
			world.addBody(sphereBody);
			res.send("ok");
		} else if (req.query.clear){
			for (i = world.bodies.length - 1; i >= 0; --i){
				if (world.bodies[i].id != 0 && world.bodies[i].id != 1)
					world.remove(world.bodies[i]);
			}
			res.send("ok");
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
io.on('connection', function(socket){
	console.log('A user connected!'.green);
	
	// Request physics
	socket.on('request physics', (timestamp, callback) => {
		pos = new Float32Array(world.bodies.length*3);
		let i = 0;
		for (key in world.bodies){
			pos[i+0] = world.bodies[key].position.x;
			pos[i+1] = world.bodies[key].position.y;
			pos[i+2] = world.bodies[key].position.z;
			i+=3;
		}
		callback(pos.buffer);
	});
});

io.on('disconnect', function(socket){
	console.log('A user disconnected...'.red);
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