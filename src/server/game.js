const log = require("../log");
const config = require("./config");
const physics = require("../physics/manager");
const levelManager = require("./levels/manager");
const db = require("./database/manager");
const gameConstants = require("../game-constants");
const permissions = require("./chat/permissions");
const skins = require("./skins");
const msgPack = require("msgpack-lite");

const anyColorAllowed = ["abstract", "marble", "default", "swirly", "squares"]; // Will (probably) be changed to a meta file later on, next to the skin file?

function Marble(id, entryId, name, attributes = {}) {
	this.userId = id;
	this.entryId = entryId;

	// Check for premium permissions
	if (
		config.discord.enabled
		&& skins.skinList[attributes.skinId]
		&& skins.skinList[attributes.skinId].premium
	) {
		if (permissions.memberHasPermission(id, "PREMIUM_SKINS")) {
			this.skinId = attributes.skinId;
		} else {
			this.skinId = "default";
		}
	} else {
		this.skinId = attributes.skinId || "default";
	}

	// Check if skin supports a custom color
	if (typeof attributes.color !== "undefined" && anyColorAllowed.includes(this.skinId)) {
		this.color = attributes.color;
	} else if (!anyColorAllowed.includes(this.skinId)) {
		this.color = "#ffffff";
	} else {
		this.color = _randomHexColor();
	}

	this.name = name || "Nightbot";
	this.size = (Math.random() > .98 ? (.3 + Math.random() * .3) : false) || 0.2;
	this.ammoBody = null;
	this.finished = false;
	this.rank = null;
	this.time = null;

	physics.world.createMarble(this);
}

Marble.prototype.onMarbleFinish = function() {
	if(this.finished === false) {
		game.marbleFinished(this);
		this.finished = true;
	}
};

Marble.prototype.destroyMarble = function() {
	if(this.ammoBody) {
		physics.world.destroyMarble(this);
		this.ammoBody = null;
	}
};


