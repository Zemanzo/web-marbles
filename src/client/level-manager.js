import {
	Scene,
	AmbientLight,
	TextureLoader,
	RepeatWrapping as THREE_REPEAT_WRAPPING,
	RGBADepthPacking as THREE_RGBA_DEPTH_PACKING,
	Vector3,
	Quaternion,
	Group,
	PlaneBufferGeometry,
	DirectionalLight,
	CameraHelper,
	MeshDepthMaterial,
	InstancedMesh,
	Matrix4
} from "three";
import { Water as ThreeWater } from "three/examples/jsm/objects/Water";
import { Sky as ThreeSky } from "three/examples/jsm/objects/Sky";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { renderCore } from "./render/render-core";
import { CustomMaterial } from "./render/custom-material";
import * as LevelData from "../level/level-data";
import { marbleManager } from "./marble-manager";
import LevelLoaderWorker from "./level-loader.worker";
import * as config from "./config";

const _GLTFLoader = new GLTFLoader();
const _DRACOLoader = new DRACOLoader();
_DRACOLoader.setDecoderPath("dist/libs/draco/");
_GLTFLoader.setDRACOLoader(_DRACOLoader);

function MarbleLevel() { // "Map" is taken. This comment is left here in memory of "MarbleMap"
	this.scene = new Scene();
	this.levelObjects = new Scene(); // Scene for all loaded level objects
	this.scene.add(this.levelObjects);
	this.startingGates = [];

	// Ambient light
	let ambientLight = new AmbientLight(0x746070, 1);
	this.scene.add(ambientLight);

	// Sky + Sunlight
	this.sky = new Sky();
	this.scene.add(this.sky.group);

	// Water
	this.water = new Water(this, this.sky.sunLight);
	this.scene.add(this.water.waterObject);
	this.sky.water = this.water;

	// Level Data
	this.levelName = null;
	this.authorName = null;

	// Loading events
	this.eventTarget = new EventTarget(); // TODO: Make this a proper class, so we can use `MarbleLevel extends EventTarget`?
	this.events = {
		loadStart: new Event("loadStart"),
		downloadStart: new Event("downloadStart"),
		downloadComplete: new Event("downloadComplete"),
		loadComplete: new Event("loadComplete"),
		error: new Event("error")
	};

	// Loader thread handle
	this.loader = null;

	// Load default level properties
	this.loadLevel(new LevelData());
}

