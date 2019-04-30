import * as THREE from "three";
import "three/examples/js/objects/Water";
import "three/examples/js/objects/Sky";
import "three/examples/js/loaders/LoaderSupport";
import "three/examples/js/loaders/GLTFLoader";
import * as Stats from "stats-js";
import * as config from "../config";
import { CameraFlyControls } from "./cameras";
import domReady from "../dom-ready";

// From https://github.com/mrdoob/three.js/blob/master/examples/js/WebGL.js
const _isWebGLAvailable = function() {
	try {
		const canvas = document.createElement("canvas");
		return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
	} catch (error) {
		return false;
	}
};

let _mainScene = null,
	_renderer = null,
	_marbles = {
		meshes: []
	},
	animationUpdateFunctions = [],
	_viewport = null, // DOM viewport element
	_axesHelper = null,
	_stats = null,
	_controls = {
		fallback: null,
		active: null
	};

if (!_isWebGLAvailable()) {
	domReady.then(() => {
		_viewport = document.getElementById("viewport");
		let warning = document.createElement("div");
		warning.id = "warning";
		warning.innerHTML = `
			Hmmm... Unfortunately, your ${window.WebGLRenderingContext ? "graphics card" : "browser"} does not seem to support
			<a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>. Please come back
			when you found something more compatible!
		`;
		_viewport.className += "warning";
		_viewport.appendChild(warning);
	});
} else {
	_mainScene = new THREE.Scene();
	_renderer = new THREE.WebGLRenderer();

	_axesHelper = new THREE.AxesHelper(3);
	_mainScene.add(_axesHelper);

	// Renderer defaults
	_renderer.shadowMap.enabled = true;
	_renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

	// Stats
	_stats = new Stats();
	_stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
	_stats.dom.style.position = "absolute";
	_stats.dom.style.left = "unset";
	_stats.dom.style.right = "0px";

	// Controls
	_controls.active = _controls.fallback = new CameraFlyControls(_mainScene, _renderer);

	// Once the DOM is ready, append the renderer DOM element & stats and start animating.
	domReady.then(() => {
		_viewport = document.getElementById("viewport");

		_onCanvasResize();

		_viewport.addEventListener("resize", _onCanvasResize, false);

		_viewport.appendChild(_renderer.domElement);
		_viewport.appendChild(_stats.dom);

		animate();
	});
}

function _onCanvasResize() {
	_controls.active.camera.aspect = _viewport.clientWidth / _viewport.clientHeight;
	_controls.active.camera.updateProjectionMatrix();
	_renderer.setSize(_viewport.clientWidth, _viewport.clientHeight);
}

function MarbleMap(data) { // "Map" is taken
	this.data = data;

	this.scene = new THREE.Scene();

	// Ambient light
	let ambientLight = new THREE.AmbientLight(0x746070);
	this.scene.add(ambientLight);

	// Sky + Sunlight
	let skyParameters = {};
	if (data && data.world) {
		skyParameters.inclination = data.world.sunInclination;
	}

	this.sky = new Sky(this.scene, skyParameters);
	this.scene.add(this.sky.skyObject);

	// Water
	let waterLevel = 0;
	if (data && data.world) {
		waterLevel = data.world.waterLevel;
	}

	this.water = new Water(this.sky.sunLight, waterLevel);
	this.scene.add(this.water.waterObject);
	this.sky.water = this.water;

	// Update sky
	this.sky.update();
}

MarbleMap.prototype.addToWorld = function() {
	_mainScene.add(this.scene);
	console.log(_mainScene);
};

MarbleMap.prototype.removeFromWorld = function() {
	_mainScene.remove(this.scene);
};

// Water
function Water(sunLight, waterLevel, fog = false) {
	let geometry = this.geometry = new THREE.PlaneBufferGeometry(10000, 10000);

	this.waterObject = new THREE.Water(
		geometry,
		{
			textureWidth: 512,
			textureHeight: 512,
			waterNormals: new THREE.TextureLoader().load("resources/textures/waternormals.jpg", function(texture) {
				texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
			}),
			alpha: 1.0,
			sunDirection: sunLight.position.clone().normalize(),
			sunColor: 0xffffff,
			waterColor: 0x001e0f,
			distortionScale: 3.7,
			fog
		}
	);

	this.waterObject.rotation.x = -Math.PI / 2;
	this.waterObject.position.y = waterLevel;
	this.waterObject.material.uniforms.size.value = 8;

	animationUpdateFunctions.push(() => {
		this.update.call(this);
	});
}

Water.prototype.update = function() {
	this.waterObject.material.uniforms.time.value += 1.0 / 60.0;
};

// Skybox
function Sky(scene, parameters = {}) {
	this.scene = scene;
	this.skyObject = new THREE.Sky();
	this.skyObject.scale.setScalar(10000);

	// Light
	let sunLight = this.sunLight = new THREE.DirectionalLight(0xf5d0d0, 1.5);
	sunLight.castShadow = true;

	this.skyObject.add(sunLight);

	let uniforms = this.skyObject.material.uniforms;
	uniforms.turbidity.value = 10;
	uniforms.rayleigh.value = 2;
	uniforms.luminance.value = 1;
	uniforms.mieCoefficient.value = 0.005;
	uniforms.mieDirectionalG.value = 0.8;

	this.parameters = parameters;
	this.parameters.distance 	= !isNaN(parameters.distance)	 ? parameters.distance	  : 4000;
	this.parameters.inclination = !isNaN(parameters.inclination) ? parameters.inclination : .25;
	this.parameters.azimuth 	= !isNaN(parameters.azimuth)	 ? parameters.azimuth	  : .205;
}

