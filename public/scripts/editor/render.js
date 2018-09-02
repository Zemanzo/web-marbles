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

var scene = new THREE.Scene();

var renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
renderer.setSize( viewport.clientWidth, viewport.clientHeight );
viewport.appendChild( renderer.domElement );

var stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );

/* CONTROLS */

let flyCam = new THREE.webMarbles.cameraFlyControls(
	scene, renderer, {
		pointerLockElement: viewport
	}
);

var ambientLight = new THREE.AmbientLight( 0x746070 );
scene.add( ambientLight );

// Default grid & axes

var axesHelper = new THREE.AxesHelper( 3 );
scene.add( axesHelper );

var gridHelper = new THREE.GridHelper( 20, 20 );
scene.add( gridHelper );
gridHelper.position.y = -.01;

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
	inclination: 0.49,
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

var uniforms = {
	time: { value: 1.0 }
};
var clock = new THREE.Clock();

// Editor groups
for (key in editor.groups){
	editor.groups[key] = new THREE.Group();
	scene.add(editor.groups[key]);
	if (key !== "models") editor.groups[key].visible = false;
}

// Default model
let GLTFLoader = new THREE.GLTFLoader();
GLTFLoader.load(
	// resource URL
	'resources/models/default.gltf',
	// called when the resource is loaded
	function ( gltf ) {

		editor.defaultModel = gltf.scene;

	},
	null,
	function ( error ) {

		console.log( 'An error happened', error );

	}
);

// Default physics material
editor.physicsMaterial = new THREE.MeshStandardMaterial( {
	color: 0x000000,
	emissive: 0xff00ff,
	roughness: 1,
	wireframe:true
} );

// Start area material
editor.startMaterial = new THREE.MeshPhongMaterial( {
	color: 0x000000,
	specular: 0x333333,
	emissive: 0x00cc00,
	shininess: 10,
	opacity: 0.5,
	transparent: true 
} );

// End area material
editor.endMaterial = new THREE.MeshPhongMaterial( {
	color: 0x000000,
	specular: 0x333333,
	emissive: 0xcc0000,
	shininess: 10,
	opacity: 0.5,
	transparent: true 
} );

//

// End area material
editor.gateMaterial = new THREE.MeshPhongMaterial( {
	color: 0x000000,
	specular: 0x333333,
	emissive: 0xcc7700,
	shininess: 10,
	opacity: 0.5,
	transparent: true 
} );

//

function animate() {
	requestAnimationFrame( animate );
	
	// Update controls
	flyCam.update();

	// Update water material
	water.material.uniforms.time.value += 1.0 / 60.0;
	
	// Update stats in top left corner
	stats.update();

	var delta = clock.getDelta();

	uniforms.time.value += delta * 5;
	
	// Render the darn thing
	renderer.render( scene, flyCam.camera );
}

// Stuff that can only be rendered after network data has been received
function renderInit(){ 
	editorLog("Renderer loaded");
	animate();
}