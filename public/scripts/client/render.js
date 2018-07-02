var settings = {
	graphics: {
		castShadow: {
			marbles: true
		},
		receiveShadow: {
			marbles: false
		}
	}
}

var map;
var viewport = document.getElementById("viewport");
console.log(viewport.clientWidth,viewport.clientHeight);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, viewport.clientWidth / viewport.clientHeight, 0.1, 5000 );

var renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
renderer.setSize( viewport.clientWidth, viewport.clientHeight );
viewport.appendChild( renderer.domElement );

var stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );

/* CONTROLS */

var element = viewport;
var controlsEnabled = false;
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;

var prevTime = performance.now();
var velocity = new THREE.Vector3();
var direction = new THREE.Vector3();
var vertex = new THREE.Vector3();
var color = new THREE.Color();

// Hook pointer lock state change events
document.addEventListener('pointerlockchange', function(event){
	if (document.pointerLockElement === element) {
		controlsEnabled = true;
		controls.enabled = true;
	} else {
		controls.enabled = false;
	}
}, false );

document.addEventListener('pointerlockerror', function(event){}, false);

viewport.addEventListener('mousedown', function (event) {
	element.requestPointerLock();
}, false );

viewport.addEventListener('mouseup', function (event) {
	document.exitPointerLock();
}, false );

var onKeyDown = function(event){
	switch(event.keyCode){
		case 38: // up
		case 87: // w
			moveForward = true;
			break;

		case 37: // left
		case 65: // a
			moveLeft = true;
			break;

		case 40: // down
		case 83: // s
			moveBackward = true;
			break;

		case 39: // right
		case 68: // d
			moveRight = true;
			break;
	}
};

var onKeyUp = function(event){
	switch(event.keyCode){
		case 38: // up
		case 87: // w
			moveForward = false;
			break;

		case 37: // left
		case 65: // a
			moveLeft = false;
			break;

		case 40: // down
		case 83: // s
			moveBackward = false;
			break;

		case 39: // right
		case 68: // d
			moveRight = false;
			break;
	}
};

document.addEventListener('keydown',onKeyDown,false);
document.addEventListener('keyup',onKeyUp,false);

var controls = new THREE.PointerLockControls(camera);
controls.getObject().position.x = -25.3;
controls.getObject().position.y = 55;
controls.getObject().position.z = 19.7;

camera.parent.rotation.x = -.3;
controls.getObject().rotation.z = 0;
scene.add(controls.getObject());

/* var controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true; */

/* CONTROLS END */

var ambientLight = new THREE.AmbientLight( 0x746070 );
scene.add( ambientLight );

var axesHelper = new THREE.AxesHelper( 3 );
scene.add( axesHelper );

// Sun

light = new THREE.DirectionalLight( 0xf5d0d0, 1.5 );
light.castShadow = true;
scene.add( light );

// Water
var waterGeometry = new THREE.PlaneBufferGeometry( 10000, 10000 );

water = new THREE.Water(
	waterGeometry,
	{
		textureWidth: 512,
		textureHeight: 512,
		waterNormals: new THREE.TextureLoader().load( "scripts/lib/threejs/textures/waternormals.jpg", function ( texture ) {
			texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		}),
		alpha: 1.0,
		sunDirection: light.position.clone().normalize(),
		sunColor: 0xffffff,
		waterColor: 0x001e0f,
		distortionScale:  3.7,
		fog: scene.fog !== undefined
	}
);

water.rotation.x = - Math.PI / 2;
water.position.y = -9
water.material.uniforms.size.value = 8;

scene.add( water );

// Skybox

var sky = new THREE.Sky();
sky.scale.setScalar( 10000 );
scene.add( sky );

var uniforms = sky.material.uniforms;

uniforms.turbidity.value = 10;
uniforms.rayleigh.value = 2;
uniforms.luminance.value = 1;
uniforms.mieCoefficient.value = 0.005;
uniforms.mieDirectionalG.value = 0.8;

var parameters = {
	distance: 4000,
	inclination: 0.25,
	azimuth: 0.205
};

var cubeCamera = new THREE.CubeCamera( 1, 20000, 256 );
cubeCamera.renderTarget.texture.minFilter = THREE.LinearMipMapLinearFilter;

function updateSun() {

	var theta = Math.PI * ( parameters.inclination - 0.5 );
	var phi = 2 * Math.PI * ( parameters.azimuth - 0.5 );

	light.position.x = parameters.distance * Math.cos( phi );
	light.position.y = parameters.distance * Math.sin( phi ) * Math.sin( theta );
	light.position.z = parameters.distance * Math.sin( phi ) * Math.cos( theta );

	sky.material.uniforms.sunPosition.value = light.position.copy( light.position );
/* 	light.shadow.camera.position.copy(light.position);
	light.shadow.camera.rotation.copy(light.rotation); */
	light.shadow.mapSize.width = 2048;  // default
	light.shadow.mapSize.height = 2048; // default
	light.shadow.camera.near = 3500;
	light.shadow.camera.far = 4200;
	light.shadow.camera.left = -60;
	light.shadow.camera.right = 60;
	light.shadow.camera.top = 50;
	light.shadow.camera.bottom = -30;
	water.material.uniforms.sunDirection.value.copy( light.position ).normalize();

	cubeCamera.update( renderer, scene );

}