Sky.prototype.update = function() {
	let theta = Math.PI * (this.parameters.inclination - 0.5);
	let phi = 2 * Math.PI * (this.parameters.azimuth - 0.5);

	this.sunLight.position.x = this.parameters.distance * Math.cos(phi);
	this.sunLight.position.y = this.parameters.distance * Math.sin(phi) * Math.sin(theta);
	this.sunLight.position.z = this.parameters.distance * Math.sin(phi) * Math.cos(theta);

	this.skyObject.material.uniforms.sunPosition.value = this.sunLight.position.copy(this.sunLight.position);
	this.sunLight.shadow.mapSize.width = 2048; // default
	this.sunLight.shadow.mapSize.height = 2048; // default
	this.sunLight.shadow.camera.near = 3500;
	this.sunLight.shadow.camera.far = 4200;
	this.sunLight.shadow.camera.left = -60;
	this.sunLight.shadow.camera.right = 60;
	this.sunLight.shadow.camera.top = 50;
	this.sunLight.shadow.camera.bottom = -30;

	if (this.water) {
		this.water.waterObject.material.uniforms.sunDirection.value.copy(this.sunLight.position).normalize();
	}
};

Sky.prototype.toggleDebugHelper = function(state) {
	if (!this.shadowHelper && state) this.shadowHelper = new THREE.CameraHelper(this.sunLight.shadow.camera);
	if (state) {
		this.skyObject.add(this.shadowHelper);
	} else if (this.shadowHelper) {
		this.skyObject.remove(this.shadowHelper);
	}
};

// Marbles
const MarbleMesh = function(tags) {
	this.size = tags.size;
	this.color = tags.color;
	this.name = tags.name;

	this.geometry = new THREE.SphereBufferGeometry(this.size, 9, 9);
	this.materialColor = new THREE.Color(this.color);
	this.material = new THREE.MeshStandardMaterial({ color: this.materialColor });
	this.mesh = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial);

	// Shadows
	this.mesh.castShadow = config.graphics.castShadow.marbles;
	this.mesh.receiveShadow = config.graphics.receiveShadow.marbles;

	// Add name sprite
	const nameSprite = makeTextSprite(name);
	this.mesh.add(nameSprite);

	// Add to collection
	_marbles.meshes.push(this.mesh);

	// Add objects to the scene
	_mainScene.add(this.mesh);
	//_mainScene.add(nameSprite);
	//marbleMeshes[marbleMeshes.length - 1].add(nameSprite);
};

const removeAllMarbleMeshes = _marbles.removeAll = function() {
	for (let mesh of _marbles.meshes) {
		for (let i = mesh.children.length; i >= 0; i--) {
			_mainScene.remove(mesh.children[i]);
		}
		_mainScene.remove(mesh);
	}

	_marbles.meshes = [];
};

const updateMarbleMeshes = _marbles.update = function(newPositions, newRotations, delta) {
	for (let i = 0; i < _marbles.meshes.length; i++) {
		// Positions
		_marbles.meshes[i].position.x = THREE.Math.lerp(_marbles.meshes[i].position.x || 0, newPositions[i * 3 + 0], delta);
		_marbles.meshes[i].position.y = THREE.Math.lerp(_marbles.meshes[i].position.y || 0, newPositions[i * 3 + 2], delta);
		_marbles.meshes[i].position.z = THREE.Math.lerp(_marbles.meshes[i].position.z || 0, newPositions[i * 3 + 1], delta);

		// Rotations
		_marbles.meshes[i].quaternion.set(
			newRotations[i * 4 + 0],
			newRotations[i * 4 + 1],
			newRotations[i * 4 + 2],
			newRotations[i * 4 + 3]
		);
	}
};

function makeTextSprite(message) {
	let fontFamily = "Courier New";
	let fontSize = 24;

	let canvas = document.createElement("canvas");
	canvas.width = 256;
	canvas.height = 64;

	let context = canvas.getContext("2d");
	context.font = `Bold ${fontSize}px ${fontFamily}`;
	context.textAlign = "center";
	context.fillStyle = "#ffffff";
	context.fillText(message, 128, fontSize);

	// Canvas contents will be used for a texture
	let texture = new THREE.Texture(canvas);
	texture.needsUpdate = true;

	let spriteMaterial = new THREE.SpriteMaterial({ map: texture });
	let sprite = new THREE.Sprite(spriteMaterial);
	sprite.scale.set(4, 1, 1.0);

	return sprite;
}

function animate() {
	// Update active controls, needs to be buttery smooth, thus is called before requesting the next frame
	if (_controls.active.enabled === true) {
		_controls.active.update();
	}

	// Request new frame
	requestAnimationFrame(animate);

	// Run all functions that need an update
	for (let func of animationUpdateFunctions) {
		func();
	}

	// Render the darn thing
	_renderer.render(_mainScene, _controls.active.camera);
}

export {
	MarbleMap,
	MarbleMesh,
	updateMarbleMeshes,
	removeAllMarbleMeshes,
	animationUpdateFunctions
};
