const config = require("../config");

class RaceEntry {
	constructor(id, name, marbleAttributes = {}) {
		this.id = id;
		this.isHuman = true;
		this.contributesPoints = true;
		this.earnsPoints = true;
		this.name = name;
		this.time = undefined;
		this.pointsEarned = config.marbles.scoring.pointsAwardedForEntering;
		this.marbles = []; // Array of Marble objects
		this.marbleAttributes = marbleAttributes;

		if(typeof id === "undefined") {
			this.isHuman = false;
			this.contributesPoints = false;
			this.earnsPoints = false;
			this.pointsEarned = 0;
		}
	}

	hasFinished() {
		return this.getFinishedMarbleCount() > 0;
	}

	getEnteredMarbleCount() {
		return this.marbles.length;
	}

	getFinishedMarbleCount() {
		return this.marbles.filter(marble => marble.finished).length;
	}
}

module.exports = RaceEntry;