updateSun();

//

/* var shadowHelper = new THREE.CameraHelper( light.shadow.camera );
scene.add( shadowHelper ); */

//

var uniforms = {
	time: { value: 1.0 }
};
var clock = new THREE.Clock();

//

/* var blueLight = new THREE.PointLight(0x0099ff);
scene.add( blueLight );
blueLight.position.x = 5;
blueLight.position.y = 70;
blueLight.position.z = 500;

var orangeLight = new THREE.PointLight(0xff9900);
scene.add( orangeLight );
orangeLight.position.x = 5;
orangeLight.position.y = 70;
orangeLight.position.z = -500; */

/* controls.update(); */

var marbleMeshes = [];

function animate() {
	requestAnimationFrame( animate );
	
	// Update marble positions
	for (i = 0; i < marbleMeshes.length; i++){
		marbleMeshes[i].position.x = THREE.Math.lerp(marbleMeshes[i].position.x || 0, net.marblePositions[i*3+0], net.lastUpdate);
		marbleMeshes[i].position.y = THREE.Math.lerp(marbleMeshes[i].position.y || 0, net.marblePositions[i*3+2], net.lastUpdate);
		marbleMeshes[i].position.z = THREE.Math.lerp(marbleMeshes[i].position.z || 0, net.marblePositions[i*3+1], net.lastUpdate);
		
		
		marbleMeshes[i].quaternion.set(
			net.marbleRotations[i*4+0],
			net.marbleRotations[i*4+1],
			net.marbleRotations[i*4+2],
			net.marbleRotations[i*4+3]
		);
		/* marbleMeshes[i].quaternion.normalize(); */
	}
	
	if (net.lastUpdate < 1.5){
		net.lastUpdate += net.tickrate/60/net.ticksToLerp; //FPS assumed to be 60, replace with fps when possible, or better: base it on real time.
	}
	
	// Update controls
	if ( controlsEnabled === true ) {
		var time = performance.now();
		var delta = ( time - prevTime ) / 1000;

		velocity.x -= velocity.x * 10.0 * delta;
		velocity.y -= velocity.y * 10.0 * delta;
		velocity.z -= velocity.z * 10.0 * delta;

		direction.z = Number( moveForward ) - Number( moveBackward );
		direction.y = Number( moveForward ) - Number( moveBackward );
		direction.x = Number( moveLeft ) - Number( moveRight );
		direction.normalize(); // this ensures consistent movements in all directions

		if ( moveForward || moveBackward ) velocity.z -= direction.z * config.controls.camera.speed * delta;
		if ( moveForward || moveBackward ) velocity.y -= direction.y * config.controls.camera.speed * delta * (-camera.parent.rotation.x * Math.PI*.5);
		if ( moveLeft || moveRight ) velocity.x -= direction.x * config.controls.camera.speed* delta;

		/* console.log(velocity.x * delta, controlsEnabled); */
		controls.getObject().translateX( velocity.x * delta );
		controls.getObject().translateY( velocity.y * delta );
		controls.getObject().translateZ( velocity.z * delta );

		prevTime = time;
	}	

	// Update water material
	water.material.uniforms.time.value += 1.0 / 60.0;
	
	// Update stats in top left corner
	stats.update();

	var delta = clock.getDelta();

	uniforms.time.value += delta * 5;
	
	// Render the darn thing
	renderer.render( scene, camera );
}

var mapMesh;

// Stuff that can only be rendered after network data has been received
function renderInit(){ 
	for (i = 0; i < net.marblePositions.length/3; i++){
		spawnMarble(marbleData[i].tags);
	}
	
	getXMLDoc("/client?dlmap=map2",(response)=>{
		
		var mapName = response.substr(0,response.lastIndexOf("."));
		
		console.log(mapName);
		var manager = new THREE.LoadingManager();
		manager.onProgress = function ( item, loaded, total ) {
			console.log( item, loaded, total );
		};
		
		var loader = new THREE.OBJLoader( manager );
		loader.load( "/resources/"+mapName+"_optimized.obj", function ( object ) {
			object.traverse( function ( child ) {
				if ( child.name.indexOf("Terrain") !== -1) {
					mapMesh = child;
					
					scene.add( mapMesh );
					
					mapMesh.setRotationFromEuler( new THREE.Euler( -Math.PI*.5, 0, Math.PI*.5, 'XYZ' ) );
					
					mapMesh.geometry.computeBoundingBox();
					mapMesh.geometry.center();
					mapMesh.material = createMapMaterial();
					mapMesh.receiveShadow = true;
				}
			} );
		}, ()=>{}, ()=>{} );
	});
	
	animate();
}

