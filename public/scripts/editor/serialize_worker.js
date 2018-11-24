let serialize = {};

onmessage = function(message) {
	serialize.start = message.data.serializationStart || new Date();
	switch(message.data.type){
		case "exportPublishBinary":
			sendLog(`- Data received by worker (${(new Date()) - serialize.start}ms)`);
			exportPublish(message.data.payload, true);
			break;
		case "exportPublishPlain":
			sendLog(`- Data received by worker (${(new Date()) - serialize.start}ms)`);
			exportPublish(message.data.payload, false);
			break;
		default:
			postMessage({
				type: "log",
				payload: {
					message: `No such serialization type is available (${message.data.type})`,
					type: "error"
				}
			});
			break;
	}
}

let exportPublish = function(data, compress){
	try {
		// Object to string
		data = JSON.stringify(data);
		sendLog(`- Stringified (${(new Date()) - serialize.start}ms)`);

		if (compress){
			importScripts("/scripts/lib/lz-string.min.js");
			let startLength = data.length;
			sendLog(`- Start compression (this might take a while...)`);
			data = LZString.compress(data);
			let compressionRatio = Math.round((data.length / startLength) * 10000) * .01;
			sendLog(`- Compressed (${compressionRatio}% of original) (${(new Date()) - serialize.start}ms)`);
		}

		data = new Blob([data], {
		    type: "text/plain"
		});
		let extension = compress ? ".mmb" : ".mmp";
		let filetype = compress ? "application/octet-stream" : "application/json";
		let filename = `${data.filename}${extension}`;
		let file = new File([data], filename, {type: filetype});
		let objectUrl = URL.createObjectURL(file);

		sendLog(`Serialization succesful! (${(new Date()) - serialize.start}ms)`, 'success');
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
			type: "log",
			payload: {
				message: `Serialization failed... (maybe this helps? ${error})`,
				type: "error"
			}
		});
	}
}

function sendLog(message,type){
	postMessage({
		type: "log",
		payload: {
			message: message,
			type: type
		}
	});
}
