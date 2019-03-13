const log = require("./log");

module.exports = function(config, physics) {
	let _startDelay = 2825, // length in ms of audio
		_entered = [],
		_waitingForEntry = true,
		_socketManager = undefined,
		_rank = 0,
		_firstFinish = false,
		_checkFinishedInterval = undefined,
		_checkFinished = function() {
			let finishTime = Date.now();
			let finished = physics.marbles.getFinishedMarbles();
			for (let i = 0; i < finished.length; i++) {
				let rank = physics.marbles.list[finished[i]].tags.rank = _rank++,
					time = physics.marbles.list[finished[i]].tags.time = finishTime - this.startTime;

				// Send client info on finished marble
				_socketManager.emit(JSON.stringify({
					id: finished[i],
					rank,
					time
				}), "finished_marble");

				if (_firstFinish === false) {
					_firstFinish = true;
					this.gameplayFinishTimeout = setTrackableTimeout(
						this.end.bind(this),
						config.marbles.rules.waitAfterFinish * 1000
					);
				}

				// If all marbles have finished, end the game
				console.log(_rank, physics.marbles.list.length);
				if (_rank === physics.marbles.list.length) {
					setTimeout(this.end.bind(this), 2000);
				}
			}
		};

	return {
		state: "started", // "waiting", "enter", "starting", "started"
		startTime: undefined,
		limitReached: false,

		setState(newState) {
			_socketManager.emit(newState, "state");
			this.state = newState;
			log.info("Current state: ".magenta, this.state);
		},

		addMarble(id, name, color) {
			// Only allow marbles during entering phase
			if (this.state === "waiting" || this.state === "enter") {

				// Make sure this person hasn't entered in this round yet
				if (!_entered.includes(id)) {

					// Check whether we have reached the maximum marble limit
					if (physics.marbles.list.length < config.marbles.rules.maxMarbleCount) {
						_entered.push(id);
						this.spawnMarble(name, color);

						// Wait for a human entering the round before starting it
						if (_waitingForEntry) {
							_waitingForEntry = false;
							this.setState("enter");

							// Start the game after the entering period is over
							clearTimeout(this.enterTimeout);
							this.enterTimeout = setTrackableTimeout(
								this.start.bind(this),
								config.marbles.rules.enterPeriod * 1000
							);
						}
					}
				}
			}
		},

		spawnMarble(name, color) {
			let body = physics.marbles.createMarble(name, color);

			// Send client info on new marble
			_socketManager.emit(JSON.stringify(body.tags), "new_marble");

			// Check for marble limit
			if (physics.marbles.list.length >= config.marbles.rules.maxMarbleCount && !this.limitReached) {
				this.limitReached = true;
				_socketManager.emit(JSON.stringify({
					content: "The maximum amount of marbles has been hit! No more marbles can be entered for this round."
				}), "notification");
				this.start();
				log.info(`We reached the marble limit! (${config.marbles.rules.maxMarbleCount})`);
			}
		},

		getTimeRemaining() {
			return getTimeout(this.enterTimeout) || config.marbles.rules.enterPeriod;
		},

		end() {
			if (this.state === "started") {
				// Wait for a human to start the next round
				_waitingForEntry = true;

				// Stop checking for finished marbles
				clearInterval(_checkFinishedInterval);

				// Clear any remaining timeouts
				clearTimeout(this.gameplayMaxTimeout);
				clearTimeout(this.gameplayFinishTimeout);

				// Finishing variables back to default
				_rank = 0;
				_firstFinish = false;
				this.startTime = undefined;

				// Close the gate
				physics.closeGate();

				// Remove all marbles
				physics.marbles.destroyAllMarbles();

				// Clear the array of people that entered
				_entered = [];

				// If we had hit the marble limit on the previous round, that's no longer true
				this.limitReached = false;

				// Set state and inform the client
				this.setState("waiting");

				return true;
			} else {
				return false;
			}
		},

		start() {
			if (this.state === "enter" || this.state === "waiting") {
				this.setState("starting");

				setTimeout(() => {
					this.setState("started");

					this.startTime = Date.now();

					physics.openGate();

					// Add bot marble to ensure physics not freezing
					this.spawnMarble("Nightbot", "#000000");
				}, _startDelay);

				_checkFinishedInterval = setInterval(_checkFinished.bind(this), 50);

				// Set end of game timer
				this.gameplayMaxTimeout = setTrackableTimeout(
					this.end.bind(this),
					config.marbles.rules.maxRoundLength * 1000
				);

				return true;
			} else {
				return false;
			}
		},

		setSocketManager(socketManager) {
			_socketManager = socketManager;
		}
	};
};

// Based on https://stackoverflow.com/questions/3144711/find-the-time-left-in-a-settimeout/36389263#36389263
let timeoutMap = {};
function setTrackableTimeout(callback, delay) {
	// Run the original, and store the id
	let id = setTimeout(callback, delay);

	// Store the start date and delay
	timeoutMap[id] = [Date.now(), delay];

	// Return the id
	return id;
}

// The actual getTimeLeft function
function getTimeout(id) {
	let m = timeoutMap[id]; // Find the timeout in map

	// If there was no timeout with that id, return NaN, otherwise, return the time left clamped to 0
	return m ? Math.max(m[1] + m[0] - Date.now(), 0) : NaN;
}