function spawnMarble(tags){
	let size = tags.size;
	let color = tags.color;
	let name = tags.name;
	let useFancy = tags.useFancy;

	let fancyMaterial = new THREE.ShaderMaterial( {

		uniforms: uniforms,
		vertexShader: document.getElementById( 'vertexShader' ).textContent,
		fragmentShader: document.getElementById( 'fragmentShader' ).textContent

	} );
	
	let sphereGeometry = new THREE.SphereBufferGeometry(size,9,9);
	/* let sphereGeometry = new THREE.BoxGeometry(.2,.2,.2); */
	let materialColor = new THREE.Color(color);
	let sphereMaterial = new THREE.MeshStandardMaterial({ color: materialColor });
	let sphereMesh = new THREE.Mesh(sphereGeometry, (useFancy ? fancyMaterial : sphereMaterial));
	
	// Shadows
	sphereMesh.castShadow = settings.graphics.castShadow.marbles;
	sphereMesh.receiveShadow = settings.graphics.receiveShadow.marbles;
	
	// Add name sprite
	let nameSprite = makeTextSprite(name);
	
	// Add to collection
	marbleMeshes.push(sphereMesh);
	
	// Add objects to the scene
	scene.add(marbleMeshes[marbleMeshes.length-1]);
	scene.add(nameSprite);
	marbleMeshes[marbleMeshes.length-1].add(nameSprite);
		
	// Add UI stuff
	var listEntry = document.getElementById("marbleListTemplate").cloneNode(true);
	listEntry.removeAttribute("id");
	listEntry.getElementsByClassName("name")[0].innerText = tags.name;
	listEntry.getElementsByClassName("color")[0].style.background = tags.color;
	listEntry.getElementsByClassName("id")[0].innerText = marbleMeshes.length;
	
	document.getElementById("marbleList").appendChild(listEntry);
	document.getElementById("entries").innerHTML = marbleMeshes.length;
}

var textures = {
	dirt: { url: 'scripts/lib/threejs/textures/dirt.jpg' },
	dirtNormal: { url: 'scripts/lib/threejs/textures/dirt_n.jpg' },
	grass: { url: 'scripts/lib/threejs/textures/grasslight-big.jpg' },
	grassNormal: { url: 'scripts/lib/threejs/textures/grasslight-big-nm.jpg' },
	mask: { url: 'scripts/lib/threejs/textures/mask_alpha.png' }
};

function getTexture( name ) {
	var texture = textures[ name ].texture;
	if ( ! texture ) {
		texture = textures[ name ].texture = new THREE.TextureLoader().load( textures[ name ].url );
		texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	}
	return texture;
}

function createMapMaterial(){
	var mtl;
	
	// MATERIAL
	mtl = new THREE.StandardNodeMaterial();
	mtl.roughness = new THREE.FloatNode( .9 );
	mtl.metalness = new THREE.FloatNode( 0 );
	
	function createUv(scale,offset){
		
		var uvOffset = new THREE.FloatNode( offset || 0 );
		var uvScale = new THREE.FloatNode( scale || 1 );
		
		var uvNode = new THREE.UVNode();
		var offsetNode = new THREE.OperatorNode(
			uvOffset,
			uvNode,
			THREE.OperatorNode.ADD
		);
		var scaleNode = new THREE.OperatorNode(
			offsetNode,
			uvScale,
			THREE.OperatorNode.MUL
		);
		
		return scaleNode;
	}
	
	var grass = new THREE.TextureNode( getTexture( "grass" ), createUv(35) );
	var dirt = new THREE.TextureNode( getTexture( "dirt" ), createUv(35) );
	var mask = new THREE.TextureNode( getTexture( "mask" ), createUv() );
	var maskAlphaChannel = new THREE.SwitchNode( mask, 'w' );
	var blend = new THREE.Math3Node(
		grass,
		dirt,
		maskAlphaChannel,
		THREE.Math3Node.MIX
	);
	mtl.color = blend;
	mtl.normal = new THREE.TextureNode( getTexture( "dirtNormal" ), createUv(35) );

	var normalScale = new THREE.FloatNode( 1 );
	var normalMask = new THREE.OperatorNode(
		new THREE.TextureNode( getTexture( "mask" ), createUv() ),
		normalScale,
		THREE.OperatorNode.MUL
	);
	
	mtl.normalScale = normalMask;
	
	// build shader
	mtl.build();
	
	// set material
	return mtl;
}

//

function makeTextSprite( message )
{
	var parameters = {};
	
	var fontface = "Courier New";
	var fontsize = 24;
		
	var canvas = document.createElement('canvas');
	var width = canvas.width = 256;
	var height = canvas.height = 64;
	var context = canvas.getContext('2d');
	context.font = "Bold " + fontsize + "px " + fontface;
	context.textAlign = "center"; 
    
	// get size data (height depends only on font size)
	var metrics = context.measureText( message );
	var textWidth = metrics.width;
	
	// text color
	context.fillStyle = "#ffffff";

	context.fillText(message, 128, fontsize);
	
	// canvas contents will be used for a texture
	var texture = new THREE.Texture(canvas) 
	texture.needsUpdate = true;
	var spriteMaterial = new THREE.SpriteMaterial({map: texture});
	var sprite = new THREE.Sprite( spriteMaterial );
	sprite.scale.set(4,1,1.0);
	return sprite;	
}
