import {
	Scene,
	WebGLRenderer,
	Mesh,
	BoxBufferGeometry,
	MeshStandardMaterial,
	GammaEncoding as THREE_GAMMA_ENCODING,
	PCFShadowMap as THREE_PCF_SHADOW_MAP
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as Stats from "stats-js";
import * as config from "../config";
import { cameras, FreeCamera, TrackingCamera } from "./cameras";

const renderCore = function() {
	let _renderer = null,
		_stats = null,
		_defaultModel = null,
		_previousTime = Date.now(),
		_updateCallback = null,
		_onStartAnimateLoop = null,
		_viewportElement = null;

	const _GLTFLoader = new GLTFLoader();

	const _onCanvasResize = () => {
		_renderer.setSize(_viewportElement.clientWidth, _viewportElement.clientHeight);

		renderCore.activeCamera.camera.aspect = _viewportElement.clientWidth / _viewportElement.clientHeight;
		renderCore.activeCamera.camera.updateProjectionMatrix();
	};

	window.addEventListener("resize", _onCanvasResize, false);

	let clearColor = 0x000000;

	// Core render loop
	const _animate = () => {
		let now = Date.now();
		let deltaTime = (now - _previousTime) * 0.001; // Time in seconds
		_previousTime = now;

		// Request new frame
		requestAnimationFrame(_animate);

		_renderer.setClearColor((clearColor += 0xff) % 0xffffff, 1);

		_stats.begin();

		// Make updates
		_updateCallback(deltaTime);

		// Update shader uniforms
		//this.shaderUniforms["time"].value += deltaTime;

		if (renderCore.activeCamera.enabled === true) {
			renderCore.activeCamera.update(deltaTime);
		}

		// Render the darn thing
		_renderer.render(renderCore.mainScene, renderCore.activeCamera.camera);

		_stats.end();
	};

	// Default model
	try {
		_GLTFLoader.load(
			// resource URL
			"resources/models/default.gltf",
			// called when the resource is loaded
			(gltf) => {
				_defaultModel = gltf.scene;
			},
			// onProgress callback (unused)
			null,
			// error callback
			(error) => {
				console.error("An error occurred when loading the fallback model", error);
			}
		);
	}
	catch (error) {
		console.warn("Unable to load default model", error);
	}

	return {
		mainScene: null,
		activeCamera: null,
		freeCamera: null,
		trackingCamera: null,
		shaderUniforms: {
			"time": { value: 0 }
		},

		setCameraStyle(type) {
			// Check if we're not already the camera type we try to become
			if (this.activeCamera && type === this.activeCamera.type) return; // Is already this type.

			// Helper function that copies position and rotation from previously used camera
			const copyPositionAndRotation = (target, source) => {
				target.camera.position.copy(source.camera.position);
				target.camera.rotation.copy(source.camera.rotation);
			};

			// Copy over transform data, disable previously used camera / controls, enable new camera / controls
			switch (type) {
			case cameras.CAMERA_TRACKING:
				if (this.activeCamera) {
					copyPositionAndRotation(this.trackingCamera, this.activeCamera);
					this.activeCamera.disable();
				}
				this.activeCamera = this.trackingCamera;
				break;
			default:
				console.warn("No known camera type has been supplied, defaulting to free camera.");
			case cameras.CAMERA_FREE:
				if (this.activeCamera) {
					copyPositionAndRotation(this.freeCamera, this.activeCamera);
					this.freeCamera.camera.rotation.z = 0; // Make sure we're not at an angle
					this.activeCamera.disable();
				}
				this.activeCamera = this.freeCamera;
				break;
			}

			this.activeCamera.enable();
			_onCanvasResize();
		},

		setUpdateCallback(callback) {
			_updateCallback = callback;
		},

		setOnStartAnimateLoop(callback) {
			_onStartAnimateLoop = callback;
		},

		updateShadowMap() {
			_renderer.shadowMap.needsUpdate = true;
		},

		autoUpdateShadowMap(autoUpdate = true) {
			_renderer.shadowMap.autoUpdate = autoUpdate;
		},

		waterReflectsLevel() {
			return config.graphics.reflection.level;
		},

		waterReflectsMarbles() {
			return config.graphics.reflection.marbles;
		},

		getDefaultModel() {
			return _defaultModel;
		},

		isWebGLAvailable() {
			try {
				const canvas = document.createElement("canvas");
				return !!(window && window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
			} catch (error) {
				return false;
			}
		},

		setRenderTarget(viewportElement) {
			_viewportElement = viewportElement;
			_onCanvasResize();
			_viewportElement.appendChild(_renderer.domElement);
			_viewportElement.appendChild(_stats.dom);
		},

		startAnimationLoop(viewportElement, defaultCameraType) {
			this.setRenderTarget(viewportElement);
			this.setCameraStyle(defaultCameraType);
			_onStartAnimateLoop();
			_animate();
		},

		initialize() {
			if (this.isWebGLAvailable()) { // Initialize
				this.mainScene = new Scene();
				_renderer = new WebGLRenderer();
				_renderer.outputEncoding = THREE_GAMMA_ENCODING;
				_renderer.gammaFactor = 2.2;
				_renderer.debug.checkShaderErrors = false;
				_defaultModel = new Mesh(
					new BoxBufferGeometry(1, 1, 1, 1),
					new MeshStandardMaterial({
						color: 0x000000,
						emissive: 0xff00ff,
						wireframe: true
					})
				); // The fallback for the fallback. Is replaced by the real fallback mesh if loading succeeds.

				// Renderer defaults
				_renderer.shadowMap.enabled = true;
				_renderer.shadowMap.type = THREE_PCF_SHADOW_MAP; // default is THREE.PCFShadowMap

				// Stats
				_stats = new Stats();
				_stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
				_stats.dom.style.position = "absolute";
				_stats.dom.style.left = "unset";
				_stats.dom.style.right = "0px";

				// Controls
				this.trackingCamera = new TrackingCamera(this.mainScene, _renderer, { enabledByDefault: false });
				this.freeCamera = new FreeCamera(this.mainScene, _renderer, { enabledByDefault: false });

				_previousTime = Date.now(); // Update loop starts from this point in time, ignore load time

				return;
			} else {
				// Fallback if WebGL is not supported
				return window.WebGLRenderingContext ? "graphics card" : "browser";
			}
		}
	};
}();

export {
	renderCore
};