MarbleLevel.prototype.update = function(deltaTime) {
	this.water.update(deltaTime);
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

// Fetches and loads the level asynchronously. Returns a Promise that resolves when loading is complete
MarbleLevel.prototype.loadLevelFromUrl = function(url) {
	if(this.loader) {
		console.warn(`Can't load ${url} because this MarbleLevel is already loading a level.`);
		return Promise.resolve();
	}
	this.loader = new LevelLoaderWorker();
	return new Promise( (resolve, reject) => {
		this.loader.onmessage = (result) => {
			if (result.data.event) {
				this.eventTarget.dispatchEvent(this.events[result.data.event]);
			} else if (result.data.success) {
				let loadedLevel = result.data.payload;
				Object.setPrototypeOf(loadedLevel, LevelData.prototype);
				resolve(loadedLevel);
			} else {
				reject(result.data.payload);
			}
		};
		this.loader.onerror = (error) => {
			reject(error.message);
		};
		this.loader.postMessage({url});
	}).then( (result) => {
		this.loader.terminate();
		this.loader = null;
		this.eventTarget.dispatchEvent(this.events.loadComplete);
		return this.loadLevel(result);
	}).catch( (error) => {
		this.loader.terminate();
		this.loader = null;
		this.eventTarget.dispatchEvent(this.events.error);
		console.error(`Level loading failed: ${error}`);
		return "failed";
	});
};

// Parses the level data and returns a Promise that resolves once it is fully done loading
MarbleLevel.prototype.loadLevel = function(data) {
	// Exit early if there is no data to be parsed
	if (!data) return;

	// Reset loaded data if there is any
	this.scene.remove(this.levelObjects);
	this.startingGates = [];
	this.levelObjects = new Scene();
	// this.levelObjects.matrixAutoUpdate = false;
	// this.levelObjects.autoUpdate = false;
	this.scene.add(this.levelObjects);

	// Load environmental variables
	this.water.setHeight(data.world.waterLevel);
	this.sky.recalculate({ inclination: data.world.sunInclination });

	// Set level meta data
	this.levelName = data.levelName;
	this.authorName = data.authorName;

	// Load textures
	let textures = {};
	for (let textureUuid in data.textures) {
		textures[textureUuid] = new TextureLoader().load(data.textures[textureUuid].file);
		textures[textureUuid].wrapS = textures[textureUuid].wrapT = THREE_REPEAT_WRAPPING;
	}

	// Load materials
	let materials = {};
	for (let materialUuid in data.materials) {
		// For each material property that uses a texture, set the appropriate texture in the data so it can be used by CustomMaterial
		let textureProperties = ["diffuse-a", "diffuse-b", "mask", "normal-a", "normal-b"];
		for (let property of textureProperties) {
			let materialProperty = data.materials[materialUuid][property];
			if (materialProperty.textureUuid) {
				materialProperty.texture = textures[materialProperty.textureUuid];
			} else {
				data.materials[materialUuid][property] = null;
			}
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
			materials[materialUuid].needsUpdate = true;
		} catch (error) {
			console.warn(error);
		}
	}

	// Prepare lookup table for models
	let levelObjects = {};

	// Helper function
	let matrixFromTransform = (
		position = {x: 0, y: 0, z: 0},
		rotation = {x: 0, y: 0, z: 0, w: 1},
		scale = {x: 1, y: 1, z: 1 }
	) => {
		let matrix = new Matrix4();
		matrix.compose(
			new Vector3(position.x, position.y, position.z),
			new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w),
			new Vector3(scale.x, scale.y, scale.z)
		);
		return matrix;
	};

	for (let object of Object.values(data.worldObjects)) {
		let objectMatrix = matrixFromTransform(object.position, object.rotation, undefined);
		for (let entity of Object.values(data.prefabs[object.prefab].entities)) {
			let entityMatrix = matrixFromTransform(entity.position, entity.rotation, entity.scale);
			let finalMatrix = new Matrix4();
			finalMatrix.multiplyMatrices(objectMatrix, entityMatrix);
			if (levelObjects[entity.model] === undefined) {
				levelObjects[entity.model] = {
					matrices: [],
					instancedChildMeshes: []
				};
			}
			levelObjects[entity.model].matrices.push(finalMatrix);
		}
	}

	// for (let childMesh of models[entity.model]) {
	// 	childMesh.setMatrixAt(modelUses[entity.model].current++, finalMatrix);
	// 	//console.log(modelUses[entity.model].current, modelUses[entity.model].total);
	// }

	// Load models
	// apply custom materials where appropriate
	// create instanced mesh for every childMesh
	let traverseChildMeshes = (obj, childMeshes, modelName, index = 0) => {
		let children = [];

		if (obj.type === "Mesh") {
			if (materials[childMeshes[index].material] != null) {
				obj.material = materials[childMeshes[index].material];
			}
			obj.castShadow = config.graphics.castShadow.level;
			obj.receiveShadow = config.graphics.receiveShadow.level;

			// Instance
			let instancedMesh = new InstancedMesh(
				obj.geometry,
				obj.material,
				levelObjects[modelName].matrices.length
			);

			if (obj.material && obj.material.map) {
				instancedMesh.customDepthMaterial = new MeshDepthMaterial({
					map: obj.material.map,
					depthPacking: THREE_RGBA_DEPTH_PACKING,
					alphaTest: .5
				});
			}
			instancedMesh.frustumCulled = false;
			instancedMesh.castShadow = true;
			instancedMesh.receiveShadow = true;
			this.levelObjects.add(instancedMesh);
			levelObjects[modelName].instancedChildMeshes.push(instancedMesh);

			index++;
		}

		for (let c = 0; c < obj.children.length; c++) {
			children = children.concat(
				traverseChildMeshes(obj.children[c], childMeshes, modelName, index)
			);
		}
		return children;
	};

	let modelPromises = [];
	for (let modelName in data.models) {
		let modelPromise = new Promise((resolve, reject) => {
			try {
				// Parse model data
				_GLTFLoader.parse(data.models[modelName].file, null,
					(model) => {
						resolve(model);
					}, function(error) {
						reject(error);
					}
				);
			}
			catch (error) {
				// Invalid JSON/GLTF files end up here
				reject(error);
			}
		}).then((model) => {
			if (data.models[modelName].childMeshes.length > 0) {
				traverseChildMeshes(model.scene, data.models[modelName].childMeshes, modelName);
			} else {
				return Promise.reject("Model doesn't have any childMeshes?");
			}

			for (let i = 0; i < levelObjects[modelName].matrices.length; i++) {
				for (let childMesh of levelObjects[modelName].instancedChildMeshes) {
					childMesh.setMatrixAt(i, levelObjects[modelName].matrices[i]);
					childMesh.updateMatrix();
					childMesh.matrixAutoUpdate = false;
				}
			}
		}).catch((error) => {
			console.warn(`Unable to load model (${modelName}), using fallback model instead`, error);
		});

		modelPromises.push(modelPromise);
	}

	// When everything is done
	return Promise.all(modelPromises).then(() => {
		// Update shadow map
		renderCore.updateShadowMap();

		return 0;
	}).catch((error) => {
		console.error(error);
		return 1;
	});
};

