import * as levelIO from "../level/level-io";

onmessage = function(message) {
	loadLevelData(message.data.url);
};

let loadLevelData = function(url) {
	fetch(`${url}`)
		.then((response) => {
			if(response.ok) {
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
					loadingFinished(true, levelData);
				}
			}
		}).catch( (error) => {
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
