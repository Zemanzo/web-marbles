import * as pako from "pako";
import * as msgPack from "msgpack-lite";
import * as levelManager from "../../level/manager";


onmessage = function(message) {
	exportProject(message.data.payload, message.data.exportType, message.data.exportStart, message.data.useCompression);
};

let exportProject = function(data, exportType, exportStart, useCompression) {
	sendLog(`Payload received. (${Date.now() - exportStart}ms)`);

	try {
		let fileName = data.levelName;
		let extension = ".mmp";

		if(exportType === "publishServer") {
			extension = ".mms";
		} else if(exportType === "publishClient") {
			extension = ".mmc";
		}

		data = levelManager.prepareExport(data, exportType, exportStart);
		if(data === null) {
			postMessage({
				type: "error",
				payload: "Level export failed, check console for details."
			});
			return;
		}

		// Converting to file-ready format
		data = msgPack.encode(data);
		sendLog(`File data prepared. (${Date.now() - exportStart}ms)`);

		if(useCompression) {
			let startLength = data.length;
			sendLog("Starting compression...");
			data = pako.deflate(data);
			let compressionRatio = Math.round((data.length / startLength) * 10000) * .01;
			sendLog(`Data compressed! (${compressionRatio}% of original) (${Date.now() - exportStart}ms)`);
		}

		let filetype = useCompression ? "application/octet-stream" : "application/json";
		let filename = `${fileName}${extension}`;
		let file = new File([data], filename, {type: filetype});
		let objectUrl = URL.createObjectURL(file);

		sendLog(`Serialization successful! (${Date.now() - exportStart}ms)`, "success");
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
