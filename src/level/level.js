function Level() {
	this.levelName = "New level";
	this.authorName = "Unknown";
	this.version = "0.3.0";
	this.type = "project";
	this.exportDate = 0;

	this.gameplay = {
		gravity: 10,
		roundLength: 160
	};

	this.textures = {};
	this.materials = {};
	this.models = {};
	this.prefabs = {};
	this.worldObjects = {};

	this.world = {
		waterLevel: -9,
		sunInclination: 0.25
	};
}

Level.prototype.addTexture = function(uuid, fileContents) {
	this.textures[uuid] = {
		file: fileContents
	};
	return this.textures[uuid];
};

Level.prototype.addMaterial = function(uuid) {
	this.materials[uuid] = {
		entities: {},
		"diffuse-a": {},
		"diffuse-b": {},
		mask: {},
		"normal-a": {},
		"normal-b": {},
		side: 0, // THREE.FrontSide, but to avoid importing the entire THREE library for just this...
		roughness: .5,
		metalness: .5
	};
	return this.materials[uuid];
};

Level.prototype.addModel = function(name, fileContents) {
	this.models[name] = {
		file: fileContents,
		childMeshes: [],
		convexData: null,
		concaveData: {
			indices: null,
			vertices: null
		}
	};
	return this.models[name];
};

Level.prototype.addPrefab = function(uuid) {
	this.prefabs[uuid] = {
		entities: {}
	};
	return this.prefabs[uuid];
};

Level.prototype.addWorldObject = function(uuid, prefabUuid) {
	this.worldObjects[uuid] = {
		prefab: prefabUuid
	};
	return this.worldObjects[uuid];
};

Level.prototype.getLevelId = function() {
	return `${this.levelName}_${this.exportDate}`;
};

