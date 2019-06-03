import { network as config } from "../config";
import ReconnectingWebSocket from "reconnecting-websocket";
import { TypedSocketHelper } from "./typed-socket-helper";
import { HUDNotification } from "./hud-notification";
import { game } from "./game";
import { marbleManager } from "../marble-manager";

let networking = function() {
	let _wsUri = `ws${config.ssl ? "s" : ""}://${window.location.hostname}${config.websockets.localReroute ? "" : `:${config.websockets.port}`}/ws/gameplay`;
	let _ws = null;
	let _helper = null;
	let _marblePositions = new Float32Array(0);
	let _marbleRotations = new Float32Array(0);
	let _lastUpdate = 0;
	let _ready = 0;
	//let _requestsSkipped = 0; // Helps detect network issues

	let _processMessageEvent = function(event) {
		game.initialize().then( () => { // Wait for game to be ready before processing events
			let { type, message } = _helper.extractSocketMessageType(event.data);
			message = JSON.parse(message);

			switch(type) {
			case "initial_data":
				game.initializeGameState(message);
				_requestPhysics(); // Start the request physics loop
				break;
			case "request_physics":
				if (message) { // False if there is no data to process
					_marblePositions = new Float32Array(Object.values(message.pos));
					_marbleRotations = new Float32Array(Object.values(message.rot));
				}
				_lastUpdate = 0;
				_ready--;
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
			default:
				console.warn(`Received unknown network message of type "${type}".`, message);
				break;
			}
		});
	};

	let _requestPhysics = function() {
		if (_ready < config.tickrate && networking.websocketOpen) {
			_ready++;
			_ws.send(
				_helper.addMessageType(Date.now().toString(), "request_physics")
			);
		} else if (networking.websocketOpen) {
			//_requestsSkipped++;
		}
		setTimeout(_requestPhysics, 1000 / config.tickrate);
	};

	return {
		websocketOpen: false,

		initialize: function() {
			_ws = new ReconnectingWebSocket(_wsUri, [], {
				minReconnectionDelay: 1000,
				maxReconnectionDelay: 30000,
				reconnectionDelayGrowFactor: 2
			});

			_ws.addEventListener("open", () => {
				this.websocketOpen = true;
				_ready = 0;
			});

			_ws.addEventListener("close", () => {
				this.websocketOpen = false;
			});

			_ws.addEventListener("message", (event) => {
				_processMessageEvent(event);
			});

			_helper = new TypedSocketHelper("/gameplay");
		},

		update: function() {
			// Placeholder update code until network buffer is implemented
			marbleManager.interpolateMarbles(
				_marblePositions,
				_marbleRotations,
				_lastUpdate
			);

			if (_lastUpdate < 1.5) {
				// FPS assumed to be 60, replace with fps when possible, or better: base it on real time.
				_lastUpdate += (config.tickrate / 60 / config.ticksToLerp);
			}
		}
	};
}();

export { networking };
