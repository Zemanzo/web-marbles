import * as THREE from "three";
import "three/examples/js/loaders/LoaderSupport";
import "three/examples/js/loaders/GLTFLoader";
import * as Cookies from "js-cookie";
import * as Stats from "stats-js";
import * as config from "../config";
import { CameraFlyControls } from "./cameras";
import domReady from "../dom-ready";
import { levelManager } from "../level-manager";

let _userData = Cookies.getJSON("user_data");
const _GLTFLoader = new THREE.GLTFLoader();

let renderCore = function() {
	let _mainScene = null,
		_renderer = null,
		_marbleMeshes = [],
		_viewport = null, // DOM viewport element
		_stats = null,
		_controls = null,
		_defaultModel = null;

	// Core render loop
	const _animate = function() {
		// Update active controls, needs to be buttery smooth, thus is called before requesting the next frame
		if (_controls.enabled === true) {
			_controls.update();
		}

		// Request new frame
		requestAnimationFrame(_animate);

		_stats.begin();

		// Make updates
		renderCore.updateMarbles();
		if(levelManager.activeLevel) levelManager.activeLevel.update();

		// Render the darn thing
		_renderer.render(_mainScene, _controls.camera);

		_stats.end();
	};

	const _onCanvasResize = function() {
		_renderer.setSize(_viewport.clientWidth, _viewport.clientHeight);

		_controls.camera.aspect = _viewport.clientWidth / _viewport.clientHeight;
		_controls.camera.updateProjectionMatrix();
	};

	// From https://github.com/mrdoob/three.js/blob/master/examples/js/WebGL.js
	const _isWebGLAvailable = function() {
		try {
			const canvas = document.createElement("canvas");
			return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
		} catch (error) {
			return false;
		}
	};

	return {
		initialize: function() {
			// Check for WebGL availability and display a warning when it is missing.
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
			} else { // Initialize
				_mainScene = new THREE.Scene();
				_renderer = new THREE.WebGLRenderer();
				_defaultModel = new THREE.Mesh(
					new THREE.BoxBufferGeometry(1, 1, 1, 1),
					new THREE.MeshStandardMaterial({
						color: 0x000000,
						emissive: 0xff00ff,
						wireframe: true
					})); // The fallback for the fallback. Is replaced by the real fallback mesh if loading succeeds.

				// Default model
				try {
					_GLTFLoader.load(
						// resource URL
						"resources/models/default.gltf",

						// called when the resource is loaded
						function(gltf) {
							_defaultModel = gltf.scene;
						},

						null,

						function(error) {
							console.error("An error occurred when loading the fallback model", error);
						}
					);
				}
				catch (error) {
					console.log("Unable to load default model", error);
				}

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
				_controls = new CameraFlyControls(_mainScene, _renderer);

				// Once the DOM is ready, append the renderer DOM element & stats and start animating.
				return domReady.then(() => {
					_viewport = document.getElementById("viewport");

					_onCanvasResize();

					window.addEventListener("resize", _onCanvasResize, false);

					_viewport.appendChild(_renderer.domElement);
					_viewport.appendChild(_stats.dom);

					_animate();
				});
			}
		},

		getDefaultModel: function() {
			return _defaultModel;
		},

		getMainScene: function() {
			return _mainScene;
		},

		updateMarbles: function() {},

		addMarbleMesh: function(data) {
			let marbleMesh = new MarbleMesh(data);
			_marbleMeshes.push(marbleMesh);
			_mainScene.add(marbleMesh.mesh);
			_mainScene.add(marbleMesh.nameSprite);
		},

		removeAllMarbleMeshes: function() {
			for (let marble of _marbleMeshes) {
				for (let i = marble.mesh.children.length; i >= 0; i--) {
					_mainScene.remove(marble.mesh.children[i]);
				}
				_mainScene.remove(marble.nameSprite);
				_mainScene.remove(marble.mesh);
			}

			_marbleMeshes = [];
		},

		updateMarbleMeshes: function(newPositions, newRotations, delta) {
			for (let i = 0; i < _marbleMeshes.length; i++) {
				// Positions
				_marbleMeshes[i].mesh.position.x = THREE.Math.lerp(_marbleMeshes[i].mesh.position.x || 0, newPositions[i * 3 + 0], delta);
				_marbleMeshes[i].mesh.position.y = THREE.Math.lerp(_marbleMeshes[i].mesh.position.y || 0, newPositions[i * 3 + 2], delta);
				_marbleMeshes[i].mesh.position.z = THREE.Math.lerp(_marbleMeshes[i].mesh.position.z || 0, newPositions[i * 3 + 1], delta);

				// Rotations
				_marbleMeshes[i].mesh.quaternion.set(
					newRotations[i * 4 + 0],
					newRotations[i * 4 + 1],
					newRotations[i * 4 + 2],
					newRotations[i * 4 + 3]
				);

				// Also update the nameSprite position
				if (_marbleMeshes[i].nameSprite) {
					_marbleMeshes[i].nameSprite.position.x = (_marbleMeshes[i].mesh.position.x || 0);
					_marbleMeshes[i].nameSprite.position.y = (_marbleMeshes[i].mesh.position.y || 0) + _marbleMeshes[i].size - .1;
					_marbleMeshes[i].nameSprite.position.z = (_marbleMeshes[i].mesh.position.z || 0);
				}
			}
		}
	};
}();

// Marbles
const MarbleMesh = function(tags) {
	this.size = tags.size;
	this.color = tags.color;
	this.name = tags.name;

	this.geometry = new THREE.SphereBufferGeometry(this.size, 9, 9);
	this.materialColor = new THREE.Color(this.color);
	this.material = new THREE.MeshStandardMaterial({ color: this.materialColor });
	this.mesh = new THREE.Mesh(this.geometry, this.material);

	// Useful for debugging
	this.mesh.name = `Marble (${tags.name})`;

	// Shadows
	this.mesh.castShadow = config.graphics.castShadow.marbles;
	this.mesh.receiveShadow = config.graphics.receiveShadow.marbles;

	// Highlight own name
	let nameSpriteOptions = {};
	if (_userData && _userData.username === this.name) {
		nameSpriteOptions.color = "#BA0069";
	}

	// Add name sprite (we avoid parenting, because this will also cause it to inherit the rotation which we do not want)
	this.nameSprite = makeTextSprite(this.name, nameSpriteOptions);
};

const makeTextSprite = function(message, options = {}) {
	let fontFamily = options.fontFamily || "Courier New";
	let fontSize = 48;

	let canvas = document.createElement("canvas");
	canvas.width = 512;
	canvas.height = 128;

	let context = canvas.getContext("2d");
	context.font = `Bold ${fontSize}px ${fontFamily}`;
	context.textAlign = "center";
	context.fillStyle = options.color || "#ffffff";
	context.fillText(message, 256, fontSize);

	// Canvas contents will be used for a texture
	let texture = new THREE.Texture(canvas);
	texture.needsUpdate = true;

	let spriteMaterial = new THREE.SpriteMaterial({ map: texture });
	let sprite = new THREE.Sprite(spriteMaterial);
	sprite.scale.set(4, 1, 1.0);

	return sprite;
};

export {
	renderCore
};
