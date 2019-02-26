import * as socketMessageTypes from "../../../src/network/socketMessageTypes.json";

function TypedSocketHelper(route) {
	this.route = route;

	this.extractSocketMessageType = function(message) {
		let type;
		if (typeof message === "string") {
			type = Object.keys(socketMessageTypes.routes[route]).find(
				key => socketMessageTypes.routes[route][key] === parseInt(message.substr(0, 1))
			);
			message = message.substr(1);
		} else if (message instanceof ArrayBuffer) {
			type = socketMessageTypes.routes[route][Uint8Array.from(message)[0]];
			message = message.slice(1);
		}

		return { type, message };
	};

	this.addMessageType = function(message, type) {
		if (typeof message === "string") {
			// maybe convert this to Uint8Array and back to string...
			message = socketMessageTypes.routes[route][type] + message;
		} else if (message instanceof ArrayBuffer) {
			type = new Uint8Array([socketMessageTypes.routes[route][type]]);
			message = appendBuffer(type, message);
		}

		return message;
	};
}

function appendBuffer(buffer1, buffer2) {
	var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
	tmp.set(new Uint8Array(buffer1), 0);
	tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
	return tmp.buffer;
}

export { TypedSocketHelper };
