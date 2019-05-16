const Level = require("./level");
const pako = require("pako");
const semver = require("semver");

module.exports = function() {
	return {
		getCurrentVersion() {
			return new Level().version;
		},

		// Loads a level based on the given file data.
		// Return a Level object on success, or an error string on failure.
		load(fileData) {
			let loadedLevel;
			try {
				let data = pako.inflate(fileData, { to: "string" });
				loadedLevel = JSON.parse(data);
			}
			catch(error) {
				return "Invalid level file.";
			}

			// Project without these aren't considered valid
			if(typeof loadedLevel.models !== "object"
				|| typeof loadedLevel.prefabs !== "object"
				|| typeof loadedLevel.worldObjects !== "object"
				|| typeof loadedLevel.gameplay !== "object"
				|| typeof loadedLevel.world !== "object") {
				return "Missing level properties.";
			}

			if(!semver.valid(loadedLevel.version)) {
				console.warn("Loaded level has no valid version attached. Lowest level version is assumed.");
				loadedLevel.version = "0.1.0";
				loadedLevel.type = "project";
			}
			if(semver.lt(loadedLevel.version, "0.1.1")) {
				loadedLevel.levelName = loadedLevel.mapName;
				delete loadedLevel.mapName;
			}
			if(semver.lt(loadedLevel.version, "0.2.0")) {
				delete loadedLevel.gameplay.defaultEnterPeriod;
				delete loadedLevel.gameplay.timeUntilDnf;
				loadedLevel.gameplay.gravity = 10;
			}
			if(semver.lt(loadedLevel.version, "0.2.1")) {
				loadedLevel.exportDate = 0;
			}

			if(semver.lt(loadedLevel.version, this.getCurrentVersion())) {
				console.log(`Converted level from v${loadedLevel.version} to v${this.getCurrentVersion()}`);
				loadedLevel.version = this.getCurrentVersion();
			} else if(semver.gt(loadedLevel.version, this.getCurrentVersion())) {
				console.warn(`Loaded level version (${loadedLevel.version}) is higher than the supported version (${this.getCurrentVersion()})!`);
			}

			Object.setPrototypeOf(loadedLevel, Level.prototype);
			loadedLevel.validateLevel();
			return loadedLevel;
		},

		prepareExport(project, exportType, exportDate) {
			if(exportType === "publishServer") {
				// Remove raw model data
				for(let key in project.models) {
					let model = project.models[key];
					delete model.file;

					// Remove unused collider data
					let usesConvex = false;
					let usesConcave = false;
					for(let prefabUuid in project.prefabs) {
						for(let ent in project.prefabs[prefabUuid].entities) {
							let entity = project.prefabs[prefabUuid].entities[ent];
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
				for(let key in project.models) {
					let model = project.models[key];
					delete model.convexData;
					delete model.concaveData;
				}
			}

			if(exportType !== "exportProject") {
				let entityToRemove = exportType === "publishClient" ? "collider" : "object";

				// Remove specific entity type in prefabs
				for(let key in project.prefabs) {
					let prefab = project.prefabs[key];
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
						delete project.prefabs[key];
					}
				}
				// Remove world objects that use removed prefabs
				for(let key in project.worldObjects) {
					let obj = project.worldObjects[key];
					if(!project.prefabs[obj.prefab]) {
						delete project.worldObjects[key];
					}
				}

				// Remove all unused prefabs
				let unusedPrefabs = Object.keys(project.prefabs);
				for(let key in project.worldObjects) {
					let index = unusedPrefabs.indexOf(project.worldObjects[key].prefab);
					if(index !== -1) {
						unusedPrefabs.splice(index, 1);
					}
				}
				for(let i = 0; i < unusedPrefabs.length; i++) {
					delete project.prefabs[unusedPrefabs[i]];
				}

				// Remove all unused models
				let unusedModels = Object.keys(project.models);
				for(let key in project.prefabs) {
					let prefab = project.prefabs[key];
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
					delete project.models[unusedModels[i]];
				}
			}

			switch(exportType) {
			case "exportProject":
				project.type = "project";
				break;
			case "publishClient":
				project.type = "levelClient";
				break;
			case "publishServer":
				project.type = "levelServer";
				break;
			}
			project.exportDate = exportDate;
			return project;
		}
	};
}();
