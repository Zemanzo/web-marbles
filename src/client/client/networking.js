import { network as config } from "../config";
import ReconnectingWebSocket from "reconnecting-websocket";
import { HUDNotification } from "./hud-notification";
import { game } from "./game";
import { marbleManager } from "../marble-manager";
import * as msgPack from "msgpack-lite";

let networking = function() {
	let _wsUri = `ws${config.ssl ? "s" : ""}://${window.location.hostname}${config.websockets.localReroute ? "" : `:${config.websockets.port}`}/ws/gameplay`;
	let _ws = null;

	let _updateBuffer = []; // Array of game updates, each containing events and marble data
	let _timeDeltaRemainder = null; // Represents the timeDelta between two updates, or null if there are none
	let _desiredBufferSize = config.defaultBufferSize; // Desired buffer size
	let _previousMarblePositions = null;
	let _previousMarbleRotations = null;

	let _processMessageEvent = function(event) {
		if(typeof event.data === "string") {
			// This should only be a HUD Notification
			console.log(event.data);
			let message = JSON.parse(event.data);
			new HUDNotification(message.content, message.duration, message.style);
		} else {
			let contents = msgPack.decode(new Uint8Array(event.data));
			_updateBuffer.push(contents);

			// Force progression if buffer gets too large
			// This may happen frequently with inactive tabs
			while(_updateBuffer.length > config.maxBufferSize) {
				_processGameEvents(_updateBuffer[0]);
				_updateBuffer.splice(0, 1);
				if(_timeDeltaRemainder !== null) _timeDeltaRemainder = 0;
			}
			return;
		}
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
			game.setGameState(thisUpdate.g, thisUpdate.c);
			// Reset buffer size after each round
			if(thisUpdate.g === "waiting") _desiredBufferSize = config.defaultBufferSize;
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

		// Update marble positions
		if(thisUpdate.p !== undefined) {
			marbleManager.setMarbleTransforms(thisUpdate.p,	thisUpdate.r);
			_previousMarblePositions = thisUpdate.p;
			_previousMarbleRotations = thisUpdate.r;
		} else {
			_previousMarblePositions = null;
			_previousMarbleRotations = null;
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
			});

			_ws.addEventListener("close", () => {
				this.websocketOpen = false;
			});

			_ws.addEventListener("message", (event) => {
				_processMessageEvent(event);
			});
		},

		update: function(deltaTime) {
			// Process any updates without a timestamp immediately
			while(_updateBuffer.length > 0 && _updateBuffer[0].t === undefined) {
				_processGameEvents(_updateBuffer[0]);
				_updateBuffer.splice(0, 1);
			}

			// If progression hasn't started yet and the buffer isn't the desired length, wait
			if(_timeDeltaRemainder === null) {
				if(_updateBuffer.length >= _desiredBufferSize) {
					_timeDeltaRemainder = 0;

					if(_updateBuffer[0].t > 0) {
						// This wasn't the initial data update, meaning we lagged behind
						_updateBuffer[0].t = 0;
						_desiredBufferSize = Math.min(_desiredBufferSize + 1, config.maxBufferSize);
						console.warn(`Client connection can't keep up! Increasing minimum buffer length to ${_desiredBufferSize}`);
					}
					let total = 0;
					for(let i = 0; i < _updateBuffer.length; i++)
						if(_updateBuffer[i].t !== undefined) total += _updateBuffer[i].t;
					console.log(`Game buffer built up to size ${_updateBuffer.length} with a total length of ${total}ms`);
				}
			} else {
				_timeDeltaRemainder += deltaTime * 1000;
			}

			if(_timeDeltaRemainder !== null) {
				if(_updateBuffer.length === 0) {
					// This is the end of the buffer, meaning we have to build up again
					// Either we were meant to reach the end here, or there's connection problems
					_timeDeltaRemainder = null;
				} else {
					// Trigger any game events that need to happen
					while(_updateBuffer.length > 0
							&& _updateBuffer[0].t !== undefined
							&& _timeDeltaRemainder >= _updateBuffer[0].t) {
						_processGameEvents(_updateBuffer[0]);
						_timeDeltaRemainder -= _updateBuffer[0].t;
						_updateBuffer.splice(0, 1);
					}

					// Interpolate over next buffer if we have it
					if(_updateBuffer.length > 0) {
						let nextTimeDelta = _updateBuffer[0].t;
						if(nextTimeDelta !== undefined) {
							let interval = _timeDeltaRemainder / nextTimeDelta;
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
							for(let i = 0; i < _previousMarbleRotations.length; i += 4) {
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

							marbleManager.setMarbleTransforms(marblePositions, marbleRotations);
						}
					}
				}
			}
		}
	};
}();

export { networking };
