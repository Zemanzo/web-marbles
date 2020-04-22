const log = require("../log");
const config = require("./config");
const socketsHelper = require("./network/sockets-helper");
const physics = require("../physics/manager");
const levelManager = require("./levels/manager");
const db = require("./database/manager");
const gameConstants = require("../game-constants");
const permissions = require("./chat/permissions");
const skins = require("./skins");
const msgPack = require("msgpack-lite");

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
	if(skins.skinList[this.skinId].allowCustomColor) {
		this.color = attributes.color || _randomHexColor();
	} else {
		this.color = "#ffffff";
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
	let _currentGameState = gameConstants.STATE_WAITING;
	let _marbleLimitReached = false;
	let _gameStateTimeout = null; // Main setTimeout handle for when one game state should switch to another

	let _enterPeriodStart = null; // Timestamp for when the enter period started, used to calculate remaining time
	let _startDelay = 2825, // length in ms of audio

		_marbles = [],
		_playersEnteredList = [],
		_marblesFinished = 0,

		_currentLevel = null,

		_round = null;

	let _gameplaySocket = null;
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

	// levelManager.currentLevelData.then((level) => {
	// 	_currentLevel = level;
	// });

	// levelManager.currentLevelName.then((name) => {
	// 	_netGameUpdate.l = name;
	// });

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
			_netGameUpdate.c = now - _round.start;
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
		_gameplaySocket.emit(payload);

		// After, _netGameState is updated based on _netGameUpdate
		_netGameStatePayload = null;

		// gameState
		if(_netGameUpdate.g !== undefined) {
			_netGameState.g = _netGameUpdate.g;
		}

		// currentGameTime
		if(_netGameState.g === gameConstants.STATE_ENTER) {
			_netGameState.c = game.getEnterPeriodTimeRemaining();
		} else if(_netGameState.g === gameConstants.STATE_STARTED) {
			_netGameState.c = now - _round.start;
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

	let _getInitialDataPayload = function() {
		// Encode initial data payload once. Resets if the initial data changes
		if(!_netGameStatePayload) {
			_netGameStatePayload = msgPack.encode(_netGameState);
		}
		return _netGameStatePayload;
	};

	// Sets currentGameState and informs all connected clients about the state change
	let _setCurrentGameState = function(newState) {
		_currentGameState = newState;
		_netGameUpdate.g = newState;
		_triggerNetworkUpdate();
		clearTimeout(_gameStateTimeout); // Always clear any remaining timeouts if we switch states

		let stateName;
		switch(newState) {
		case gameConstants.STATE_LOADING:
			stateName = "STATE_LOADING";
			_onStateLoading();
			break;
		case gameConstants.STATE_WAITING:
			stateName = "STATE_WAITING";
			_onStateWaiting();
			break;
		case gameConstants.STATE_ENTER:
			stateName = "STATE_ENTER";
			_onStateEnter();
			break;
		case gameConstants.STATE_STARTING:
			stateName = "STATE_STARTING";
			_onStateStarting();
			break;
		case gameConstants.STATE_STARTED:
			stateName = "STATE_STARTED";
			_onStateStarted();
			break;
		case gameConstants.STATE_FINISHED:
			stateName = "STATE_FINISHED";
			_onStateFinished();
			break;
		default:
			stateName = "Unknown";
		}

		// Print the state change only once (e.g. aborted races technically "finish" and go to the waiting state right away)
		if(newState == _currentGameState)
			log.info("Current state: ".magenta, stateName);
	};

	let _onStateLoading = function() {
		_round = null;
	};

	let _onStateWaiting = function() {
		// Create new round data
		_round = _generateNewRoundData();
	};

	let _onStateEnter = function() {
		_enterPeriodStart = Date.now();
		// Start the game after the entering period is over
		_gameStateTimeout = setTimeout(() => { _setCurrentGameState(gameConstants.STATE_STARTING); }, config.marbles.rules.enterPeriod * 1000);
	};

	let _onStateStarting = function() {
		// Wait for the countdown audio to end
		_gameStateTimeout = setTimeout(() => { _setCurrentGameState(gameConstants.STATE_STARTED); }, _startDelay);
	};

	let _onStateStarted = function() {
		_round.start = Date.now();

		physics.world.openGates();
		for(let i = 0; i < _marbles.length; i++) {
			_marbles[i].ammoBody.activate();
		}

		// Set timeout that ends the game if the round takes too long to end (e.g. all marbles getting stuck)
		_gameStateTimeout = setTimeout( () => { _setCurrentGameState(gameConstants.STATE_FINISHED); }, _currentLevel.gameplay.roundLength * 1000);
	};

	let _onStateFinished = function() {
		// Set the last few round parameters and store it in the database
		// If _round is null, the results are discarded and the race is considered aborted
		if (_round) {
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

			if(_playersEnteredList.length > 0 && _netGameUpdate.c === undefined)
				_netGameUpdate.c = [];

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

		// Finishing variables back to default
		_marblesFinished = 0;

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

		// If we hit the marble limit on the previous round, that's no longer true
		_marbleLimitReached = false;
		_enterPeriodStart = null;

		// Remove all marble data in the network game state
		delete _netGameState.n;
		delete _netGameState.f; // Clients that join after a race don't have access to marble data
		delete _netGameState.p;
		delete _netGameState.r;
		delete _netGameUpdate.t; // Timestamp no longer necessary, and won't be copied over

		// Wait a bit until starting the next round, so the client can view leaderboards n stuff
		if(_round) {
			_gameStateTimeout = setTimeout( () => { _setCurrentGameState(gameConstants.STATE_WAITING); }, config.marbles.rules.finishPeriod * 1000);
		} else {
			_setCurrentGameState(gameConstants.STATE_WAITING); // Immediately go back to waiting state if this round was aborted
		}
	};


	return {

		initialize() {
			physics.world.setTickRate(config.physics.steps);

			// Socket initialisation
			_gameplaySocket = new socketsHelper.Socket("/gameplay", {
				compression: 0,
				maxPayloadLength: 1024 ** 2,
				idleTimeout: 3600
			});

			// Send full game data to new clients
			_gameplaySocket.eventEmitter.on("open", (ws) => {
				ws.send(_getInitialDataPayload(), true);
			});

			if(levelManager.availableLevels.length > 0) {
				if(levelManager.availableLevels.includes(config.marbles.levels.defaultLevel)) {
					this.changeLevel(config.marbles.levels.defaultLevel);
				} else {
					log.info("No default level set or found. The first available level will be loaded instead.");
					this.changeLevel(levelManager.availableLevels[0]);
				}
			} else {
				throw new Error("Game is unable to start: No levels available to load!");
			}
		},

		stop() {
			// Inform any connected clients
			_gameplaySocket.emit(JSON.stringify({
				content: "The server is shutting down.",
				classNames: "red exclamation"
			}));

			_gameplaySocket.closeAll();

			// Stop any ongoing race
			this.end(false);

			// Clear remaining timeouts
			clearTimeout(_gameStateTimeout);
			clearTimeout(_netUpdateHandle);

			log.warn("Game loop stopped");

			physics.world.stopUpdateInterval();
			log.warn("PHYSICS stopped");
		},

		// Enters the player into the race if allowed
		addPlayerEntry(id, name, attributes) {
			if (
				// Only allow marbles during entering phase
				( _currentGameState === gameConstants.STATE_WAITING || _currentGameState === gameConstants.STATE_ENTER )

				// Make sure this person hasn't entered in this round yet
				&& typeof _playersEnteredList.find(playerEntry => id === playerEntry.id) === "undefined"

				// Check whether we have reached the maximum player limit
				&& !_marbleLimitReached
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
				if(_currentGameState === gameConstants.STATE_WAITING)
					_setCurrentGameState(gameConstants.STATE_ENTER);
			}
		},

		// Spawns marble unless the maximum amount of marbles has been hit
		spawnMarble(id, name, attributes) {
			if (_currentGameState === gameConstants.STATE_FINISHED || _currentGameState === gameConstants.STATE_LOADING || _marbleLimitReached)
				return;

			// Start physics simulation if this is the first marble
			if(_marbles.length === 0)
				physics.world.startUpdateInterval();

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
				&& !_marbleLimitReached
			) {
				_marbleLimitReached = true;
				_gameplaySocket.emit(JSON.stringify({
					content: "The maximum amount of marbles has been hit! No more marbles can be entered for this round.",
					classNames: "red exclamation"
				}));
				log.info(`We reached the marble limit! (${_playersEnteredList.length}/${config.marbles.rules.maxPlayerCount} players, ${_marbles.length}/${config.marbles.rules.maxMarbleCount} marbles)`);
				_setCurrentGameState(gameConstants.STATE_STARTING);
			}
		},

		// Interrupts the race/pre-race, or ends the race early
		end(saveRoundResults = true) {
			if(!saveRoundResults || _currentGameState !== gameConstants.STATE_STARTED) {
				_round = null;
				log.info("Race has been aborted!");
			}

			_setCurrentGameState(gameConstants.STATE_FINISHED);
		},

		// Manually starts the race when in a valid state
		start() {
			if (_currentGameState === gameConstants.STATE_ENTER || _currentGameState === gameConstants.STATE_WAITING) {
				_setCurrentGameState(gameConstants.STATE_STARTING);
			}
		},

		// Loads a new level
		changeLevel(levelName) {
			if(_currentLevel && _currentLevel.levelName === levelName)
				return;

			// Only allowing level changing in the waiting state for now
			if(_currentGameState !== gameConstants.STATE_WAITING) {
				return;
			}

			if(!levelManager.availableLevels.includes(levelName)) {
				log.warn(`Attempted to change level to "${levelName}", but no such level is available.`);
				return;
			}

			// Explicitly abort the race is there's marbles in this state (e.g. bots)
			if(_marbles.length > 0)
				this.end(false);

			// Update clients on the change
			_netGameUpdate.l = levelName;
			_setCurrentGameState(gameConstants.STATE_LOADING);

			levelManager.loadLevel(levelName).then( (levelData) => {
				_currentLevel = levelData;
				if(!levelData) {
					// Well this is awkward
					// This really shouldn't happen if all levels were validated earlier, so we're probably in booboo town already
					throw new Error(`Game.changeLevel: Failed to load level "${levelName}"`);
				}
				_setCurrentGameState(gameConstants.STATE_WAITING);
			});
		},

		marbleFinished(marble) {
			let finishTime = Date.now();
			// Set their rank and final time
			marble.rank = _marblesFinished++;
			marble.time = finishTime - _round.start;

			// Get playerEntry that belongs to this marble
			let playerEntry = _playersEnteredList.find((playerEntry) => {
				return marble.userId === playerEntry.id;
			});

			if (playerEntry) {
				// Mark them as finished
				playerEntry.finished = true;
				playerEntry.marblesFinished++;

				// Add their time to the entry (so it can be stored in the case of a PB)
				playerEntry.time = marble.time;

				// Award points based on rank
				let points = _awardPoints(marble.rank);
				playerEntry.pointsEarned += points;

				// Also add them to the round total
				_round.pointsAwarded += points;
			}

			// Increment the amount of marbles that finished this round
			_round.marblesFinished++;

			// Add entry for network update
			if(!_netGameUpdate.f) _netGameUpdate.f = [];
			_netGameUpdate.f.push(marble.entryId, marble.time);

			// If this is the first marble that finished, set a timeout to end the game soon
			if (_marblesFinished === 1) {
				// Set round time
				_round.timeBest = marble.time;

				// Update the current finish timeout
				clearTimeout(_gameStateTimeout);
				_gameStateTimeout = setTimeout(() => {_setCurrentGameState(gameConstants.STATE_FINISHED);}, config.marbles.rules.timeUntilDnf * 1000);
			}

			// If all marbles have finished, end the game
			if (_marblesFinished === _marbles.length) {
				clearTimeout(_gameStateTimeout);
				_gameStateTimeout = setTimeout(() => {_setCurrentGameState(gameConstants.STATE_FINISHED);}, 2000);
			}
		},

		getEnterPeriodTimeRemaining() {
			if(_enterPeriodStart === null)
				return config.marbles.rules.enterPeriod;
			else
				return Math.max(config.marbles.rules.enterPeriod * 1000 + _enterPeriodStart - Date.now(), 0);
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


// Generates a random color in the HEX format
function _randomHexColor() {
	let color = (Math.random() * 0xffffff | 0).toString(16);
	if (color.length !== 6) {
		color = (`00000${color}`).slice(-6);
	}
	return `#${color}`;
}

module.exports = game;
