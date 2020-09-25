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
import { cameras, FreeCamera, TrackingCamera } from "../render/cameras";

function ViewportClientOnly(viewportElement, props) {
	let _renderer = null,
		_stats = null,
		_defaultModel = null,
		_trackingCamera = null,
		_freeCamera = null,
		_mainScene = null,
		_activeCamera = null,
		_previousTime = Date.now();

	const _isWebGLAvailable = () => {
		try {
			const canvas = document.createElement("canvas");
			return !!(window && window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
		} catch (error) {
			return false;
		}
	};

	const _onCanvasResize = () => {
		_renderer.setSize(viewportElement.clientWidth, viewportElement.clientHeight);

		_activeCamera.camera.aspect = viewportElement.clientWidth / viewportElement.clientHeight;
		_activeCamera.camera.updateProjectionMatrix();
	};

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
		props.updateCallback(deltaTime);

		// Update shader uniforms
		//this.shaderUniforms["time"].value += deltaTime;

		if (_activeCamera.enabled === true) {
			_activeCamera.update(deltaTime);
		}

		// Render the darn thing
		_renderer.render(_mainScene, _activeCamera.camera);

		_stats.end();
	};

	const _setCameraStyle = (type) => {
		// Check if we're not already the camera type we try to become
		if (_activeCamera && type === _activeCamera.type) return; // Is already this type.

		// Helper function that copies position and rotation from previously used camera
		const copyPositionAndRotation = (target, source) => {
			target.camera.position.copy(source.camera.position);
			target.camera.rotation.copy(source.camera.rotation);
		};

		// Copy over transform data, disable previously used camera / controls, enable new camera / controls
		let nodeId;
		switch (type) {
		case 1:
			if (_activeCamera) {
				copyPositionAndRotation(_trackingCamera, _activeCamera);
				_activeCamera.disable();
			}
			_activeCamera = _trackingCamera;
			nodeId = cameras.CAMERA_TRACKING;
			break;
		default:
			console.warn("No known camera type has been supplied, defaulting to free camera.");
		case 2:
			if (_activeCamera) {
				copyPositionAndRotation(_freeCamera, _activeCamera);
				_freeCamera.camera.rotation.z = 0; // Make sure we're not at an angle
				_activeCamera.disable();
			}
			_activeCamera = _freeCamera;
			nodeId = cameras.CAMERA_FREE;
			break;
		}

		_activeCamera.enable();
		_onCanvasResize();

		// Set selected camera style in DOM
		// domReady.then(() => {
		// 	let node = document.getElementById(nodeId);
		// 	if (node) {
		// 		let selected = node.parentNode.getElementsByClassName("selected")[0];
		// 		if (selected) selected.classList.remove("selected");
		// 		node.classList.add("selected");
		// 	}
		// });
	};

	const _updateShadowMap = () => {
		_renderer.shadowMap.needsUpdate = true;
	};

	const _autoUpdateShadowMap = (autoUpdate = true) => {
		_renderer.shadowMap.autoUpdate = autoUpdate;
	};

	const _waterReflectsLevel = () => {
		return config.graphics.reflection.level;
	};

	const _waterReflectsMarbles = () => {
		return config.graphics.reflection.marbles;
	};

	const _getDefaultModel = () => {
		return _defaultModel;
	};

	window.addEventListener("resize", _onCanvasResize, false);

	const _GLTFLoader = new GLTFLoader();

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

	if (_isWebGLAvailable()) { // Initialize
		_mainScene = new Scene();
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
		_trackingCamera = new TrackingCamera(_mainScene, _renderer, { enabledByDefault: false });
		_freeCamera = new FreeCamera(_mainScene, _renderer, { enabledByDefault: false });

		_setCameraStyle(props.defaultCameraType);

		_previousTime = Date.now(); // Update loop starts from this point in time, ignore load time

		_onCanvasResize();

		// let _cameraFreeButton = document.getElementById("cameraFree"),
		// 	_cameraTrackingButton = document.getElementById("cameraTracking");
		// if (_cameraFreeButton) _cameraFreeButton.addEventListener("click", () => { this.setCameraStyle(cameras.CAMERA_FREE); }, false);
		// if (_cameraTrackingButton) _cameraTrackingButton.addEventListener("click", () => { this.setCameraStyle(cameras.CAMERA_TRACKING); }, false);

		viewportElement.appendChild(_renderer.domElement);
		viewportElement.appendChild(_stats.dom);

		_animate();
	} else {
		// Fallback if WebGL is not supported
		return window.WebGLRenderingContext ? "graphics card" : "browser";
	}
}

export default ViewportClientOnly;
