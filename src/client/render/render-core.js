import * as THREE from "three";
import "three/examples/js/objects/Water";
import "three/examples/js/objects/Sky";
import "three/examples/js/loaders/LoaderSupport";
import "three/examples/js/loaders/GLTFLoader";
import * as Cookies from "js-cookie";
import * as Stats from "stats-js";
import * as config from "../config";
import { CameraFlyControls } from "./cameras";
import { CustomMaterial } from "./custom-material";
import domReady from "../dom-ready";

let _userData = Cookies.getJSON("user_data");
const _GLTFLoader = new THREE.GLTFLoader();

let renderCore = function() {
	let _mainScene = null,
		_renderer = null,
		_marbleMeshes = [],
		_viewport = null, // DOM viewport element
		_stats = null,
		_controls = null,
		_defaultModel = null,

		activeLevel = null;

	// Set a new active level
	const setActiveLevel = function(marbleLevel) {
		if (activeLevel) {
			_mainScene.remove(activeLevel.scene);
		}
		activeLevel = marbleLevel;
		_mainScene.add(activeLevel.scene);
	};

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
		activeLevel.update();

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
					console.error("An error occurred when loading the model", error);
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

		setActiveLevel(new MarbleLevel());

		// Once the DOM is ready, append the renderer DOM element & stats and start animating.
		domReady.then(() => {
			_viewport = document.getElementById("viewport");

			_onCanvasResize();

			window.addEventListener("resize", _onCanvasResize, false);

			_viewport.appendChild(_renderer.domElement);
			_viewport.appendChild(_stats.dom);

			_animate();
		});
	}

	return {
		activeLevel,
		setActiveLevel,

		getDefaultModel: function() {
			return _defaultModel;
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

function MarbleLevel() { // "Map" is taken. This comment is left here in memory of "MarbleMap"
	this.scene = new THREE.Scene();
	this.levelScene = new THREE.Scene(); // Scene for all loaded level objects
	this.scene.add(this.levelScene);
	this.startingGates = [];

	// Ambient light
	let ambientLight = new THREE.AmbientLight(0x746070);
	this.scene.add(ambientLight);

	// Sky + Sunlight
	this.sky = new Sky(this.scene);
	this.scene.add(this.sky.skyObject);

	// Water
	this.water = new Water(this.scene, this.sky.sunLight);
	this.scene.add(this.water.waterObject);
	this.sky.water = this.water;
}

MarbleLevel.prototype.update = function() {
	this.water.update();
};

MarbleLevel.prototype.openGates = function() {
	for(let i = 0; i < this.startingGates.length; i++) {
		this.startingGates[i].visible = false;
	}
};

MarbleLevel.prototype.closeGates = function() {
	for(let i = 0; i < this.startingGates.length; i++) {
		this.startingGates[i].visible = true;
	}
};

// Parses the level data and returns a Promise that resolves once it is fully done loading
MarbleLevel.prototype.loadLevel = function(data) {
	// Reset loaded data if there is any
	this.scene.remove(this.levelScene);
	this.startingGates = [];
	this.levelScene = new THREE.Scene();
	this.scene.add(this.levelScene);

	// Load environmental variables
	this.water.setHeight(data.world.waterLevel);
	this.sky.recalculate({ inclination: data.world.sunInclination });

	// Load textures
	let textures = {};
	for (let textureUuid in data.textures) {
		textures[textureUuid] = Object.assign({}, data.textures[textureUuid]);
		textures[textureUuid].texture = new THREE.TextureLoader().load(textures[textureUuid].file);
		textures[textureUuid].texture.wrapS = textures[textureUuid].texture.wrapT = THREE.RepeatWrapping;
	}

	// Load materials
	let materials = {};
	for (let materialUuid in data.materials) {
		// For each material property that uses a texture, set the appropriate texture in the data so it can be used by CustomMaterial
		let textureProperties = ["diffuse-a", "diffuse-b", "mask", "normal-a", "normal-b"];
		for (let property of textureProperties) {
			let materialProperty = data.materials[materialUuid][property];
			materialProperty.texture = textures[materialProperty.textureUuid].texture;
		}

		// Create an object that can be parsed by CustomMaterial
		let properties = {
			side:	   data.materials[materialUuid].side,
			roughness: data.materials[materialUuid].roughness,
			metalness: data.materials[materialUuid].metalness,
			diffuseA:  data.materials[materialUuid]["diffuse-a"],
			diffuseB:  data.materials[materialUuid]["diffuse-b"],
			mask:	   data.materials[materialUuid]["mask"],
			normalA:   data.materials[materialUuid]["normal-a"],
			normalB:   data.materials[materialUuid]["normal-b"]
		};

		try {
			materials[materialUuid] = (new CustomMaterial(properties)).material;
			materials[materialUuid].build();
		} catch (error) {
			console.warn(error);
		}
	}

	// Load models & childMeshes, apply custom materials where appropriate
	let childNumber = null;
	function setChildMeshMaterials(obj, childMeshes) {
		let children = [];

		if (obj.type === "Mesh") {
			if (materials[childMeshes[childNumber].material] != null) {
				obj.material = materials[childMeshes[childNumber].material];
			}
			childNumber++;
		}

		for (let c = 0; c < obj.children.length; c++) {
			children = children.concat(setChildMeshMaterials(obj.children[c], childMeshes));
		}
		return children;
	}

	let modelPromises = [];
	let models = {};
	for (let modelName in data.models) {
		modelPromises.push(
			new Promise((resolve, reject) => {
				try {
					_GLTFLoader.parse(data.models[modelName].file, null,
						function(model) {
							childNumber = 0;
							setChildMeshMaterials(model.scene, data.models[modelName].childMeshes);
							models[modelName] = model.scene;
							resolve();
						}, function(error) {
							reject(error);
						}
					);
				}
				catch (error) {
					// Invalid JSON/GLTF files may end up here
					reject(error);
				}
			}).catch((error) => {
				console.warn(`Unable to load model (${modelName}), using fallback model instead`, error);
				models[modelName] = renderCore.getDefaultModel();
			})
		);
	}

	// Load prefabs
	let prefabs = {};
	return Promise.all(modelPromises).then(() => {
		for (let prefabUuid in data.prefabs) {
			let group = new THREE.Group();

			for (let entity of Object.values(data.prefabs[prefabUuid].entities)) {
				if (entity.type === "object" && entity.model) {
					let clone = models[entity.model].clone();
					clone.userData.functionality = entity.functionality;

					clone.position.copy(new THREE.Vector3(entity.position.x, entity.position.y, entity.position.z));
					clone.setRotationFromQuaternion(new THREE.Quaternion(entity.rotation.x, entity.rotation.y, entity.rotation.z, entity.rotation.w));
					clone.scale.copy(new THREE.Vector3(entity.scale.x, entity.scale.y, entity.scale.z));
					group.add(clone);
				}
			}

			prefabs[prefabUuid] = group;
		}

		// World objects
		for (let object of Object.values(data.worldObjects)) {
			let clone = prefabs[object.prefab].clone();
			clone.position.copy(new THREE.Vector3(object.position.x, object.position.y, object.position.z));
			clone.setRotationFromQuaternion(new THREE.Quaternion(object.rotation.x, object.rotation.y, object.rotation.z, object.rotation.w));
			this.levelScene.add(clone);

			// Keep starting gates in a separate array for opening/closing
			for(let i = 0; i < clone.children.length; i++) {
				if(clone.children[i].userData.functionality === "startgate") {
					this.startingGates.push(clone.children[i]);
				}
			}
		}
	});
};

// Water
function Water(parentScene, sunLight, waterLevel = 0, fog = false) {
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
	let tempFunction = this.waterObject.onBeforeRender;
	this.waterObject.onBeforeRender = function(renderer, scene, camera) {
		for (let object of parentScene.children) {
			if (object.userData.reflectInWater !== true) {
				object.visible = false;
			}
		}

		tempFunction(renderer, scene, camera);

		for (let object of parentScene.children) {
			if (object.userData.reflectInWater !== true) {
				object.visible = true;
			}
		}
	};
}

Water.prototype.setHeight = function(newHeight) {
	this.waterObject.position.y = newHeight;
};

Water.prototype.update = function() {
	this.waterObject.material.uniforms.time.value += 1.0 / 60.0;
};

// Skybox
function Sky(scene, parameters = {}) {
	this.scene = scene;
	this.skyObject = new THREE.Sky();
	this.skyObject.userData.reflectInWater = true;
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
	this.parameters.distance	= !isNaN(parameters.distance)	 ? parameters.distance	  : 4000;
	this.parameters.inclination = !isNaN(parameters.inclination) ? parameters.inclination : .25;
	this.parameters.azimuth		= !isNaN(parameters.azimuth)	 ? parameters.azimuth	  : .205;
	//this.recalculate();
}

Sky.prototype.recalculate = function(parameters) {
	// parameters variable is optional, if you wish to change them before recalculating
	if (parameters) {
		if (typeof parameters.distance	  !== "undefined") this.parameters.distance	   = parameters.distance;
		if (typeof parameters.inclination !== "undefined") this.parameters.inclination = parameters.inclination;
		if (typeof parameters.azimuth	  !== "undefined") this.parameters.azimuth	   = parameters.azimuth;
	}

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
