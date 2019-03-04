const log = require("./log");

module.exports = function(config, physics, socketManager) {
	// Game logic
	let game = {
		logic: {
			state: "started" // "enter", "started"
		},
		startDelay: 2825, // length in ms of audio
		entered: []
	};

	game.addMarble = function(id, name, color) {
		// Only allow marbles during entering phase
		if (game.logic.state === "enter") {

			// Make sure this person hasn't entered in this round yet
			if (!game.entered.includes(id)) {
				game.entered.push(id);
				game.spawnMarble(name, color);
			}
		}
	};

	game.spawnMarble = function(name, color) {
		let body = physics.marbles.createMarble(name, color);

		// Send client info on new marble
		socketManager.emit(JSON.stringify(body.tags), "new_marble");
	};

	game.getTimeRemaining = function() {
		return getTimeout(game.enterTimeout);
	};

	game.end = function() {
		if (game.logic.state === "started") {
			game.logic.state = "enter";
			log.info("Current state: ".magenta, game.logic.state);

			// Close the gate
			physics.closeGate();

			// Remove all marbles
			physics.marbles.destroyAllMarbles();

			// Clear the array of people that entered
			game.entered = [];

			// Send clients game restart so they can clean up on their side
			socketManager.emit("true", "clear");

			// Start the game after the entering period is over
			clearTimeout(game.enterTimeout);
			game.enterTimeout = setTrackableTimeout(
				game.start,
				config.marbles.rules.enterPeriod * 1000
			);

			return true;
		} else {
			return false;
		}
	};

	game.start = function() {
		if (game.logic.state === "enter") {
			game.logic.state = "started";
			log.info("Current state: ".magenta, game.logic.state);
			socketManager.emit("true", "start");

			setTimeout(function() {
				physics.openGate();

				// Add bot marble to ensure physics not freezing
				game.spawnMarble("Nightbot", "#000000");
			}, game.startDelay);

			clearTimeout(game.gameplayTimeout);
			game.gameplayTimeout = setTrackableTimeout(
				game.end,
				config.marbles.rules.maxRoundLength * 1000
			);

			return true;
		} else {
			return false;
		}
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

	return game;
};
