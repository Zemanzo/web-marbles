import { network as config } from "../config";
import ReconnectingWebSocket from "reconnecting-websocket";
import { HUDNotification } from "./hud-notification";
import { game } from "./game";
import * as gameConstants from "../../game-constants.json";
import { marbleManager } from "../marble-manager";
import { Vector3 } from "three";
import * as msgPack from "msgpack-lite";

let networking = function() {
	let _wsUri = `ws${config.ssl ? "s" : ""}://${window.location.hostname}${config.websockets.localReroute ? "" : `:${config.websockets.port}`}/ws/gameplay`;
	let _ws = null;

	let _updateBuffer = []; // Array of game updates, each containing events and marble data
	let _timeDeltaRemainder = null; // Represents the timeDelta between two updates, or null if there are none
	let _desiredBufferSize = config.defaultBufferSize; // Desired buffer size
	let _previousMarblePositions = null;

	let _processMessageEvent = function(event) {
		if(typeof event.data === "string") {
			// This should only be a HUD Notification
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
			if(thisUpdate.g === gameConstants.STATE_WAITING) _desiredBufferSize = config.defaultBufferSize;
		}

		// Add new marbles
		if(thisUpdate.n !== undefined) {
			for(let i = 0; i < thisUpdate.n.length; i += 6) {
				let marble = {
					entryId: thisUpdate.n[i],
					userId: thisUpdate.n[i + 1],
					name: thisUpdate.n[i + 2],
					size: thisUpdate.n[i + 3],
					color: thisUpdate.n[i + 4],
					skinId: thisUpdate.n[i + 5]
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
			_previousMarblePositions = thisUpdate.p;
			for(let i = 0; i < marbleManager.marbles.length; i++) {
				let marble = marbleManager.marbles[i];
				marble.marbleOrigin.position.x = _previousMarblePositions[i * 3];
				marble.marbleOrigin.position.y = _previousMarblePositions[i * 3 + 1];
				marble.marbleOrigin.position.z = _previousMarblePositions[i * 3 + 2];
			}
		} else {
			_previousMarblePositions = null;
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
				game.resetGame(); // New session start
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
				if(_updateBuffer.length > 0 && _updateBuffer[0].t > 0) {
					// This wasn't the initial data update, meaning we lagged behind
					_updateBuffer[0].t = 0;
					_desiredBufferSize = Math.min(_desiredBufferSize + 1, config.maxBufferSize);
					console.log(`Client connection can't keep up! Temporarily increasing minimum buffer length to ${_desiredBufferSize}`);
				}

				if(_updateBuffer.length >= _desiredBufferSize) {
					_timeDeltaRemainder = 0; // Starting progression now
				}
			} else {
				_timeDeltaRemainder += deltaTime * 1000;
			}

			if(_timeDeltaRemainder !== null) {
				// Trigger any game events that need to happen
				while(_updateBuffer.length > 0
						&& _updateBuffer[0].t !== undefined
						&& _timeDeltaRemainder >= _updateBuffer[0].t) {
					_processGameEvents(_updateBuffer[0]);
					_timeDeltaRemainder -= _updateBuffer[0].t;
					_updateBuffer.splice(0, 1);
				}

				if(_updateBuffer.length === 0) {
					// This is the end of the buffer, meaning we have to build up again
					// Either we were meant to reach the end here, or there's connection problems
					_timeDeltaRemainder = null;
				} else {
					// Interpolate over next buffer
					let nextTimeDelta = _updateBuffer[0].t;
					if(nextTimeDelta !== undefined && _timeDeltaRemainder > 0) {
						let interval = _timeDeltaRemainder / nextTimeDelta;
						let interval2 = 1 - interval;

						let nextPositions = _updateBuffer[0].p;
						let nextAngVelocities = _updateBuffer[0].r;

						for(let i = 0; i < marbleManager.marbles.length; i++) {
							let marble = marbleManager.marbles[i];

							// Update position
							marble.marbleOrigin.position.x = _previousMarblePositions[i * 3] * interval2 + nextPositions[i * 3] * interval;
							marble.marbleOrigin.position.y = _previousMarblePositions[i * 3 + 1] * interval2 + nextPositions[i * 3 + 1] * interval;
							marble.marbleOrigin.position.z = _previousMarblePositions[i * 3 + 2] * interval2 + nextPositions[i * 3 + 2] * interval;

							// Update rotation
							let angularVelocity = new Vector3(
								nextAngVelocities[i * 3],
								nextAngVelocities[i * 3 + 1],
								nextAngVelocities[i * 3 + 2]);
							let angle = angularVelocity.length() * deltaTime; // Get amount of angular movement
							if(angle !== 0) {
								angularVelocity.normalize(); // Get unit-length axis
								marble.mesh.rotateOnWorldAxis(angularVelocity, angle);
							}
						}
					}
				}
			}
		}
	};
}();

export { networking };
