import * as THREE from "three";
import "three/examples/js/objects/Water";
import "three/examples/js/objects/Sky";
import "three/examples/js/loaders/LoaderSupport";
import "three/examples/js/loaders/OBJLoader";
import "three/examples/js/loaders/GLTFLoader";
import * as Stats from "stats-js";
import { CameraFlyControls } from "../render/cameraFlyControls";
import { editorLog } from "./log";

let viewport, camera, renderer, stats, controls,
	scene = new THREE.Scene();

function initializeRenderer() {
	viewport = document.getElementById("viewport");
	camera = new THREE.PerspectiveCamera(75, viewport.clientWidth / viewport.clientHeight, 0.1, 5000);

	renderer = new THREE.WebGLRenderer();
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
	renderer.setSize(viewport.clientWidth, viewport.clientHeight);
	viewport.appendChild(renderer.domElement);

	stats = new Stats();
	stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
	document.body.appendChild(stats.dom);

	updateSun();

	controls = new CameraFlyControls(scene, renderer, {
		pointerLockElement: viewport,
		camera,
		defaultPosition: {
			x: -2.3,
			y: 12,
			z: 19.7
		},
		defaultRotation: {
			x: -.3,
			y: 0,
			z: 0
		}
	});

	// Fix camera
	document.getElementById("fixCam").addEventListener("click", function() {
		controls.stop();
		controls.toDefaults();
	}, false);

	editorLog("Renderer loaded");

	animate();
}

let ambientLight = new THREE.AmbientLight( 0x746070 );
scene.add( ambientLight );

// Default grid & axes

let axesHelper = new THREE.AxesHelper( 3 );
scene.add( axesHelper );

let gridHelper = new THREE.GridHelper( 20, 20 );
scene.add( gridHelper );
gridHelper.position.y = -.01;

// Sun

let light = new THREE.DirectionalLight( 0xf5d0d0, 1.5 );
light.castShadow = true;
scene.add( light );

// Water
let waterGeometry = new THREE.PlaneBufferGeometry( 10000, 10000 );

let water = new THREE.Water(
	waterGeometry,
	{
		textureWidth: 512,
		textureHeight: 512,
		waterNormals: new THREE.TextureLoader().load( "scripts/lib/threejs/textures/waternormals.jpg", function( texture ) {
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
water.position.y = -9;
water.material.uniforms.size.value = 8;

scene.add( water );

// Skybox

let sky = new THREE.Sky();
sky.scale.setScalar( 10000 );
scene.add( sky );

let uniforms = sky.material.uniforms;

uniforms.turbidity.value = 10;
uniforms.rayleigh.value = 2;
uniforms.luminance.value = 1;
uniforms.mieCoefficient.value = 0.005;
uniforms.mieDirectionalG.value = 0.8;

let sunParameters = {
	distance: 4000,
	inclination: 0.49,
	azimuth: 0.205
};

let cubeCamera = new THREE.CubeCamera( 1, 20000, 256 );
cubeCamera.renderTarget.texture.minFilter = THREE.LinearMipMapLinearFilter;

function updateSun() {

	let theta = Math.PI * ( sunParameters.inclination - 0.5 );
	let phi = 2 * Math.PI * ( sunParameters.azimuth - 0.5 );

	light.position.x = sunParameters.distance * Math.cos( phi );
	light.position.y = sunParameters.distance * Math.sin( phi ) * Math.sin( theta );
	light.position.z = sunParameters.distance * Math.sin( phi ) * Math.cos( theta );

	sky.material.uniforms.sunPosition.value = light.position.copy( light.position );
	// light.shadow.camera.position.copy(light.position);
	// light.shadow.camera.rotation.copy(light.rotation);
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

//

uniforms = {
	time: { value: 1.0 }
};
let clock = new THREE.Clock();

// Default model
let defaultModel;
let GLTFLoader = new THREE.GLTFLoader();
GLTFLoader.load(
	// resource URL
	"resources/models/default.gltf",

	// called when the resource is loaded
	function(gltf) {
		defaultModel = gltf.scene;
	},

	null,

	function(error) {
		console.error("An error occurred when loading the model", error );
	}
);

//

function animate() {
	requestAnimationFrame( animate );

	// Update controls
	controls.update();

	// Update water material
	water.material.uniforms.time.value += 1.0 / 60.0;

	// Update stats in top left corner
	stats.update();

	let delta = clock.getDelta();

	uniforms.time.value += delta * 5;

	// Render the darn thing
	renderer.render(scene, camera);
}

export {
	scene,
	initializeRenderer,
	defaultModel,
	updateSun,
	sunParameters,
	water
};
