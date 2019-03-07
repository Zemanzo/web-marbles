const log = require("./log");

module.exports = function(config, physics) {
	return {
		// Game logic
		state: "started", // "waiting", "enter", "starting", "started"
		setState(newState) {
			this._socketManager.emit(newState, "state");
			this.state = newState;
			log.info("Current state: ".magenta, this.state);
		},
		_startDelay: 2825, // length in ms of audio
		startTime: undefined,
		_entered: [],

		_waitingForEntry: true,
		addMarble(id, name, color) {
			// Only allow marbles during entering phase
			if (this.state === "waiting" || this.state === "enter") {

				// Make sure this person hasn't entered in this round yet
				if (!this._entered.includes(id)) {
					this._entered.push(id);
					this.spawnMarble(name, color);

					// Wait for a human entering the round before starting it
					if (this._waitingForEntry) {
						this._waitingForEntry = false;
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
		},

		spawnMarble(name, color) {
			let body = physics.marbles.createMarble(name, color);

			// Send client info on new marble
			this._socketManager.emit(JSON.stringify(body.tags), "new_marble");
		},

		getTimeRemaining() {
			return getTimeout(this.enterTimeout) || config.marbles.rules.enterPeriod;
		},

		end() {
			if (this.state === "started") {
				// Wait for a human to start the next round
				this._waitingForEntry = true;

				// Stop checking for finished marbles
				clearInterval(this._checkFinishedInterval);

				// Clear any remaining timeouts
				clearTimeout(this.gameplayMaxTimeout);
				clearTimeout(this.gameplayFinishTimeout);

				// Finishing variables back to default
				this._rank = 0;
				this._firstFinish = false;
				this.startTime = undefined;

				// Close the gate
				physics.closeGate();

				// Remove all marbles
				physics.marbles.destroyAllMarbles();

				// Clear the array of people that entered
				this._entered = [];

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
				}, this._startDelay);

				this._checkFinishedInterval = setInterval(this._checkFinished.bind(this), 50);

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

		_rank: 0,
		_firstFinish: false,
		_checkFinishedInterval: undefined,
		_checkFinished() {
			let finishTime = Date.now();
			let finished = physics.marbles.getFinishedMarbles();
			for (let i = 0; i < finished.length; i++) {
				let rank = physics.marbles.list[finished[i]].tags.rank = this._rank++,
					time = physics.marbles.list[finished[i]].tags.time = finishTime - this.startTime;

				// Send client info on finished marble
				this._socketManager.emit(JSON.stringify({
					id: finished[i],
					rank,
					time
				}), "finished_marble");

				if (this._firstFinish === false) {
					this._firstFinish = true;
					this.gameplayFinishTimeout = setTrackableTimeout(
						this.end.bind(this),
						config.marbles.rules.waitAfterFinish * 1000
					);
				}

				// If all marbles have finished, end the game
				console.log(this._rank, physics.marbles.list.length);
				if (this._rank === physics.marbles.list.length) {
					setTimeout(this.end.bind(this), 2000);
				}
			}
		},

		setSocketManager(socketManager) {
			this._socketManager = socketManager;
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
