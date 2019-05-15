import { network as config } from "../config";
import ReconnectingWebSocket from "reconnecting-websocket";
import { TypedSocketHelper } from "./typed-socket-helper";
import { HUDNotification } from "./hud-notification";
import { game } from "./game";

let wsUri = `ws${config.ssl ? "s" : ""}://${window.location.hostname}${config.websockets.localReroute ? "" : `:${config.websockets.port}`}/ws/gameplay`;
let ws = new ReconnectingWebSocket(wsUri, [], {
	minReconnectionDelay: 1000,
	maxReconnectionDelay: 30000,
	reconnectionDelayGrowFactor: 2
});

ws.addEventListener("open", function() {
	net.websocketOpen = true;
	net.ready = 0;
});

ws.addEventListener("close", function() {
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

		switch(type) {
		case "initial_data":
			message = JSON.parse(message);

			// Initial marble sizes, colors and names
			net.marbleData = message.initialMarbleData;

			// Unused anywhere else, cleaner to get rid of it now.
			delete message.initialMarbleData;

			game.setInitialGameState(message);

			resolve(message);
			break;
		case "request_physics":
			message = JSON.parse(message);
			if (message) {
				net.marblePositions = new Float32Array(Object.values(message.pos));
				net.marbleRotations = new Float32Array(Object.values(message.rot));
			}
			net.lastUpdate = 0;
			net.ready--;
			break;
		case "new_marble":
			game.spawnMarble(JSON.parse(message));
			break;
		case "finished_marble":
			game.finishMarble(JSON.parse(message));
			break;
		case "state":
			game.setCurrentGameState(JSON.parse(message));
			break;
		case "notification":
			message = JSON.parse(message);
			new HUDNotification(message.content, message.duration, message.style);
			break;
		}
	});
}).then((message) => {
	/* Physics syncing */
	// Once connection is acknowledged, start requesting physics updates
	let getServerData = function() {
		if (net.ready < config.tickrate && net.websocketOpen) {
			net.ready++;
			ws.send(
				helper.addMessageType(Date.now().toString(), "request_physics")
			);
		} else if (net.websocketOpen) {
			net.requestsSkipped++;
		}
		setTimeout(getServerData, 1000 / config.tickrate);
	};
	getServerData();

	return message;
});

export { net, ws };
