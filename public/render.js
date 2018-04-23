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

var blueLight = new THREE.PointLight(0x0099ff);
scene.add( blueLight );
blueLight.position.x = 5;
blueLight.position.y = 5;
blueLight.position.z = 5;

var orangeLight = new THREE.PointLight(0xff9900);
scene.add( orangeLight );
orangeLight.position.x = 5;
orangeLight.position.y = 5;
orangeLight.position.z = -80;

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
		marbleMeshes[i].position.x = THREE.Math.lerp(marbleMeshes[i].position.x || 0, net.marblePositions[i*3], net.lastUpdate);
		marbleMeshes[i].position.y = THREE.Math.lerp(marbleMeshes[i].position.y || 0, net.marblePositions[i*3+2], net.lastUpdate);
		marbleMeshes[i].position.z = THREE.Math.lerp(marbleMeshes[i].position.z || 0, net.marblePositions[i*3+1], net.lastUpdate);
		//marbleMeshes[i].position.x = net.marblePositions[i*3];
		//marbleMeshes[i].position.y = net.marblePositions[i*3+2];
		//marbleMeshes[i].position.z = net.marblePositions[i*3+1];
	}
	
	if (net.lastUpdate < 1.5){
		net.lastUpdate += net.tickrate/60/net.ticksToLerp; //FPS assumed to be 60, replace with fps when possible, or better base it on real time.
	}
	
	/* // If there's marbleMeshes missing, add new ones.
	if (marbleMeshes.length*3 < net.marblePositions.length){
		for (i = 0; i < (net.marblePositions.length/3 - marbleMeshes.length); i++){
			
		}
	} */
	
	renderer.render( scene, camera );
}

setTimeout(function(){
	for (i = 0; i < net.marblePositions.length/3; i++){
		spawnMarble(marbleData[i].tags.color, marbleData[i].tags.size);
	}
	
	var cubeGeometry = new THREE.BoxGeometry(.3, .3, .3);
	var red = new THREE.MeshStandardMaterial({ color: 0xff0000 });
	cube = new THREE.Mesh(cubeGeometry, red);	
	scene.add( cube );
	
	// var controls = new THREE.OrbitControls(camera, renderer.domElement);
	
	getXMLDoc("/client?interpreted=true",(response)=>{
		/* console.log(JSON.parse(response));
		var heightbox = new THREE.PlaneGeometry(.2, .2);
		var pinky = new THREE.MeshStandardMaterial({ color: 0xff00ff });
		for (var value of JSON.parse(response)){
			var boxmesh = new THREE.Mesh(heightbox, pinky);	
			scene.add( boxmesh );
			boxmesh.rotation.x = -Math.PI*.5;
			boxmesh.position.x = value.x;
			boxmesh.position.y = value.z;
			boxmesh.position.z = value.y;
		} */
	});
	
	animate();
},1000);

function spawnMarble(color, size){
	let sphereGeometry = new THREE.SphereGeometry(size);
	let materialColor = new THREE.Color(color);
	/* console.log(materialColor); */
	let sphereMaterial = new THREE.MeshStandardMaterial({ color: materialColor });
	let sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
	marbleMeshes.push(sphereMesh);
	scene.add(marbleMeshes[marbleMeshes.length-1]);
}

function spawnMap(parsedObj){
	let model = parsedObj.models[0];
	let geometry = new THREE.BufferGeometry();
	let vertices = vertexObjectArrayToFloat32Array(model.vertices);
	let normals = vertexObjectArrayToFloat32Array(model.vertexNormals);
	let indices = [];
	for (let index of model.faces){
		indices.push(
			index.vertices[0].vertexIndex,
			index.vertices[1].vertexIndex,
			index.vertices[2].vertexIndex
		);
	}
	
	/* console.log(indices.length,vertices.length,normals); */
	
	geometry.setIndex(indices);
	geometry.addAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
	geometry.addAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
	geometry.scale(-1,1,-1); // Faces are flipped so flip them back by negative scaling
	geometry.computeVertexNormals(true); // Recompute vertex normals
	
    var solidMaterial = new THREE.MeshStandardMaterial( { color: 0x111111, roughness: .9 } );
    var wireframeMaterial = new THREE.MeshLambertMaterial( { color: 0xff00ff, wireframe:true } );
	
	mesh = new THREE.Mesh( geometry, wireframeMaterial );
	scene.add( mesh );
	mesh.position.y = 0;
	/* undermesh = new THREE.Mesh( geometry, solidMaterial );
	scene.add( undermesh );
	undermesh.position.y = -.05; */
}

function vertexObjectArrayToFloat32Array(array){ // Also converts z up to y up
	
	// indexing expects vertices starting at 1, so we add a 0,0,0 vertex at the start to solve this
	let f32array = new Float32Array(array.length*3 + 3);
	let i = 1;
	
	for (let vertex of array){
		f32array[i*3+0] = vertex.x;
		f32array[i*3+1] = vertex.z;
		f32array[i*3+2] = vertex.y;
		i++;
	}
	return f32array;
}

function vertexObjectArrayToArray(array){ // Also converts z up to y up
	let newArray = [];
	for (let vertex of array){
		newArray.push(
			vertex.x,
			vertex.z,
			vertex.y
		);
	}
	return newArray;
}