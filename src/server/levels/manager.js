const fs = require("fs").promises;
const log = require("../../log");
const levelIO = require("../../level/level-io");
const physics = require("../../physics/manager");

const levelManager = function() {
	// Level builder helper function
	let _transformFromEntity = function(entity) {
		let transform = new physics.ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(
			new physics.ammo.btVector3(
				entity.position.x,
				entity.position.y,
				entity.position.z
			)
		);
		transform.setRotation(
			new physics.ammo.btQuaternion(
				entity.rotation.x,
				entity.rotation.y,
				entity.rotation.z,
				entity.rotation.w
			)
		);

		return transform;
	};

	// Parses level data and loads it as their appropriate physics colliders
	let _buildLevel = function(levelData) {
		// Clear previous level data, if any
		physics.world.clearColliders();
		physics.clearShapes();

		for(let key in levelData.models) {
			let model = levelData.models[key];
			if(model.convexData) {
				physics.createConvexShape(key, model.convexData);
			}
			if(model.concaveData) {
				physics.createConcaveShape(key, model.concaveData.vertices, model.concaveData.indices);
			}
		}

		physics.world.setGravity(levelData.gameplay.gravity);

		for (let worldObjectUuid in levelData.worldObjects) {
			let worldEntity = levelData.worldObjects[worldObjectUuid];
			let prefab = levelData.prefabs[levelData.worldObjects[worldObjectUuid].prefab];

			for (let prefabEntityUuid in prefab.entities) {
				let prefabEntity = prefab.entities[prefabEntityUuid];

				if(prefabEntity.type !== "collider") continue;

				let worldEntityTransform = _transformFromEntity(worldEntity);
				let prefabEntityTransform = _transformFromEntity(prefabEntity);

				// Clone the transform because op_mul modifies the transform it is called on
				let transform = new physics.ammo.btTransform();
				transform.setIdentity();
				transform.setOrigin(worldEntityTransform.getOrigin());
				transform.setRotation(worldEntityTransform.getRotation());

				transform.op_mul(prefabEntityTransform); // Modifies "transform"

				physics.world.createCollider(prefabEntity, transform);
			}
		}
	};

	return {
		availableLevels: null,
		currentLevel: null,

		/**
		 * Scan for available levels in the resource folder
		 */
		retrieveLevels(performValidation = true) {
			return fs.readdir(`${__dirname}/../../../public/resources/levels`)
				.then((files) => {
					// Only read files that have the correct extension
					let levelFiles = files.filter(file => file.endsWith(".mms"));

					// Remove file extensions
					// Server and client add their extensions on load
					for(let i = 0; i < levelFiles.length; i++) {
						levelFiles[i] = levelFiles[i].slice(0, levelFiles[i].length - 4);
					}

					let validationPromises = [];

					// Optional check to detect and remove invalid levels before populating the level list
					if(performValidation) {
						/*
						ValidationPromises
							Promise.all: [Level]
								Promise: Validate [Level].mms
								Promise: Validate [Level].mmc
							resolve: returns [Level]
							reject: returns null (does resolve though)
						resolve: Filters out null, rejects if 0 levels
						*/
						for(let i = 0; i < levelFiles.length; i++) {
							validationPromises.push(
								Promise.all([
									fs.readFile(`${__dirname}/../../../public/resources/levels/${levelFiles[i]}.mms`)
										.then((fileBuffer) => {
											let level = levelIO.load(fileBuffer);
											if(!level)
												return Promise.reject("Invalid server-side level");
											if(level.type !== "levelServer")
												return Promise.reject(`Export type mismatch (expected "levelServer" but got "${level.type}")`);
											return levelFiles[i];
										})
										.catch((error) => {
											return Promise.reject(error);
										})
									,
									fs.readFile(`${__dirname}/../../../public/resources/levels/${levelFiles[i]}.mmc`)
										.then((fileBuffer) => {
											let level = levelIO.load(fileBuffer);
											if(!level)
												return Promise.reject("Invalid client-side level");
											if(level.type !== "levelClient")
												return Promise.reject(`Export type mismatch (expected "levelClient" but got "${level.type}")`);
											return levelFiles[i];
										})
										.catch((error) => {
											return Promise.reject(error);
										})
								])
									.then(() => {
										return levelFiles[i];
									})
									.catch((error) => {
										log.warn(`Level "${levelFiles[i]}" removed from available levels: ${error}`);
										return Promise.resolve(null);
									})
							);
						}
						return Promise.all(validationPromises);
					} else {
						return Promise.resolve(levelFiles);
					}
				})
				.then((validLevels) => {
					validLevels = validLevels.filter(level => level !== null);
					if(validLevels.length === 0)
						return Promise.reject("No levels found.");

					if(performValidation)
						log.info("LevelManager: Level validation checks complete!".green);
					log.info(`LevelManager: ${validLevels.length} valid level${validLevels.length === 1 ? "" : "s"} found:`.green);
					for(let i = 0; i < validLevels.length; i++) {
						log.info(`- ${validLevels[i]}`.green);
					}
					this.availableLevels = validLevels;
				})
				.catch((error) => {
					log.error(error);
				});
		},

		/**
		 * Loads the level based on name
		 */
		loadLevel(levelName) {
			return fs.readFile(`${__dirname}/../../../public/resources/levels/${levelName}.mms`)
				.then((fileBuffer) => {
					let level = levelIO.load(fileBuffer);
					if(!level) {
						return Promise.reject(`Level "${levelName}" is invalid.`);
					}
					_buildLevel(level);
					this.currentLevel = level;
					return level;
				})
				.catch((error) => {
					log.error(`Failed to parse level file (${levelName})`, error);
					return Promise.resolve(null);
				});
		}
	};
}();

module.exports = levelManager;
