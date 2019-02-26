import { network as config } from "../../config";
import ReconnectingWebSocket from "reconnecting-websocket";
import { TypedSocketHelper } from "./TypedSocketHelper";
import * as game from "./game";

let ws = new ReconnectingWebSocket("ws://localhost:3014/gameplay", [], {
	minReconnectionDelay: 1000,
	maxReconnectionDelay: 30000,
	reconnectionDelayGrowFactor: 2
});

ws.addEventListener("open", function(event) {
	net.websocketOpen = true;
});

ws.addEventListener("close", function(event) {
	net.websocketOpen = false;
});

let helper = new TypedSocketHelper("/gameplay");

let net = { // Initialize, do not configure these values.
	marbleData: undefined,
	marblePositions: new Float32Array(0),
	marbleRotations: new Float32Array(0),
	lastUpdate: 0,
	ready: 0,
	requestsSkipped: 0, // Helps detect network issues
	websocketOpen: false
};

// Socket data promise
net.socketReady = new Promise((resolve) => {
	// Once connected, client receives initial data

	ws.addEventListener("message", function(event) {
		let { type, message } = helper.extractSocketMessageType(event.data);
		console.log(type, message);

		switch(type) {
		case "initial_data":
			net.marbleData = message;
			resolve(true);
			break;
		case "request_physics":
			net.marblePositions = new Float32Array(message.pos);
			net.marbleRotations = new Float32Array(message.rot);
			net.lastUpdate = 0;
			net.ready--;
			break;
		case "new_marble":
			game.spawnMarble(JSON.parse(message));
			break;
		case "start":
			game.start();
			break;
		case "clear":
			game.end();
			break;
		}
	});
}).then(() => {
	/* Physics syncing */
	// Once connection is acknowledged, start requesting physics updates
	let getServerData = function() {
		if (net.ready < config.tickrate && net.websocketOpen) {
			net.ready++;
			console.log(net.ready);
			ws.send(
				helper.addMessageType(Date.now().toString(), "request_physics")
			);
		} else if (net.websocketOpen) {
			net.requestsSkipped++;
			console.log(net.requestsSkipped);
		}
		setTimeout(getServerData, 1000 / config.tickrate);
	};
	getServerData();

	return true;
});

export { net, ws };
