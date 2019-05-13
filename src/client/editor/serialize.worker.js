import * as pako from "pako";
import * as levelManager from "../../level/manager";

let serialize = {
	start: null
};

onmessage = function(message) {
	serialize.start = message.data.serializationStart || new Date();
	exportProject(message.data.payload, message.data.exportType, message.data.useCompression);
};

let exportProject = function(data, exportType, useCompression) {
	sendLog(`Payload received. (${(new Date()) - serialize.start}ms)`);

	try {
		let fileName = data.levelName;
		let extension = ".mmp";

		if(exportType === "publishServer") {
			extension = ".mms";
		} else if(exportType === "publishClient") {
			extension = ".mmc";
		}

		data = levelManager.prepareExport(data, exportType);

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

		let filetype = useCompression ? "application/octet-stream" : "application/json";
		let filename = `${fileName}${extension}`;
		let file = new File([data], filename, {type: filetype});
		let objectUrl = URL.createObjectURL(file);

		sendLog(`Serialization successful! (${(new Date()) - serialize.start}ms)`, "success");
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
