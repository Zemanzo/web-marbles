const pako = require("pako");
const fs = require("fs");
const config = require("../config");
const log = require("../../log");
const build = require("./build");

// Scan for maps
function retrieveMaps() {
	return new Promise((resolve, reject) => {
		fs.readdir(config.maps.folderPath,
			undefined,
			function(error, files) {
				console.log(config.maps.folderPath, files);

				if (files && Array.isArray(files)) {
					// Only read files that have the correct extension
					let mapFiles = files.filter(file => file.endsWith(".mmp") || file.endsWith(".mmb"));
					if (mapFiles.length > 0) {
						return resolve(mapFiles);
					}
				}

				log.error("No files found");
				reject("No files found");
			}
		);
	});
}

function loadMap(mapName) {
	return new Promise((resolve, reject) => {
		fs.readFile(`${config.maps.folderPath}/${mapName}`, function(error, fileBuffer) {
			try {
				let map = JSON.parse(
					pako.inflate(fileBuffer, { to: "string" })
				);
				resolve(map);
			}
			catch (error) {
				log.error("Failed to parse map file", error);
				reject(error);
			}
		});
	});
}

module.exports = function() {
	let currentMap = retrieveMaps()
		.then((maps) => {
			return loadMap(maps[0]);
		}).then((map) => {
			return build(map);
		});

	return {
		retrieveMaps,
		loadMap,
		currentMap
	};
}();
