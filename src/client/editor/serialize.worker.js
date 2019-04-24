import * as pako from "pako";

let serialize = {
	start: null
};

onmessage = function(message) {
	serialize.start = message.data.serializationStart || new Date();
	exportProject(message.data.payload, message.data.exportType, message.data.useCompression);
};

let exportProject = function(data, exportType, useCompression) {
	sendLog(`Payload received. (${(new Date()) - serialize.start}ms)`);

	try {
		let fileName = data.mapName;
		let extension = ".mmp";

		if(exportType === "publishServer") {
			extension = ".mms";
		} else if(exportType === "publishClient") {
			extension = ".mmc";
		}

		if(exportType === "publishServer") {
			// Remove raw model data
			for(let key in data.models) {
				let model = data.models[key];
				delete model.data;

				// Remove unused collider data
				let usesConvex = false;
				let usesConcave = false;
				for(let prefabUuid in data.prefabs) {
					for(let ent in data.prefabs[prefabUuid].entities) {
						let entity = data.prefabs[prefabUuid].entities[ent];
						if(entity.type !== "collider") continue;
						if(entity.colliderData.shape !== "mesh") continue;
						if(entity.colliderData.model !== key) continue;
						if(entity.colliderData.convex) {
							usesConvex = true;
						} else {
							usesConcave = true;
						}
					}
				}
				if(!usesConvex) delete model.convexData;
				if(!usesConcave) delete model.concaveData;
			}
		} else {
			// Remove collider data, can be regenerated on load for projects
			for(let key in data.models) {
				let model = data.models[key];
				delete model.convexData;
				delete model.concaveData;
			}
		}

		if(exportType !== "exportProject") {
			let entityToRemove = exportType === "publishClient" ? "collider" : "object";

			// Remove specific entity type in prefabs
			for(let key in data.prefabs) {
				let prefab = data.prefabs[key];
				for(let ent in prefab.entities) {
					if(prefab.entities[ent].type === entityToRemove) {
						delete prefab.entities[ent];
					} else {
						// Delete empty entities
						if(	prefab.entities[ent].type === "object"
							&& !prefab.entities[ent].model) {
							delete prefab.entities[ent];
						} else if( prefab.entities[ent].type === "collider"
									&& prefab.entities[ent].colliderData.shape === "mesh"
									&& !prefab.entities[ent].colliderData.model) {
							delete prefab.entities[ent];
						}
					}
				}
				// Remove prefab if empty
				if(Object.keys(prefab.entities).length === 0) {
					delete data.prefabs[key];
				}
			}
			// Remove world objects that use removed prefabs
			for(let key in data.worldObjects) {
				let obj = data.worldObjects[key];
				if(!data.prefabs[obj.prefab]) {
					delete data.worldObjects[key];
				}
			}

			// Remove all unused prefabs
			let unusedPrefabs = Object.keys(data.prefabs);
			for(let key in data.worldObjects) {
				let index = unusedPrefabs.indexOf(data.worldObjects[key].prefab);
				if(index !== -1) {
					unusedPrefabs.splice(index, 1);
				}
			}
			for(let i = 0; i < unusedPrefabs.length; i++) {
				delete data.prefabs[unusedPrefabs[i]];
			}

			// Remove all unused models
			let unusedModels = Object.keys(data.models);
			for(let key in data.prefabs) {
				let prefab = data.prefabs[key];
				for(let ent in prefab.entities) {
					let entity = prefab.entities[ent];

					if(entity.type === "object") {
						if("model" in entity) {
							let index = unusedModels.indexOf(entity.model);
							if(index !== -1) {
								unusedModels.splice(index, 1);
							}
						}
					} else if(entity.colliderData.shape === "mesh") {
						if("model" in entity.colliderData) {
							let index = unusedModels.indexOf(entity.colliderData.model);
							if(index !== -1) {
								unusedModels.splice(index, 1);
							}
						}
					}
				}
			}
			for(let i = 0; i < unusedModels.length; i++) {
				delete data.models[unusedModels[i]];
			}
		}

		// Converting to file-ready format
		data = JSON.stringify(data);
		sendLog(`File data prepared. (${(new Date()) - serialize.start}ms)`);

		if(useCompression) {
			let startLength = data.length;
			sendLog("Starting compression. (This might take a while...)");
			data = pako.deflate(data);
			let compressionRatio = Math.round((data.length / startLength) * 10000) * .01;
			sendLog(`Data compressed! (${compressionRatio}% of original) (${(new Date()) - serialize.start}ms)`);
		}

		let filetype = useCompression ? "application/octet-stream" : "application/json";
		let filename = `${fileName}${extension}`;
		let file = new File([data], filename, {type: filetype});
		let objectUrl = URL.createObjectURL(file);

		sendLog(`Serialization succesful! (${(new Date()) - serialize.start}ms)`, "success");
		postMessage({
			type: "publishSuccess",
			payload: {
				url: objectUrl,
				filename: filename
			}
		});
	}
	catch(error) {
		postMessage({
			type: "error",
			payload: error
		});
	}
};

function sendLog(message, type) {
	postMessage({
		type: "log",
		payload: {
			message: message,
			type: type
		}
	});
}
