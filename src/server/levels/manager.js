const fs = require("fs");
const config = require("../config");
const log = require("../../log");
const levelLoader = require("../../level/manager");

// Scan for levels
function retrieveLevels() {
	return new Promise((resolve, reject) => {
		fs.readdir(config.levels.folderPath,
			undefined,
			function(error, files) {
				if (files && Array.isArray(files)) {
					// Only read files that have the correct extension
					let levelFiles = files.filter(file => file.endsWith(".mms"));

					// Remove file extensions
					// Server and client add their extensions on load
					for(let i = 0; i < levelFiles.length; i++) {
						levelFiles[i] = levelFiles[i].slice(0, levelFiles[i].length - 4);
					}
					if (levelFiles.length > 0) {
						return resolve(levelFiles);
					}
				}

				log.error("No files found");
				reject("No files found");
			}
		);
	});
}

function loadLevel(levelName) {
	return new Promise((resolve, reject) => {
		fs.readFile(`${config.levels.folderPath}/${levelName}.mms`, function(error, fileBuffer) {
			try {
				let level = levelLoader.load(fileBuffer);
				if(typeof level === "string") {
					console.log(`Unable to load ${levelName}.mms: ${level}`);
					reject(level);
				}
				resolve(level);
			}
			catch (error) {
				log.error("Failed to parse level file", error);
				reject(error);
			}
		});
	});
}

let loadedLevels = retrieveLevels()
	.then((levels) => {
		return levels;
	});

let currentLevelName = loadedLevels
	.then((levels) => {
		return levels[0];
	});

let currentLevelData = loadedLevels
	.then((levels) => {
		return loadLevel(levels[0]);
	});

module.exports = {
	loadedLevels,
	currentLevelName,
	currentLevelData
};

// Not-module initialization that has no business happening here
require("./level-builder");
