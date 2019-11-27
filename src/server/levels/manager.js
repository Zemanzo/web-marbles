const fs = require("fs").promises;
const log = require("../../log");
const levelIO = require("../../level/level-io");
const levelBuilder = require("./level-builder");

const levelManager = function() {
	return {
		loadedLevels: null,
		currentLevelName: null,
		currentLevelData: null,

		/**
		 * Scan for available levels in the resource folder
		 */
		retrieveLevels() {
			return fs.readdir(`${__dirname}/../../../public/resources/levels`)
				.then((files) => {
					if (files && Array.isArray(files)) {
						// Only read files that have the correct extension
						let levelFiles = files.filter(file => file.endsWith(".mms"));

						// Remove file extensions
						// Server and client add their extensions on load
						for(let i = 0; i < levelFiles.length; i++) {
							levelFiles[i] = levelFiles[i].slice(0, levelFiles[i].length - 4);
						}

						if (levelFiles.length > 0) {
							return levelFiles;
						}
						return Promise.reject("No files found");
					}
				})
				.catch((error) => {
					log.error(error);
				});
		},

		/**
		 * Read the level file based on name
		 */
		loadLevel(levelName) {
			return fs.readFile(`${__dirname}/../../../public/resources/levels/${levelName}.mms`)
				.then((fileBuffer) => {
					try {
						let level = levelIO.load(fileBuffer);
						if(!level) {
							return Promise.reject();
						}
						return level;
					}
					catch (error) {
						return Promise.reject(error);
					}
				})
				.catch((error) => {
					log.error(`Failed to parse level file (${levelName})`, error);
				});
		},

		/**
		 * Currently retrieves all levels, and loads the first one it finds
		 * TODO: Think if loading the first match is desired, and how this will fit in with level rotation.
		 */
		initialize() {
			this.loadedLevels = this.retrieveLevels()
				.then((levels) => {
					return levels;
				});

			this.currentLevelName = this.loadedLevels
				.then((levels) => {
					return levels[0];
				});

			this.currentLevelData = this.loadedLevels
				.then((levels) => {
					let firstLevel = this.loadLevel(levels[0]);
					firstLevel.then((levelData) => {
						levelBuilder(levelData);
					});
					return firstLevel;
				});
		}
	};
}();

module.exports = levelManager;