let game = function() {
	let _startDelay = 2825, // length in ms of audio
		_socketManager = null,

		_marbles = [],
		_playersEnteredList = [],
		_marblesFinished = 0,
		_isWaitingForEntry = true,
		_firstMarbleHasFinished = false,

		_currentLevel = null,

		_round = null;

	let _netUpdateHandle = null; // Handle to setTimeout
	let _netInterval = isNaN(config.network.tickRate) ? 100 : 1000 / config.network.tickRate;
	let _netGameState = {
		s: [
			config.marbles.rules.enterPeriod,
			config.marbles.rules.finishPeriod
		]
	};
	let _netGameUpdate = {};
	let _netGameStatePayload = null;

	levelManager.currentLevelData.then((level) => {
		_currentLevel = level;
	});

	levelManager.currentLevelName.then((name) => {
		_netGameUpdate.l = name;
	});

	let _generateNewRoundData = function() {
		return {
			start: null,
			end: null,
			timeBest: null,
			levelId: _currentLevel.getLevelId(),
			pointsAwarded: 0,
			playersEntered: 0,
			playersFinished: 0,
			playersNotFinished: 0,
			marblesEntered: 0,
			marblesFinished: 0,
			marblesNotFinished: 0
		};
	};

	let _awardPoints = function(rank) {
		let P = _playersEnteredList.length; // Amount of human marbles
		let G = config.marbles.scoring.pointScale; // Percentage of marbles that finish that will receive more than 1 points for finishing

		return Math.max(
			Math.ceil(
				P / ( P ** (G / P) ) ** rank
			),

			// Finishing always gives you at least 1 additional point
			1
		) + config.marbles.scoring.pointsAwardedForFinishing; // Plus potential bonus for finishing
	};

	// Triggers a network update loop if it hasn't started yet
	let _triggerNetworkUpdate = function() {
		if(!_netUpdateHandle) {
			// Start asap, but not during the code in which this function is called
			_netUpdateHandle = setTimeout( _netUpdate, 0, Date.now());
		}
	};

	// Network update function. Sets a timer to call itself if subsequent updates are desired
	let _netUpdate = function(lastUpdate, combinedDelay) {
		let now = Date.now();
		let delta = now - lastUpdate;

		// Set currentGameTime on state changes for more accuracy
		if(_netGameUpdate.g === gameConstants.STATE_ENTER) {
			_netGameUpdate.c = game.getEnterPeriodTimeRemaining();
		} else if(_netGameUpdate.g === gameConstants.STATE_STARTED) {
			_netGameUpdate.c = now - game.startTime;
		}

		if(_marbles.length > 0) {
			// Get marble positions/rotations
			let marbleData = game.getMarbleTransformations();
			_netGameUpdate.p = marbleData.position;
			_netGameUpdate.r = marbleData.rotation;

			// Update time stamp
			if(_netGameState.t === undefined) {
				_netGameUpdate.t = 0; // If netGameState doesn't have this, this is the start
			} else {
				_netGameUpdate.t = delta; // If it does, set it to the time since last update
			}
		}

		// Here, emit for gameUpdate happens
		let payload = msgPack.encode(_netGameUpdate);
		_socketManager.emit(payload);

		// After, _netGameState is updated based on _netGameUpdate
		_netGameStatePayload = null;

		// gameState
		if(_netGameUpdate.g !== undefined) {
			_netGameState.g = _netGameUpdate.g;

			// Remove all marbles if the state changed to finished
			if(_netGameUpdate.g === gameConstants.STATE_FINISHED) {
				delete _netGameState.n;
				delete _netGameState.f; // Clients that join after a race don't have access to marble data
				delete _netGameState.p;
				delete _netGameState.r;
				delete _netGameUpdate.t; // Timestamp no longer necessary, and won't be copied over
			}
		}

		// currentGameTime
		if(_netGameState.g === gameConstants.STATE_ENTER) {
			_netGameState.c = game.getEnterPeriodTimeRemaining();
		} else if(_netGameState.g === gameConstants.STATE_STARTED) {
			_netGameState.c = now - game.startTime;
		} else {
			delete _netGameState.c;
		}

		// Append new marbles if there are any
		if(_netGameUpdate.n) {
			if(!_netGameState.n) _netGameState.n = [];
			_netGameState.n = _netGameState.n.concat(_netGameUpdate.n);
		}

		// Store marble positions/rotations if any exist
		if(_netGameUpdate.p) {
			_netGameState.p = _netGameUpdate.p;
			_netGameState.r = _netGameUpdate.r;
		}

		// Update timestamp if it exists
		if(_netGameUpdate.t !== undefined) {
			_netGameState.t = 0; // For initial data, the first delta is 0
		} else {
			delete _netGameState.t;
		}

		// Append finished marbles if there are any.
		// Because last-moment finishes CAN happen but new clients don't have marble data
		// when they enter a finished race, this isn't updated in the "finished" game state.
		if(_netGameUpdate.f && _netGameUpdate.g !== gameConstants.STATE_FINISHED) {
			if(!_netGameState.f) _netGameState.f = [];
			_netGameState.f = _netGameState.f.concat(_netGameUpdate.f);
		}

		// levelId
		if(_netGameUpdate.l) _netGameState.l = _netGameUpdate.l;

		// Clear netGameUpdate
		_netGameUpdate = {};

		if(_marbles.length > 0) {
			// Set timer for next network update
			// If we're behind, shorten the interval time
			let currentDelay = 0;
			if(combinedDelay === undefined) {
				// Start of update loop, start tracking accumulated delay
				combinedDelay = 0;
			} else {
				// Update accumulated delay
				currentDelay = delta - _netInterval;
				combinedDelay += currentDelay;
				if(combinedDelay > _netInterval * 10) {
					log.warn("Game networking can't keep up! Skipping 10 network ticks...");
					combinedDelay -= _netInterval * 10;
				}
			}
			_netUpdateHandle = setTimeout( _netUpdate, Math.min(_netInterval, _netInterval - combinedDelay), now, combinedDelay);
		} else {
			// Stop scheduling updates
			_netUpdateHandle = null;
		}
	};

	return {
		currentGameState: gameConstants.STATE_STARTED,
		startTime: null,
		limitReached: false,
		enterTimeout: null,

		// Sets currentGameState and informs all connected clients about the state change
		setCurrentGameState(newState) {
			this.currentGameState = newState;
			_netGameUpdate.g = newState;
			_triggerNetworkUpdate();

			let stateName;
			switch(newState) {
			case gameConstants.STATE_WAITING:
				stateName = "STATE_WAITING";
				break;
			case gameConstants.STATE_ENTER:
				stateName = "STATE_ENTER";
				break;
			case gameConstants.STATE_STARTING:
				stateName = "STATE_STARTING";
				break;
			case gameConstants.STATE_STARTED:
				stateName = "STATE_STARTED";
				break;
			case gameConstants.STATE_FINISHED:
				stateName = "STATE_FINISHED";
				break;
			default:
				stateName = "Unknown";
			}
			log.info("Current state: ".magenta, stateName);
		},

		// Enters the player into the race if allowed
		addPlayerEntry(id, name, attributes) {
			if (
				// Only allow marbles during entering phase
				( this.currentGameState === gameConstants.STATE_WAITING || this.currentGameState === gameConstants.STATE_ENTER )

				// Make sure this person hasn't entered in this round yet
				&& typeof _playersEnteredList.find(playerEntry => id === playerEntry.id) === "undefined"

				// Check whether we have reached the maximum player limit
				&& _playersEnteredList.length < config.marbles.rules.maxPlayerCount
			) {
				// Add the player to the list of entries and award a single point for entering
				_playersEnteredList.push({
					id,
					finished: false,
					time: null,
					pointsEarned: config.marbles.scoring.pointsAwardedForEntering,
					marblesEntered: 1,
					marblesFinished: 0
				});
				_round.pointsAwarded += config.marbles.scoring.pointsAwardedForEntering;

				// Spawn a single marble using the player's data
				this.spawnMarble(id, name, attributes);

				// Wait for a human entering the round before starting it
				if (_isWaitingForEntry) {
					_isWaitingForEntry = false;
					this.setCurrentGameState(gameConstants.STATE_ENTER);

					// Start the game after the entering period is over
					clearTimeout(this.enterTimeout);
					this.enterTimeout = _setTrackableTimeout(
						this.start.bind(this),
						config.marbles.rules.enterPeriod * 1000
					);
				}
			}
		},

		// Spawns marble unless the maximum amount of marbles has been hit
		spawnMarble(id, name, attributes) {
			if (
				// Check whether the game state disallows new marbles
				this.currentGameState === gameConstants.STATE_FINISHED
				// Check whether we have reached the maximum marble limit
				|| _marbles.length >= config.marbles.rules.maxMarbleCount) return;

			// Start physics simulation if this is the first marble
			if(_marbles.length === 0) physics.world.startUpdateInterval();

			let newMarble = new Marble(id, _marbles.length, name, attributes);
			_marbles.push(newMarble);

			// Add entry for network update
			if(!_netGameUpdate.n) _netGameUpdate.n = [];
			_netGameUpdate.n.push(newMarble.entryId, newMarble.userId, newMarble.name, newMarble.size, newMarble.color, newMarble.skinId);
			_triggerNetworkUpdate();

			// Check for player / marble limits
			if (
				(
					_marbles.length >= config.marbles.rules.maxMarbleCount
					|| _playersEnteredList.length >= config.marbles.rules.maxPlayerCount
				)
				&& !this.limitReached
			) {
				this.limitReached = true;
				_socketManager.emit(JSON.stringify({
					content: "The maximum amount of marbles has been hit! No more marbles can be entered for this round."
				}));
				this.start();
				log.info(`We reached the marble limit! (${config.marbles.rules.maxMarbleCount})`);
			}
		},

		end(saveRoundResults = true) {
			if (this.currentGameState === gameConstants.STATE_STARTED) {
				// Set the last few round parameters and store it in the database
				if (_round && saveRoundResults) {
					_round.end = Date.now();
					_round.playersEntered = _playersEnteredList.length;
					_round.playersFinished = _playersEnteredList.filter(playerEntry => playerEntry.finished).length;
					_round.playersNotFinished = _round.playersEntered - _round.playersFinished;
					_round.marblesEntered = _marbles.length;
					_round.marblesNotFinished = _round.marblesEntered - _round.marblesFinished;

					db.round.insertNewRound(_round);

					db.user.batchUpdateStatistics(_playersEnteredList);

					// Update personal bests where applicable. Returns array with all IDs that got a PB this round.
					let personalBestIds = db.personalBest.batchInsertOrUpdatePersonalBest(_playersEnteredList, _currentLevel.getLevelId());

					// Get points of all users that participated in this race. Returns array with objects: { stat_points_earned: <POINTS>, id: <USERID> }
					let pointTotals = db.user.batchGetPoints(_playersEnteredList);

					if(_playersEnteredList.length > 0 && _netGameUpdate.c === undefined) _netGameUpdate.c = [];

					// Points earned in this round
					for (let player of _playersEnteredList) {
						let pointTotal = 0;
						for (let user of pointTotals) {
							if(user.id === player.id) {
								pointTotal = user.stat_points_earned;
							}
						}
						let record = gameConstants.RECORD_NONE;
						if (personalBestIds.includes(player.id)) {
							record = gameConstants.RECORD_PB;
						}
						_netGameUpdate.c.push(player.id, player.pointsEarned, pointTotal, record);
					}
				}

				if (saveRoundResults === true) {
					this.setCurrentGameState(gameConstants.STATE_FINISHED);
				}

				// Clear any remaining timeouts
				clearTimeout(this.gameplayMaxTimeout);
				clearTimeout(this.gameplayFinishTimeout);

				// Finishing variables back to default
				_marblesFinished = 0;
				_firstMarbleHasFinished = false;
				this.startTime = undefined;

				// Close the gates and stop simulating
				physics.world.closeGates();
				physics.world.stopUpdateInterval();

				// Remove all marbles
				for (let i = _marbles.length - 1; i >= 0; --i) {
					_marbles[i].destroyMarble();
				}
				_marbles = [];

				// Clear the array of people that entered
				_playersEnteredList = [];

				// If we had hit the marble limit on the previous round, that's no longer true
				this.limitReached = false;

				// Wait a bit until starting the next round, so the client can view leaderboards n stuff
				this.finishedTimeout = _setTrackableTimeout(
					() => {
						// Create new round data
						_round = _generateNewRoundData();

						// Wait for a human to start the next round
						_isWaitingForEntry = true;

						// Set state and inform the client
						this.setCurrentGameState(gameConstants.STATE_WAITING);
					},
					saveRoundResults ? config.marbles.rules.finishPeriod * 1000 : 0
				);

				return true;
			} else {
				return false;
			}
		},

		start() {
			if (this.currentGameState === gameConstants.STATE_ENTER || this.currentGameState === gameConstants.STATE_WAITING) {
				this.setCurrentGameState(gameConstants.STATE_STARTING);

				// Have the audio clip play on the client before actually starting the race
				setTimeout(() => {
					this.setCurrentGameState(gameConstants.STATE_STARTED);

					_round.start = this.startTime = Date.now();

					physics.world.openGates();
					for(let i = 0; i < _marbles.length; i++) {
						_marbles[i].ammoBody.activate();
					}

					// Set timeout that ends the game if the round takes too long to end (e.g. all marbles getting stuck)
					this.gameplayMaxTimeout = _setTrackableTimeout(
						this.end.bind(this),
						_currentLevel.gameplay.roundLength * 1000
					);
				}, _startDelay);

				return true;
			} else {
				return false;
			}
		},

		marbleFinished(marble) {
			let finishTime = Date.now();
			// Set their rank and final time
			let rank = marble.rank = _marblesFinished++,
				time = marble.time = finishTime - this.startTime;

			// Get playerEntry that belongs to this marble
			let playerEntry = _playersEnteredList.find((playerEntry) => {
				return marble.userId === playerEntry.id;
			});

			if (playerEntry) {
				// Mark them as finished
				playerEntry.finished = true;
				playerEntry.marblesFinished++;

				// Add their time to the entry (so it can be stored in the case of a PB)
				playerEntry.time = time;

				// Award points based on rank
				let points = _awardPoints(rank);
				playerEntry.pointsEarned += points;

				// Also add them to the round total
				_round.pointsAwarded += points;
			}

			// Increment the amount of marbles that finished this round
			_round.marblesFinished++;

			// Add entry for network update
			if(!_netGameUpdate.f) _netGameUpdate.f = [];
			_netGameUpdate.f.push(marble.entryId, time);

			// If this is the first marble that finished, set a timeout to end the game soon
			if (_firstMarbleHasFinished === false) {
				_firstMarbleHasFinished = true;

				// Set round time
				_round.timeBest = time;

				this.gameplayFinishTimeout = _setTrackableTimeout(
					this.end.bind(this),
					config.marbles.rules.timeUntilDnf * 1000
				);
			}

			// If all marbles have finished, end the game
			if (_marblesFinished === _marbles.length) {
				setTimeout(this.end.bind(this), 2000);
			}
		},

		getEnterPeriodTimeRemaining() {
			return _getTimeout(this.enterTimeout) || config.marbles.rules.enterPeriod;
		},

		setSocketManager(socketManager) {
			_socketManager = socketManager;
		},

		getInitialDataPayload() {
			// Encode initial data payload once. Resets if the initial data changes
			if(!_netGameStatePayload) {
				_netGameStatePayload = msgPack.encode(_netGameState);
			}
			return _netGameStatePayload;
		},

		getMarbles() {
			return _marbles;
		},

		getMarbleTransformations() {
			if(_marbles.length === 0) return null;

			let transform = new physics.ammo.btTransform();
			let _pos = new Float32Array(_marbles.length * 3);
			let _rot = new Float32Array(_marbles.length * 3);

			for (let i = 0; i < _marbles.length; i++) {
				let ms = _marbles[i].ammoBody.getMotionState();
				if (ms) {
					ms.getWorldTransform( transform );
					let p = transform.getOrigin();
					let r = _marbles[i].ammoBody.getAngularVelocity();

					_pos[i * 3 + 0] = p.x();
					_pos[i * 3 + 1] = p.y();
					_pos[i * 3 + 2] = p.z();

					_rot[i * 3 + 0] = r.x();
					_rot[i * 3 + 1] = r.y();
					_rot[i * 3 + 2] = r.z();
				}
			}

			return {
				position: _pos,
				rotation: _rot
			};
		}
	};
}();

// Based on https://stackoverflow.com/questions/3144711/find-the-time-left-in-a-settimeout/36389263#36389263
let _timeoutMap = {};
function _setTrackableTimeout(callback, delay) {
	// Run the original, and store the id
	let id = setTimeout(callback, delay);

	// Store the start date and delay
	_timeoutMap[id] = [Date.now(), delay];

	// Return the id
	return id;
}

// The actual getTimeLeft function
function _getTimeout(id) {
	let m = _timeoutMap[id]; // Find the timeout in map

	// If there was no timeout with that id, return NaN, otherwise, return the time left clamped to 0
	return m ? Math.max(m[1] + m[0] - Date.now(), 0) : NaN;
}

// Generates a random color in the HEX format
function _randomHexColor() {
	let color = (Math.random() * 0xffffff | 0).toString(16);
	if (color.length !== 6) {
		color = (`00000${color}`).slice(-6);
	}
	return `#${color}`;
}

module.exports = game;
