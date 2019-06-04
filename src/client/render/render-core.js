import * as THREE from "three";
import "three/examples/js/loaders/LoaderSupport";
import "three/examples/js/loaders/GLTFLoader";
import * as config from "../config";
import * as Stats from "stats-js";
import { FreeCamera, TrackingCamera } from "./cameras";
import domReady from "../dom-ready";

const _GLTFLoader = new THREE.GLTFLoader();

let renderCore = function() {
	let _renderer = null,
		_viewport = null, // DOM viewport element
		_stats = null,
		_controls = null,
		_defaultModel = null,
		_previousTime = Date.now();

	// Core render loop
	const _animate = function() {
		let now = Date.now();
		let deltaTime = (now - _previousTime) * 0.001; // Time in seconds
		_previousTime = now;

		// Update active controls, needs to be buttery smooth, thus is called before requesting the next frame
		if (_controls.enabled === true) {
			_controls.update(deltaTime);
		}

		// Request new frame
		requestAnimationFrame(_animate);

		_stats.begin();

		// Make updates
		renderCore.updateCallback(deltaTime);

		// Render the darn thing
		_renderer.render(renderCore.mainScene, _controls.camera);

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
		mainScene: null,

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
				this.mainScene = new THREE.Scene();
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
				_controls = new TrackingCamera(this.mainScene, _renderer);

				// Once the DOM is ready, append the renderer DOM element & stats and start animating.
				return domReady.then(() => {
					_previousTime = Date.now(); // Update loop starts from this point in time, ignore load time
					_viewport = document.getElementById("viewport");

					_onCanvasResize();

					window.addEventListener("resize", _onCanvasResize, false);

					_viewport.appendChild(_renderer.domElement);
					_viewport.appendChild(_stats.dom);

					_animate();
				});
			}
		},

		updateCallback: function() {
			// Overridable function for the client and editor to attach their update functions to.
		},

		waterReflectsLevel: function() {
			return config.graphics.reflection.level;
		},

		waterReflectsMarbles: function() {
			return config.graphics.reflection.marbles;
		},

		getDefaultModel: function() {
			return _defaultModel;
		}
	};
}();

export {
	renderCore
};
