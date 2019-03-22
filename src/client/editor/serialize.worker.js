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
			sendLog("exportAsLevel enabled, but currently not implemented.", "warn");
			// Code to omit any unused objects goes here
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
