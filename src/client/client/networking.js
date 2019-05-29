import { network as config } from "../config";
import ReconnectingWebSocket from "reconnecting-websocket";
import { TypedSocketHelper } from "./typed-socket-helper";
import { HUDNotification } from "./hud-notification";
import { game } from "./game";

let networking = function() {
	let _wsUri = `ws${config.ssl ? "s" : ""}://${window.location.hostname}${config.websockets.localReroute ? "" : `:${config.websockets.port}`}/ws/gameplay`;
	let _ws = null;
	let _helper = null;

	let _processMessageEvent = function(event) {
		let { type, message } = _helper.extractSocketMessageType(event.data);
		message = JSON.parse(message);

		switch(type) {
		case "initial_data":
			game.initializeGameState(message);
			_requestPhysics(); // Start the request physics loop
			break;
		case "request_physics":
			if (message) { // False if there is no data to process
				networking.marblePositions = new Float32Array(Object.values(message.pos));
				networking.marbleRotations = new Float32Array(Object.values(message.rot));
			}
			networking.lastUpdate = 0;
			networking.ready--;
			break;
		case "new_marble":
			game.spawnMarble(message);
			break;
		case "finished_marble":
			game.finishMarble(message);
			break;
		case "state":
			game.setCurrentGameState(message);
			break;
		case "notification":
			new HUDNotification(message.content, message.duration, message.style);
			break;
		}
	};

	let _requestPhysics = function() {
		if (networking.ready < config.tickrate && networking.websocketOpen) {
			networking.ready++;
			_ws.send(
				_helper.addMessageType(Date.now().toString(), "request_physics")
			);
		} else if (networking.websocketOpen) {
			networking.requestsSkipped++;
		}
		setTimeout(_requestPhysics, 1000 / config.tickrate);
	};

	return {
		marblePositions: new Float32Array(0),
		marbleRotations: new Float32Array(0),
		lastUpdate: 0,
		ready: 0,
		requestsSkipped: 0, // Helps detect network issues
		websocketOpen: false,

		initialize: function() {
			_ws = new ReconnectingWebSocket(_wsUri, [], {
				minReconnectionDelay: 1000,
				maxReconnectionDelay: 30000,
				reconnectionDelayGrowFactor: 2
			});

			_ws.addEventListener("open", () => {
				this.websocketOpen = true;
				this.ready = 0;
			});

			_ws.addEventListener("close", () => {
				this.websocketOpen = false;
			});

			_ws.addEventListener("message", (event) => {
				_processMessageEvent(event);
			});

			_helper = new TypedSocketHelper("/gameplay");
		}
	};
}();

export { networking };
