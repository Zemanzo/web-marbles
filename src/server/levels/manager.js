const fs = require("fs").promises;
const log = require("../../log");
const levelIO = require("../../level/level-io");
const levelBuilder = require("./level-builder");

const levelManager = function() {
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
					levelBuilder(level);
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
