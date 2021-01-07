const log = require("../log");
const config = require("./config");
const socketsHelper = require("./network/sockets-helper");
const physicsWorld = require("../physics/world");
const levelManager = require("./levels/manager");
const gameConstants = require("../game-constants");
const msgPack = require("msgpack-lite");

const DefaultRace = require("./races/default-race");

let game = function() {
	let _currentGameState = gameConstants.STATE_WAITING;
	let _currentLevel = null;
	let _currentRace = null;
	let _gameStateTimeout = null; // Main setTimeout handle for when one game state should switch to another

	let _enterPeriodStart = null; // Timestamp for when the enter period started, used to calculate remaining time
	let _startDelay = 2825; // length in ms of audio

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
			_netGameUpdate.c = now - _currentRace.round.start;
		}

		if(_currentRace && _currentRace.marbleEntries.length > 0) {
			// Get marble positions/rotations
			let marbleData = physicsWorld.getMarbleTransforms();
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
			_netGameState.c = now - _currentRace.round.start;
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

		if(_currentRace && _currentRace.marbleEntries.length > 0) {
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
		case gameConstants.STATE_PREPARING:
			stateName = "STATE_PREPARING";
			_onStatePreparing();
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
		if(newState === _currentGameState)
			log.info("Current state: ".magenta, stateName);
	};

	let _onStateLoading = function() {
	};

	let _onStateWaiting = function() {
		// Create new race
		_currentRace = new DefaultRace(game, _currentLevel.levelId);
	};

	let _onStateEnter = function() {
		_enterPeriodStart = Date.now();
		// Start the game after the entering period is over
		_gameStateTimeout = setTimeout(() => { _setCurrentGameState(gameConstants.STATE_PREPARING); }, config.marbles.rules.enterPeriod * 1000);
		_currentRace.onStateEnter();
	};

	let _onStatePreparing = function() {
		// The race returns a promise if preparation is needed, or null if this state can be skipped
		let prepPromise = _currentRace.onStatePreparing();
		if(!prepPromise) {
			log.info("Skipped preparation state");
			_setCurrentGameState(gameConstants.STATE_STARTING);
		} else {
			prepPromise.then( () => {
				_setCurrentGameState(gameConstants.STATE_STARTING);
			}).catch( (error) => {
				log.error(`Unable to prepare race: ${error}`);
				game.end(false);
			});
		}
	};

	let _onStateStarting = function() {
		// Wait for the countdown audio to end
		_gameStateTimeout = setTimeout(() => { _setCurrentGameState(gameConstants.STATE_STARTED); }, _startDelay);
		_currentRace.onStateStarting();
	};

	let _onStateStarted = function() {
		// Set timeout that ends the game if the round takes too long to end (e.g. all marbles getting stuck)
		_gameStateTimeout = setTimeout( () => { _setCurrentGameState(gameConstants.STATE_FINISHED); }, _currentLevel.gameplay.roundLength * 1000);
		_currentRace.onStateStarted();
	};

	let _onStateFinished = function() {
		// Reset variable here to ensure it is reset during aborts
		_enterPeriodStart = null;

		// Remove all marble data in the network game state
		delete _netGameState.n;
		delete _netGameState.f; // Clients that join after a race don't have access to marble data
		delete _netGameState.p;
		delete _netGameState.r;
		delete _netGameUpdate.t; // Timestamp no longer necessary, and won't be copied over

		_currentRace.onStateFinished();

		// Wait a bit until starting the next round, so the client can view leaderboards n stuff
		if(_currentRace.round) {
			_gameStateTimeout = setTimeout( () => { _setCurrentGameState(gameConstants.STATE_WAITING); }, config.marbles.rules.finishPeriod * 1000);
		} else {
			_setCurrentGameState(gameConstants.STATE_WAITING); // Immediately go back to waiting state if this round was aborted
		}

		_currentRace = null;
	};

	let _onMarbleFinished = function(entryId) {
		_currentRace.onMarbleFinished(entryId);

		let marble = _currentRace.marbleEntries[entryId];

		// Add entry for network update
		if(!_netGameUpdate.f)
			_netGameUpdate.f = [];
		_netGameUpdate.f.push(marble.entryId, marble.time);

		// If this is the first marble that finished, set a timeout to end the game soon
		if (_currentRace.marblesFinished === 1) {
			// Update the current finish timeout
			clearTimeout(_gameStateTimeout);
			_gameStateTimeout = setTimeout(() => {_setCurrentGameState(gameConstants.STATE_FINISHED);}, config.marbles.rules.timeUntilDnf * 1000);
		}

		// If all marbles have finished, end the game
		if (_currentRace.marblesFinished === _currentRace.marbleEntries.length) {
			clearTimeout(_gameStateTimeout);
			_gameStateTimeout = setTimeout(() => {_setCurrentGameState(gameConstants.STATE_FINISHED);}, 2000);
		}
	};


	return {

		initialize() {
			// Physics initialisation
			physicsWorld.setTickRate(config.physics.steps);
			physicsWorld.eventEmitter.on("marbleFinished", (entryId) => {
				_onMarbleFinished(entryId);
			});

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
		},

		// Enters the player (or a bot) into the race if allowed
		addRaceEntry(id, name, attributes) {
			if (
				// Only allow marbles during entering phase
				( _currentGameState === gameConstants.STATE_WAITING || _currentGameState === gameConstants.STATE_ENTER )

				// or if this is a bot
				|| (_currentGameState !== gameConstants.STATE_FINISHED && _currentGameState !== gameConstants.STATE_LOADING && typeof id === "undefined")
			) {
				let isRaceFull = _currentRace.addRaceEntry(id, name, attributes);

				// Start the race countdown if no other players can join
				// Or start the enter period timeout if this was the first entry
				if(isRaceFull && (_currentGameState === gameConstants.STATE_WAITING || _currentGameState === gameConstants.STATE_ENTER)) {
					_setCurrentGameState(gameConstants.STATE_PREPARING);
					_gameplaySocket.emit(JSON.stringify({
						content: "The maximum amount of marbles has been hit! No more marbles can be entered for this round.",
						classNames: "red exclamation"
					}));
					log.info(`We reached the marble limit! (${_currentRace.raceEntries.length}/${config.marbles.rules.maxPlayerCount} entries, ${_currentRace.marbleEntries.length}/${config.marbles.rules.maxMarbleCount} marbles)`);
				}
				else if(_currentGameState === gameConstants.STATE_WAITING)
					_setCurrentGameState(gameConstants.STATE_ENTER);
			}
		},

		// Interrupts the race/pre-race, or ends the race early
		end(saveRoundResults = true) {
			if(_currentGameState === gameConstants.STATE_LOADING || _currentGameState === gameConstants.STATE_FINISHED)
				return;

			if(!saveRoundResults || _currentGameState !== gameConstants.STATE_STARTED) {
				_currentRace.round = null;
				log.info("Race has been aborted!");
			}

			_setCurrentGameState(gameConstants.STATE_FINISHED);
		},

		// Manually starts the race when in a valid state
		start() {
			if (_currentGameState === gameConstants.STATE_ENTER || _currentGameState === gameConstants.STATE_WAITING) {
				_setCurrentGameState(gameConstants.STATE_PREPARING);
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
			if(_currentRace && _currentRace.raceEntries.length > 0)
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

		getEnterPeriodTimeRemaining() {
			if(_enterPeriodStart === null)
				return config.marbles.rules.enterPeriod;
			else
				return Math.max(config.marbles.rules.enterPeriod * 1000 + _enterPeriodStart - Date.now(), 0);
		},

		// Used by the current race to send point gains/totals and pb status for all entries to the client
		onRaceResults(results) {
			_netGameUpdate.c = results;
		},

		// Used by the current race to notify newly spawned marbles to the client
		onSpawnedMarble(marble) {
			// Add entry for network update
			if(!_netGameUpdate.n)
				_netGameUpdate.n = [];
			_netGameUpdate.n.push(marble.entryId, marble.userId, marble.name, marble.size, marble.color, marble.skinId);
			_triggerNetworkUpdate();
		}
	};
}();

module.exports = game;
