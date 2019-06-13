import { network as config } from "../config";
import ReconnectingWebSocket from "reconnecting-websocket";
import { TypedSocketHelper } from "./typed-socket-helper";
import { HUDNotification } from "./hud-notification";
import { game } from "./game";
import { marbleManager } from "../marble-manager";
import * as msgPack from "msgpack-lite";

let networking = function() {
	let _wsUri = `ws${config.ssl ? "s" : ""}://${window.location.hostname}${config.websockets.localReroute ? "" : `:${config.websockets.port}`}/ws/gameplay`;
	let _ws = null;
	let _helper = null;
	let _previousMarblePositions = null;
	let _previousMarbleRotations = null;
	let _previousUpdateTimeStamp = null;
	let _ready = 0;
	//let _requestsSkipped = 0; // Helps detect network issues

	let _updateBuffer = [];
	let _bufferTimeStamp = null; // Matches the progression of gameUpdate's timeStamp, or null if there is none
	let _buildBuffer = false; // Whether it should wait in order to build up a buffer
	let _desiredBufferLength = 100; // Desired buffer length in milliseconds?

	let _processMessageEvent = function(event) {
		if(typeof event.data !== "string") {
			let contents = msgPack.decode(new Uint8Array(event.data));
			_updateBuffer.push(contents);
			//console.log(`Timestamp: ${contents.t}`);
			//console.log(`CurrentGameTime: ${contents.c}`);
			return;
		}

		return;

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

	let _processGameEvents = function(thisUpdate) {
		// Update server constants
		if(thisUpdate.s !== undefined) {
			game.setServerConstants(thisUpdate.s[0], thisUpdate.s[1]);
		}

		// Update level ID
		if(thisUpdate.l !== undefined) {
			game.setLevel(thisUpdate.l);
		}

		// Update game state
		if(thisUpdate.g !== undefined) {
			console.log(thisUpdate);
			game.setGameState(thisUpdate.g, thisUpdate.c);
		}

		// Add new marbles
		if(thisUpdate.n !== undefined) {
			for(let i = 0; i < thisUpdate.n.length; i += 5) {
				let marble = {
					entryId: thisUpdate.n[i],
					userId: thisUpdate.n[i + 1],
					name: thisUpdate.n[i + 2],
					size: thisUpdate.n[i + 3],
					color: thisUpdate.n[i + 4]
				};
				game.spawnMarble(marble);
			}
		}

		// Update finished marbles
		if(thisUpdate.f !== undefined) {
			for(let i = 0; i < thisUpdate.f.length; i += 2) {
				let marble = {
					entryId: thisUpdate.f[i],
					time: thisUpdate.f[i + 1]
				};
				game.finishMarble(marble);
			}
		}

		//Just set marble transforms directly for now
		if(thisUpdate.p !== undefined) {
			marbleManager.setMarbleTransforms(thisUpdate.p,	thisUpdate.r);
			_previousMarblePositions = thisUpdate.p;
			_previousMarbleRotations = thisUpdate.r;
			_previousUpdateTimeStamp = thisUpdate.t;
		} else {
			_previousMarblePositions = null;
			_previousMarbleRotations = null;
			_previousUpdateTimeStamp = null;
		}
	};

	return {
		websocketOpen: false,

		initialize: function() {
			_ws = new ReconnectingWebSocket(_wsUri, [], {
				minReconnectionDelay: 1000,
				maxReconnectionDelay: 30000,
				reconnectionDelayGrowFactor: 2
			});
			_ws.binaryType = "arraybuffer";

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

		update: function(deltaTime) {
			if(_updateBuffer.length === 0) return;

			// Process any updates without a timestamp immediately
			while(_updateBuffer.length > 0 && _updateBuffer[0].t === undefined) {
				_processGameEvents(_updateBuffer[0]);
				_updateBuffer.splice(0, 1);
			}

			// If progression hasn't started yet and the buffer isn't the desired length, wait
			if(_bufferTimeStamp === null) {
				if(_updateBuffer.length <= 5) {
					_buildBuffer = true;
					console.log(`Building up a buffer. Currently at ${_updateBuffer.length}`);
				}
				else {
					_buildBuffer = false;
					_bufferTimeStamp = _updateBuffer[0].t;
					console.log(`Buffer built up! _bufferTimeStamp is ${_bufferTimeStamp}ms`);
				}
			} else {
				_bufferTimeStamp += deltaTime * 1000;
			}

			if(!_buildBuffer) {
				if(_updateBuffer.length === 0) {
					// This is the end of the buffer, meaning we have to build up again
					// Either we were meant to reach the end here, or there's connection problems
					console.log("updateBuffer empty, letting the buffer build up again...");
					_bufferTimeStamp = null;
					_buildBuffer = true;
				} else {
					// Trigger any game events that need to happen
					while(_updateBuffer.length > 0
							&& _updateBuffer[0].t !== undefined
							&& _bufferTimeStamp >= _updateBuffer[0].t) {
						//console.log(`Processing a keyframe at ${_bufferTimeStamp} for buffer ${_updateBuffer[0].t}`);
						_processGameEvents(_updateBuffer[0]);
						_updateBuffer.splice(0, 1);
					}

					// Interpolate over next buffer if we have it
					if(_updateBuffer.length > 0) {
						let nextTimeStamp = _updateBuffer[0].t;
						if(nextTimeStamp !== undefined) {
							let interval = (_bufferTimeStamp - _previousUpdateTimeStamp) / (nextTimeStamp - _previousUpdateTimeStamp);
							let interval2 = 1 - interval;

							// Then, interpolate marbles based on that interval (0-1)
							let nextPositions = _updateBuffer[0].p;
							let nextRotations = _updateBuffer[0].r;

							let marblePositions = new Float32Array(_previousMarblePositions.length);
							let marbleRotations = new Float32Array(_previousMarbleRotations.length);

							// Interpolate positions
							for(let i = 0; i < _previousMarblePositions.length; i++) {
								marblePositions[i] = _previousMarblePositions[i] * interval2 + nextPositions[i] * interval;
							}
							// Interpolate rotations
							for(let i = 0; i < _previousMarblePositions.length; i += 4) {
								let x0 = _previousMarbleRotations[i];
								let y0 = _previousMarbleRotations[i + 1];
								let z0 = _previousMarbleRotations[i + 2];
								let w0 = _previousMarbleRotations[i + 3];
								let x1 = nextRotations[i];
								let y1 = nextRotations[i + 1];
								let z1 = nextRotations[i + 2];
								let w1 = nextRotations[i + 3];
								let xRes, yRes, zRes, wRes;

								if ((x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1) < 0) {
									xRes = x0 + (-x1 - x0) * interval;
									yRes = y0 + (-y1 - y0) * interval;
									zRes = z0 + (-z1 - z0) * interval;
									wRes = w0 + (-w1 - w0) * interval;
								} else {
									xRes = x0 + (x1 - x0) * interval;
									yRes = y0 + (y1 - y0) * interval;
									zRes = z0 + (z1 - z0) * interval;
									wRes = w0 + (w1 - w0) * interval;
								}
								let l = 1 / Math.sqrt(xRes * xRes + yRes * yRes + zRes * zRes + wRes * wRes);
								xRes *= l;
								yRes *= l;
								zRes *= l;
								wRes *= l;

								marbleRotations[i] = xRes;
								marbleRotations[i + 1] = yRes;
								marbleRotations[i + 2] = zRes;
								marbleRotations[i + 3] = wRes;
							}

							// Send it off
							marbleManager.setMarbleTransforms(marblePositions, marbleRotations);
						}
					}
				}
			}
		}
	};
}();

export { networking };
