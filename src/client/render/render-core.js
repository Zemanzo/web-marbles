import {
	Scene,
	WebGLRenderer,
	Mesh,
	BoxBufferGeometry,
	MeshStandardMaterial,
	PCFSoftShadowMap as THREE_PCF_SOFT_SHADOW_MAP
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as config from "../config";
import * as Stats from "stats-js";
import { cameras, FreeCamera, TrackingCamera } from "./cameras";
import domReady from "../dom-ready";

const _GLTFLoader = new GLTFLoader();

let renderCore = function() {
	let _renderer = null,
		_viewport = null, // DOM viewport element
		_stats = null,
		_defaultModel = null,
		_previousTime = Date.now();

	// Core render loop
	const _animate = function() {
		let now = Date.now();
		let deltaTime = (now - _previousTime) * 0.001; // Time in seconds
		_previousTime = now;

		// Request new frame
		requestAnimationFrame(_animate);

		_stats.begin();

		// Make updates
		renderCore.updateCallback(deltaTime);

		// Update shader uniforms
		renderCore.shaderUniforms["time"].value += deltaTime;

		if (renderCore.activeCamera.enabled === true) {
			renderCore.activeCamera.update(deltaTime);
		}

		// Render the darn thing
		_renderer.render(renderCore.mainScene, renderCore.activeCamera.camera);

		_stats.end();
	};

	const _onCanvasResize = function() {
		_renderer.setSize(_viewport.clientWidth, _viewport.clientHeight);

		renderCore.activeCamera.camera.aspect = _viewport.clientWidth / _viewport.clientHeight;
		renderCore.activeCamera.camera.updateProjectionMatrix();
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
		activeCamera: null,
		freeCamera: null,
		trackingCamera: null,
		shaderUniforms: {
			"time": { value: 0 }
		},

		// Camera layer definitions
		SPRITE_LAYER: 1,

		initialize: function(defaultCameraType) {
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
				this.mainScene = new Scene();
				_renderer = new WebGLRenderer();
				_renderer.debug.checkShaderErrors = false;
				_defaultModel = new Mesh(
					new BoxBufferGeometry(1, 1, 1, 1),
					new MeshStandardMaterial({
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
				_renderer.shadowMap.type = THREE_PCF_SOFT_SHADOW_MAP; // default is THREE.PCFShadowMap

				// Stats
				_stats = new Stats();
				_stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
				_stats.dom.style.position = "absolute";
				_stats.dom.style.left = "unset";
				_stats.dom.style.right = "0px";

				// Controls
				this.trackingCamera = new TrackingCamera(this.mainScene, _renderer, { enabledByDefault: false });
				this.freeCamera = new FreeCamera(this.mainScene, _renderer, { enabledByDefault: false });

				this.setCameraStyle(defaultCameraType);

				// Once the DOM is ready, append the renderer DOM element & stats and start animating.
				return domReady.then(() => {
					_previousTime = Date.now(); // Update loop starts from this point in time, ignore load time
					_viewport = document.getElementById("viewport");

					_onCanvasResize();

					window.addEventListener("resize", _onCanvasResize, false);
					let _cameraFreeButton = document.getElementById("cameraFree"),
						_cameraTrackingButton = document.getElementById("cameraTracking");
					if (_cameraFreeButton) _cameraFreeButton.addEventListener("click", () => { this.setCameraStyle(cameras.CAMERA_FREE); }, false);
					if (_cameraTrackingButton) _cameraTrackingButton.addEventListener("click", () => { this.setCameraStyle(cameras.CAMERA_TRACKING); }, false);

					_viewport.appendChild(_renderer.domElement);
					_viewport.appendChild(_stats.dom);

					_animate();
				});
			}
		},

		setCameraStyle: function(type) {
			// Check if we're not already the camera type we try to become
			if (renderCore.activeCamera && type === renderCore.activeCamera.type) return; // Is already this type.

			// Helper function that copies position and rotation from previously used camera
			function copyPositionAndRotation(target, source) {
				target.camera.position.copy(source.camera.position);
				target.camera.rotation.copy(source.camera.rotation);
			}

			// Copy over transform data, disable previously used camera / controls, enable new camera / controls
			let nodeId;
			switch (type) {
			case cameras.CAMERA_TRACKING:
				if (renderCore.activeCamera) {
					copyPositionAndRotation(renderCore.trackingCamera, renderCore.activeCamera);
					renderCore.activeCamera.disable();
				}
				renderCore.activeCamera = renderCore.trackingCamera;
				nodeId = "cameraTracking";
				break;
			default:
				console.warn("No known camera type has been supplied, defaulting to free camera.");
			case cameras.CAMERA_FREE:
				if (renderCore.activeCamera) {
					copyPositionAndRotation(renderCore.freeCamera, renderCore.activeCamera);
					renderCore.freeCamera.camera.rotation.z = 0; // Make sure we're not at an angle
					renderCore.activeCamera.disable();
				}
				renderCore.activeCamera = renderCore.freeCamera;
				nodeId = "cameraFree";
				break;
			}

			renderCore.activeCamera.enable();

			if (_viewport) _onCanvasResize();

			// Set selected camera style in DOM
			domReady.then(() => {
				let node = document.getElementById(nodeId);
				if (node) {
					let selected = node.parentNode.getElementsByClassName("selected")[0];
					if (selected) selected.classList.remove("selected");
					node.classList.add("selected");
				}
			});
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