// Water
function Water(parent, sunLight, waterLevel = 0, fog = false) {
	this.parent = parent; // The owning MarbleLevel
	let geometry = this.geometry = new PlaneBufferGeometry(10000, 10000);

	this.waterObject = new ThreeWater(
		geometry,
		{
			textureWidth: 512,
			textureHeight: 512,
			waterNormals: new TextureLoader().load("resources/textures/waternormals.jpg", function(texture) {
				texture.wrapS = texture.wrapT = THREE_REPEAT_WRAPPING;
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
	let originalOnBeforeRender = this.waterObject.onBeforeRender;
	this.waterObject.onBeforeRender = function(renderer, scene, camera) {
		if(!renderCore.waterReflectsLevel()) parent.levelObjects.visible = false;
		if(!renderCore.waterReflectsMarbles()) marbleManager.marbleGroup.visible = false;
		camera.layers.disable(renderCore.SPRITE_LAYER);

		originalOnBeforeRender(renderer, scene, camera);

		parent.levelObjects.visible = true;
		marbleManager.marbleGroup.visible = true;
		camera.layers.enable(renderCore.SPRITE_LAYER);
	};
}

Water.prototype.setHeight = function(newHeight) {
	this.waterObject.position.y = newHeight;
};

Water.prototype.update = function(deltaTime) {
	this.waterObject.material.uniforms.time.value += deltaTime;
};

// Skybox
function Sky(parameters = {}) {
	// Wrapper group for all entities related to the sky
	this.group = new Group();
	this.skyObject = new ThreeSky();
	this.skyObject.scale.setScalar(10000);
	this.group.add(this.skyObject);

	// Light
	let sunLight = this.sunLight = new DirectionalLight(0xf5d0d0, 2.5);
	sunLight.castShadow = true;

	this.group.add(sunLight);

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
	this.recalculate();
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
	this.sunLight.shadow.bias = -0.00005;
	this.sunLight.shadow.camera.near = 3500;
	this.sunLight.shadow.camera.far = 4200;
	this.sunLight.shadow.camera.left = -69;
	this.sunLight.shadow.camera.right = 60;
	this.sunLight.shadow.camera.top = 60;
	this.sunLight.shadow.camera.bottom = -30;

	if (this.water) {
		this.water.waterObject.material.uniforms.sunDirection.value.copy(this.sunLight.position).normalize();
	}
};

Sky.prototype.toggleDebugHelper = function(state) {
	if (!this.shadowHelper && state) this.shadowHelper = new CameraHelper(this.sunLight.shadow.camera);
	if (state) {
		this.group.add(this.shadowHelper);
	} else if (this.shadowHelper) {
		this.group.remove(this.shadowHelper);
	}
};


let levelManager = function() {
	return {
		activeLevel: null,

		initialize: function() {
			this.setActiveLevel(new MarbleLevel());
		},

		// Set a new active level
		setActiveLevel: function(marbleLevel) {
			if (this.activeLevel) {
				renderCore.mainScene.remove(this.activeLevel.scene);
			}
			this.activeLevel = marbleLevel;
			renderCore.mainScene.add(this.activeLevel.scene);
		}
	};
}();

export {
	levelManager
};
