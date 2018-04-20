var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;

var ambientLight = new THREE.AmbientLight( 0x404040 ); // soft white light
scene.add( ambientLight );

var pointLight = new THREE.PointLight();
scene.add( pointLight );
pointLight.position.x = 5;
pointLight.position.y = 5;
pointLight.position.z = 5;

camera.position.x = 5;
camera.position.y = 10;
camera.position.z = 5;

camera.rotation.x = -.6;
camera.rotation.y = .3;
camera.rotation.z = 0;
controls.update();

var marbleMeshes = [];

function animate() {
	requestAnimationFrame( animate );
	
	// Update marble positions
	for (i = 0; i < marbleMeshes.length; i++){
		//marbleMeshes[i].position.x = THREE.Math.lerp(marbleMeshes[i].position.x, net.marblePositions[i*3], net.lastUpdate);
		//marbleMeshes[i].position.y = THREE.Math.lerp(marbleMeshes[i].position.y, net.marblePositions[i*3+2], net.lastUpdate);
		//marbleMeshes[i].position.z = THREE.Math.lerp(marbleMeshes[i].position.z, net.marblePositions[i*3+1], net.lastUpdate);
		marbleMeshes[i].position.x = net.marblePositions[i*3];
		marbleMeshes[i].position.y = net.marblePositions[i*3+2];
		marbleMeshes[i].position.z = net.marblePositions[i*3+1];
	}
	
	net.lastUpdate += 60/net.tickrate/net.ticksToLerp; //FPS assumed to be 60, replace with fps when possible, or better base it on real time.
	
	/* // If there's marbleMeshes missing, add new ones.
	if (marbleMeshes.length*3 < net.marblePositions.length){
		for (i = 0; i < (net.marblePositions.length/3 - marbleMeshes.length); i++){
			
		}
	} */
	
	renderer.render( scene, camera );
}

setTimeout(function(){
	for (i = 0; i < net.marblePositions.length/3; i++){
		spawnMarble(marbleData[i].tags.color, .3);
	}
	
	var cubeGeometry = new THREE.BoxGeometry( 3,3,3 );
	var red = new THREE.MeshStandardMaterial( { color: 0xff0000 } );
	cube = new THREE.Mesh( cubeGeometry, red );	
	scene.add( cube );
	
	// var controls = new THREE.OrbitControls(camera, renderer.domElement);
	
	animate();
},1000);

function spawnMarble(color, size){
	var sphereGeometry = new THREE.SphereGeometry( size );
	var materialColor = new THREE.Color(color);
	console.log(materialColor);
	var sphereMaterial = new THREE.MeshStandardMaterial( { color: materialColor } );
	marbleMeshes.push( new THREE.Mesh( sphereGeometry, sphereMaterial ) );
	scene.add( marbleMeshes[marbleMeshes.length-1] );
}