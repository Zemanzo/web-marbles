import * as pako from "pako";

let serialize = {
	start: null
};

onmessage = function(message) {
	serialize.start = message.data.serializationStart || new Date();
	exportProject(message.data.payload, message.data.exportAsLevel, message.data.useCompression);
};

let exportProject = function(data, exportAsLevel, useCompression) {
	sendLog(`Payload received. (${(new Date()) - serialize.start}ms)`);

	try {
		let fileName = data.mapName;

		if(exportAsLevel) {
			// Remove all unused prefabs
			let unusedPrefabs = Object.keys(data.prefabs);
			for(let key in data.worldObjects) {
				let index = unusedPrefabs.indexOf(data.worldObjects[key].prefab);
				if(index !== -1) {
					unusedPrefabs.splice(index, 1);
				}
			}
			for(let i = 0; i < unusedPrefabs.length; i++) {
				delete data.prefabs[unusedPrefabs[i]];
			}

			// Remove all unused models
			let unusedModels = Object.keys(data.models);
			for(let key in data.prefabs) {
				let prefab = data.prefabs[key];
				for(let ent in prefab.entities) {
					let entity = prefab.entities[ent];
					if("model" in entity) {
						let index = unusedModels.indexOf(entity.model);
						if(index !== -1) {
							unusedModels.splice(index, 1);
						}
					}
				}
			}
			for(let i = 0; i < unusedModels.length; i++) {
				delete data.models[unusedModels[i]];
			}
		}

		// Converting to file-ready format
		data = JSON.stringify(data);
		sendLog(`File data prepared. (${(new Date()) - serialize.start}ms)`);

		if(useCompression) {
			let startLength = data.length;
			sendLog("Starting compression. (This might take a while...)");
			data = pako.deflate(data);
			let compressionRatio = Math.round((data.length / startLength) * 10000) * .01;
			sendLog(`Data compressed! (${compressionRatio}% of original) (${(new Date()) - serialize.start}ms)`);
		}

		let extension = useCompression ? ".mmb" : ".mmp";
		let filetype = useCompression ? "application/octet-stream" : "application/json";
		let filename = `${fileName}${extension}`;
		let file = new File([data], filename, {type: filetype});
		let objectUrl = URL.createObjectURL(file);

		sendLog(`Serialization succesful! (${(new Date()) - serialize.start}ms)`, "success");
		postMessage({
			type: "publishSuccess",
			payload: {
				url: objectUrl,
				filename: filename
			}
		});
	}
	catch(error) {
		postMessage({
			type: "error",
			payload: error
		});
	}
};

function sendLog(message, type) {
	postMessage({
		type: "log",
		payload: {
			message: message,
			type: type
		}
	});
}
