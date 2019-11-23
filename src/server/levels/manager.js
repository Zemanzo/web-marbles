const fs = require("fs").promises;
const log = require("../../log");
const levelIO = require("../../level/level-io");

// Scan for levels
function retrieveLevels() {
	return fs.readdir("public/resources/levels")
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
}

function loadLevel(levelName) {
	return fs.readFile(`public/resources/levels/${levelName}.mms`)
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
