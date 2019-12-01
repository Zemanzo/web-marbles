import * as levelIO from "../level/level-io";

onmessage = function(message) {
	loadLevelData(message.data.url);
};

let loadLevelData = function(url) {
	postMessage({ event: "downloadStart" });
	fetch(`${url}`)
		.then((response) => {
			if(response.ok) {
				postMessage({ event: "downloadComplete" });
				return response.arrayBuffer();
			} else {
				loadingFinished(false, `Unable to retrieve ${url} from server: ${response.status} - ${response.statusText}`);
				return false;
			}
		})
		.then((buffer) => {
			if(buffer) {
				let levelData = levelIO.load(buffer);
				if(levelData === null) {
					loadingFinished(false, "Failed to load level data.");
				} else {
					// Replace hashes back with their original data.
					for (let uuid in levelData.models) {
						let model = levelData.models[uuid],
							hashStartIndex = 0,
							hashEndIndex,
							hash;
						while (hashStartIndex !== -1) {
							// Using string methods because it is faster than regex or parsing the whole file as JSON.
							hashStartIndex = model.file.indexOf("data:hash/md5;", hashStartIndex);
							if (hashStartIndex !== -1) {
								hashEndIndex = model.file.indexOf("\"", hashStartIndex);
								hash = model.file.slice(hashStartIndex + 14, hashEndIndex); // Set it to the start of the hash
								let replacement = levelData.modelBuffers[hash];
								model.file = `${model.file.slice(0, hashStartIndex)}${replacement}${model.file.slice(hashEndIndex)}`;
							}
						}
						levelData.models[uuid].file = model.file;
						console.log(model.file);
					}
					loadingFinished(true, levelData);
				}
			}
		})
		.catch( (error) => {
			console.log(error);
			loadingFinished(false, "An unknown error occurred.");
		});
};

function loadingFinished(success, payload) {
	postMessage({
		success,
		payload
	});
}