// Returns true if level is considered valid, false on failure.
// If properties are missing or of the wrong type, it should attempt to reset them if possible (and warn the user)
Level.prototype.validateLevel = function() {
	// A level without these aren't considered valid
	if(typeof this.models !== "object"
	|| typeof this.prefabs !== "object"
	|| typeof this.worldObjects !== "object"
	|| typeof this.gameplay !== "object"
	|| typeof this.world !== "object") {
		console.error("Level validation failed: Missing vital level properties");
		return false;
	}

	try {
		// Helper function that compares properties
		// If compareObjectProperties is true, will recursively check subobjects
		let validateObject = function(source, template, removeUnused, compareObjectProperties = false) {
			for(let key in template) {
				if(typeof template[key] === "function") continue; // Ignore functions
				if(typeof source[key] !== typeof template[key]) {
					source[key] = template[key];
					console.warn(`Level validation: Reset value for "${key}"`);
				}
				if(typeof template[key] === "object" && compareObjectProperties) {
					validateObject(source[key], template[key], removeUnused, compareObjectProperties);
				}
			}
			if(removeUnused) {
				for(let key in source) {
					if(typeof source[key] !== typeof template[key]) {
						delete source[key];
						console.warn(`Level validation: Removed unused property "${key}"`);
					}
				}
			}
		};

		// Check main properties + world/gameplay params
		let template = new Level();
		validateObject(this, template, true);
		validateObject(this.world, template.world, true);
		validateObject(this.gameplay, template.gameplay, true);

		// Validate model properties
		for(let modelName in this.models) {
			let model = this.models[modelName];
			if(this.type !== "levelServer") {
				if(typeof model.file !== "string") {
					console.error(`Level validation failed: ${modelName}'s file data type is incorrect.`);
					return false;
				}
			} else {
				if (model.childMeshes) {
					if (!Array.isArray(model.childMeshes)) {
						console.error(`Level validation failed: ${modelName}'s childMesh data is incorrect.`);
						return false;
					}
				}
				if(model.convexData) {
					if(!Array.isArray(model.convexData)
						|| typeof model.convexData[0] !== "number") {
						console.error(`Level validation failed: ${modelName}'s convex data is incorrect.`);
						return false;
					}
				}
				if(model.concaveData) {
					if(!Array.isArray(model.concaveData.vertices)
						|| typeof model.concaveData.vertices[0] !== "number"
						|| !Array.isArray(model.concaveData.indices)
						|| typeof model.concaveData.indices[0] !== "number") {
						console.error(`Level validation failed: ${modelName}'s concave data is incorrect.`);
						return false;
					}
				}
			}

			// Removing unused properties
			for(let key in this.models[modelName]) {
				switch(key) {
				case "file":
				case "convexData":
				case "concaveData":
				case "childMeshes":
					break;
				default:
					console.warn(`Level validation: Removed unused model property "${key}"`);
					delete model[key];
					break;
				}
			}
		}

		// Validate prefab properties
		let prefabTemplate = {
			name: "",
			color: "#000000",
			entities: {}
		};
		let prefabEntityTemplate = {
			name: "",
			type: "",
			functionality: "",
			position: {
				x: 0,
				y: 0,
				z: 0
			},
			rotation: {
				x: 0,
				y: 0,
				z: 0,
				w: 1
			}
		};
		let prefabObjectTemplate = {
			scale: {
				x: 1,
				y: 1,
				z: 1
			},
			model: ""
		};
		let prefabColliderTemplate = {
			colliderData: {
				shape: "undefinedShape"
			}
		};
		let boxShapeTemplate = {
			shape: "box",
			width: 1,
			height: 1,
			depth: 1
		};
		let sphereShapeTemplate = {
			shape: "sphere",
			radius: 1
		};
		let cylinderShapeTemplate = {
			shape: "cylinder",
			radius: 1,
			height: 1
		};
		let coneShapeTemplate = {
			shape: "cone",
			radius: 1,
			height: 1
		};
		for(let prefabUuid in this.prefabs) {
			let prefab = this.prefabs[prefabUuid];
			validateObject(prefab, prefabTemplate, true);

			for(let ent in prefab.entities) {
				let entity = prefab.entities[ent];

				validateObject(entity, prefabEntityTemplate, false, true); // Validate base
				if(entity.type === "object") {
					validateObject(entity, prefabObjectTemplate, false);
				} else if(entity.type === "collider") {
					validateObject(entity, prefabColliderTemplate, false);
					switch(entity.colliderData.shape) {
					case "box":
						validateObject(entity.colliderData, boxShapeTemplate, true);
						break;
					case "sphere":
						validateObject(entity.colliderData, sphereShapeTemplate, true);
						break;
					case "cylinder":
						validateObject(entity.colliderData, cylinderShapeTemplate, true);
						break;
					case "cone":
						validateObject(entity.colliderData, coneShapeTemplate, true);
						break;
					case "mesh":
						if( typeof entity.colliderData.convex !== "boolean"
							&& typeof entity.colliderData.convex !== "number"
							&& entity.colliderData.model !== null
							&& typeof entity.colliderData.model !== "string") {
							console.error("Level validation failed: Unable to verify mesh collider.");
							return false;
						}
						break;
					default:
						console.error(`Level validation failed: Unable to verify collider type ${prefab.colliderData.shape}.`);
						return false;
					}
				} else {
					console.error(`Level validation failed: Unknown prefab entity type "${prefab.type}"`);
					return false;
				}
			}
		}

		// Validate world object properties
		let worldObjectTemplate = {
			name: "",
			prefab: "",
			position: {
				x: 0,
				y: 0,
				z: 0
			},
			rotation: {
				x: 0,
				y: 0,
				z: 0,
				w: 1
			}
		};
		for(let uuid in this.worldObjects) {
			let worldObject = this.worldObjects[uuid];
			validateObject(worldObject, worldObjectTemplate, true, true);
			if(!this.prefabs[worldObject.prefab]) {
				console.error(`Level validation failed: World object [${uuid}]${worldObject.name} refers to unknown prefab [${worldObject.prefab}]`);
				return false;
			}
		}

		// Validate level requirements if it's a published level
		// Only levelServer requires these for gameplay purposes
		if(this.type === "levelServer") {
			let hasStartArea = false;
			let hasStartGate = false;
			let hasFinishLine = false;

			for(let uuid in this.worldObjects) {
				let worldObject = this.worldObjects[uuid];
				let prefab = this.prefabs[worldObject.prefab];
				for(let ent in prefab.entities) {
					let entity = prefab.entities[ent];
					if(entity.type !== "collider") continue; // Check colliders only
					switch(entity.functionality) {
					case "startarea":
						hasStartArea = true;
						break;
					case "startgate":
						hasStartGate = true;
						break;
					case "endarea":
						hasFinishLine = true;
						break;
					default:
						break;
					}
				}
			}
			if(!hasStartArea) {
				console.error("Level validation failed: Published level has no starting area.");
				return false;
			}
			if(!hasStartGate) {
				console.error("Level validation failed: Published level has no starting gate.");
				return false;
			}
			if(!hasFinishLine) {
				console.error("Level validation failed: Published level has no finish line.");
				return false;
			}
		}
	} catch(error) {
		console.error("Exception occurred during level validation:");
		console.error(error);
		return false;
	}
	return true;
};

module.exports = Level;
