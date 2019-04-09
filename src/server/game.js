const log = require("../log");
const config = require("./config");
const physics = require("./physics/manager");
const maps = require("./maps/manager");
const db = require("./database/manager");

function Marble(id, entryId, name, color) {
	this.userId = id;
	this.entryId = entryId;
	this.useFancy = Math.random() > .99;
	this.color = color || _randomHexColor();
	this.name = name || "Nightbot";
	this.size = (Math.random() > .95 ? (.3 + Math.random() * .7) : false) || 0.2;
	this.ammoBody = null;
	this.finished = false;
	this.rank = null;
	this.time = null;
}

Marble.prototype.onMarbleFinish = function() {
	if(this.finished === false) {
		game.marbleFinished(this);
		this.finished = true;
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
		_checkFinishedInterval = null,

		_gameplayParameters = null,

		_mapFileName = null,

		_round = null;

	maps.currentMapData.then((map) => {
		_gameplayParameters = map.gameplay;
	});

	maps.currentMapName.then((mapFileName) => {
		_mapFileName = mapFileName;
	});

	let _generateNewRoundData = function() {
		return {
			start: null,
			end: null,
			timeBest: null,
			mapId: _mapFileName,
			pointsAwarded: 0,
			playersEntered: 0,
			playersFinished: 0,
			playersNotFinished: 0,
			marblesEntered: 0,
			marblesFinished: 0,
			marblesNotFinished: 0
		};
	};

	let _checkFinished = function() {
		// Check for newly finished marbles
		// This function is a placeholder for bullet callbacks
		let transform = new physics.ammo.btTransform();
		for (let i = 0; i < _marbles.length; i++) {
			let ms = _marbles[i].ammoBody.getMotionState();
			if (ms) {
				ms.getWorldTransform(transform);
				let p = transform.getOrigin();
				if ( p.y() < -5) {
					_marbles[i].onMarbleFinish();
				}
			}
		}
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

	return {
		currentGameState: "started", // "waiting", "enter", "starting", "started"
		startTime: null,
		limitReached: false,
		enterTimeout: null,

		// Sets currentGameState and informs all connected clients about the state change
		setCurrentGameState(newState) {
			_socketManager.emit(newState, "state");
			this.currentGameState = newState;
			log.info("Current state: ".magenta, this.currentGameState);
		},

		// Enters the player into the race if allowed
		addPlayerEntry(id, name, color) {
			if (
				// Only allow marbles during entering phase
				( this.currentGameState === "waiting" || this.currentGameState === "enter" )

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
				this.spawnMarble(id, name, color);

				// Wait for a human entering the round before starting it
				if (_isWaitingForEntry) {
					_isWaitingForEntry = false;
					this.setCurrentGameState("enter");

					// Start the game after the entering period is over
					clearTimeout(this.enterTimeout);
					this.enterTimeout = _setTrackableTimeout(
						this.start.bind(this),
						_gameplayParameters.defaultEnterPeriod * 1000
					);
				}
			}
		},

		// Spawns marble unless the maximum amount of marbles has been hit
		spawnMarble(id, name, color) {
			// Check whether we have reached the maximum marble limit
			if (_marbles.length >= config.marbles.rules.maxMarbleCount) return;

			let newMarble = new Marble(id, _marbles.length, name, color);
			physics.world.createMarble(newMarble);
			_marbles.push(newMarble);

			// Send client info on new marble, without the ammoBody property
			function omitter(key, value) {
				if(key === "ammoBody") return undefined;
				return value;
			}
			_socketManager.emit(JSON.stringify(newMarble, omitter), "new_marble");

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
				}), "notification");
				this.start();
				log.info(`We reached the marble limit! (${config.marbles.rules.maxMarbleCount})`);
			}
		},

		end() {
			if (this.currentGameState === "started") {
				// Set the last few round parameters and store it in the database
				if (_round) {
					_round.end = Date.now();
					_round.playersEntered = _playersEnteredList.length;
					_round.playersFinished = _playersEnteredList.filter(playerEntry => playerEntry.finished).length;
					_round.playersNotFinished = _round.playersEntered - _round.playersFinished;
					_round.marblesEntered = _marbles.length;
					_round.marblesNotFinished = _round.marblesEntered - _round.marblesFinished;

					db.round.insertNewRound(_round);

					db.user.batchUpdateStatistics(_playersEnteredList);

					db.personalBest.batchInsertOrUpdatePersonalBest(_playersEnteredList, _mapFileName);
				}

				// Stop checking for finished marbles
				clearInterval(_checkFinishedInterval);

				// Clear any remaining timeouts
				clearTimeout(this.gameplayMaxTimeout);
				clearTimeout(this.gameplayFinishTimeout);

				// Finishing variables back to default
				_marblesFinished = 0;
				_firstMarbleHasFinished = false;
				this.startTime = undefined;

				// Close the gate
				physics.world.setAllGatesState("close");

				// Remove all marbles
				for (let i = _marbles.length - 1; i >= 0; --i) {
					physics.world.destroyMarble(_marbles[i]);
				}
				_marbles = [];

				// Clear the array of people that entered
				_playersEnteredList = [];

				// If we had hit the marble limit on the previous round, that's no longer true
				this.limitReached = false;

				// Create new round data
				_round = _generateNewRoundData();

				// Wait for a human to start the next round
				_isWaitingForEntry = true;

				// Set state and inform the client
				this.setCurrentGameState("waiting");

				return true;
			} else {
				return false;
			}
		},

		start() {
			if (this.currentGameState === "enter" || this.currentGameState === "waiting") {
				this.setCurrentGameState("starting");

				// Have the audio clip play on the cleint before actually starting the race
				setTimeout(() => {
					this.setCurrentGameState("started");

					_round.start = this.startTime = Date.now();

					physics.world.setAllGatesState("open");
					for(let i = 0; i < _marbles.length; i++) {
						_marbles[i].ammoBody.activate();
					}
				}, _startDelay);

				// During the racing period, check if marbles have finished yet.
				// TODO: Should be improved using Bullet callbacks (so none of this checking 20 times per second stuff)
				_checkFinishedInterval = setInterval(_checkFinished.bind(this), 50);

				// Set timeout that ends the game if the round takes too long to end (e.g. all marbles getting stuck)
				this.gameplayMaxTimeout = _setTrackableTimeout(
					this.end.bind(this),
					_gameplayParameters.roundLength * 1000
				);

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

			// Send client info on finished marble
			_socketManager.emit(JSON.stringify({
				id: marble.entryId,
				rank,
				time
			}), "finished_marble");

			// If this is the first marble that finished, set a timeout to end the game soon
			if (_firstMarbleHasFinished === false) {
				_firstMarbleHasFinished = true;

				// Set round time
				_round.timeBest = time;

				this.gameplayFinishTimeout = _setTrackableTimeout(
					this.end.bind(this),
					_gameplayParameters.timeUntilDnf * 1000
				);
			}

			// If all marbles have finished, end the game
			if (_marblesFinished === _marbles.length) {
				setTimeout(this.end.bind(this), 2000);
			}
		},

		getEnterPeriodTimeRemaining() {
			return _getTimeout(this.enterTimeout) || _gameplayParameters.defaultEnterPeriod;
		},

		setSocketManager(socketManager) {
			_socketManager = socketManager;
		},

		getMarbles() {
			return _marbles;
		},

		getMarbleTransformations() {
			if(_marbles.length === 0) return null;

			let transform = new physics.ammo.btTransform();
			let _pos = new Float32Array(_marbles.length * 3);
			let _rot = new Float32Array(_marbles.length * 4);

			for (let i = 0; i < _marbles.length; i++) {
				let ms = _marbles[i].ammoBody.getMotionState();
				if (ms) {
					ms.getWorldTransform( transform );
					let p = transform.getOrigin();
					let q = transform.getRotation();

					_pos[i * 3 + 0] = p.x();
					_pos[i * 3 + 1] = p.z();
					_pos[i * 3 + 2] = p.y();

					_rot[i * 4 + 0] = q.x();
					_rot[i * 4 + 1] = q.z();
					_rot[i * 4 + 2] = q.y();
					_rot[i * 4 + 3] = q.w();
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
