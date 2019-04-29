import * as THREE from "three";
import "three/examples/js/loaders/LoaderSupport";
import "three/examples/js/loaders/GLTFLoader";
import * as pako from "pako";
import { Map, animationUpdateFunctions, updateMarbleMeshes } from "../render/render-core";
import { net as networking } from "./networking";
import * as config from "../config";

const _GLTFLoader = new THREE.GLTFLoader();

animationUpdateFunctions.push(function() {
	updateMarbleMeshes(
		networking.marblePositions,
		networking.marbleRotations,
		networking.lastUpdate
	);

	if (networking.lastUpdate < 1.5) {
		// FPS assumed to be 60, replace with fps when possible, or better: base it on real time.
		networking.lastUpdate += (config.network.tickrate / 60 / config.network.ticksToLerp);
	}
});

/**
 * Parses the map data and returns a Promise that resolves once it is fully done loading
 */
Map.prototype.parseData = function() {
	if (typeof this.data === "undefined") {
		console.warn("Set `Map.data` before trying to parse it.");
	}

	// Load models
	let modelPromises = {};
	for (let modelName in this.data.models) {
		modelPromises[modelName] = new Promise((resolve, reject) => {
			try {
				_GLTFLoader.parse(this.data.models[modelName].file, null,
					function(model) {
						resolve(model.scene);
					}, function(error) {
						console.warn(`Unable to load model (${modelName})`, error);
						reject("error");
					}
				);
			}
			catch (error) {
				// Invalid JSON/GLTF files may end up here
				console.warn(`Unable to load model (${modelName})`, error);
				reject("error");
			}
		});
	}

	// Load prefabs
	let prefabPromises = {};
	return Promise.all(Object.values(modelPromises)).then(() => {
		for (let prefabUuid in this.data.prefabs) {
			prefabPromises[prefabUuid] = new Promise((resolve) => {
				let group = new THREE.Group();

				for (let entity of Object.values(this.data.prefabs[prefabUuid].entities)) {
					if (entity.type === "object" && entity.model) {
						modelPromises[entity.model].then((scene) => {
							let clone = scene.clone();

							clone.position.copy(new THREE.Vector3(entity.position.x, entity.position.y, entity.position.z));
							clone.setRotationFromQuaternion(new THREE.Quaternion(entity.rotation.x, entity.rotation.y, entity.rotation.z, entity.rotation.w));
							clone.scale.copy(new THREE.Vector3(entity.scale.x, entity.scale.y, entity.scale.z));
							group.add(clone);
						});
					}
				}

				resolve(group);
			});
		}
	}).then(() => {
		return Promise.all(Object.values(prefabPromises)).then(() => {
			for (let object of Object.values(this.data.worldObjects)) {
				prefabPromises[object.prefab].then((prefabGroup) => {
					let clone = prefabGroup.clone();
					clone.position.copy(new THREE.Vector3(object.position.x, object.position.y, object.position.z));
					clone.setRotationFromQuaternion(new THREE.Quaternion(object.rotation.x, object.rotation.y, object.rotation.z, object.rotation.w));
					this.scene.add(clone);
				});
			}
		});
	});
};

let addMap = function(mapName) {
	fetch(`/resources/maps/${mapName}.mmc`)
		.then((response) => {
			// Return as a buffer, since .text() tries to convert to UTF-8 which is undesirable for compressed data
			return response.arrayBuffer();
		})
		.then((buffer) => {
			try {
				let mapData = pako.inflate(buffer);
				mapData = new TextDecoder("utf-8").decode(mapData);
				mapData = JSON.parse(mapData);

				let map = new Map(mapData);
				map.addToWorld();
				map.parseData();
			}
			catch (error) {
				console.error(error);
				return;
			}
		});
};

export {
	addMap
};
