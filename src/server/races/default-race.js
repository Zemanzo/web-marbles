const gameConstants = require("../../game-constants");
const config = require("../config");
const Marble = require("./marble");
const db = require("../database/manager");
const physicsWorld = require("../../physics/world");

class RaceEntry {
	constructor(id, name, marbleAttributes = {}) {
		this.id = id;
		this.isHuman = true;
		this.contributesPoints = true;
		this.earnsPoints = true;
		this.name = name;
		this.finished = false; // TODO: Redundant with marblesFinished?
		this.time = undefined;
		this.pointsEarned = config.marbles.scoring.pointsAwardedForEntering;
		this.marbles = [];
		this.marbleAttributes = marbleAttributes;
		this.marblesEntered = 0; // TODO: Redundant, can be read from marbles.length
		this.marblesFinished = 0; // TODO: Maybe redundant? Could be wrapped in a function

		if(typeof id === "undefined") {
			this.isHuman = false;
			this.contributesPoints = false;
			this.earnsPoints = false;
			this.pointsEarned = 0;
		}
	}
}

// Object containing all race data to be recorded in the database
function Round(levelId) {
	this.start = null;
	this.end = null;
	this.timeBest = null;
	this.levelId = levelId;
	this.pointsAwarded = 0;
	this.playersEntered = 0;
	this.playersFinished = 0;
	this.playersNotFinished = 0;
	this.marblesEntered = 0;
	this.marblesFinished = 0;
	this.marblesNotFinished = 0;
}

class DefaultRace {
	constructor(game, raceControl, levelId) {
		this.game = game;
		this.raceControl = raceControl;
		this.raceEntries = [];
		this.pointContributors = 0;
		this.marbleEntries = [];
		this.marbleLimitReached = false;
		this.marblesFinished = 0;

		this.round = new Round(levelId);
	}

	// State-related functions

	onStateEnter() {
	}

	onStatePreparing() {
		// TODO: Currently unused, but could be useful for some race types in the future
	}

	onStateStarting() {
		// Default point contribution rules
		// Other race types may want to override this with their own
		this.pointContributors = this.raceEntries.filter(entry => entry.contributesPoints).length;
	}

	onStateStarted() {
		this.round.start = Date.now();
		physicsWorld.openGates();
	}

	onStateFinished() {
		this.finalizeRound();

		physicsWorld.closeGates();
		physicsWorld.stopUpdateInterval();

		// Remove all marbles
		for (let i = this.marbleEntries.length - 1; i >= 0; --i) {
			this.marbleEntries[i].destroyMarble();
		}
	}

	//
	// Non-state functions
	//

	// Returns true if the marble/entry limit has been reached
	addRaceEntry(id, name, marbleAttributes = {}) {
		// Don't add new player entries if the limit has been reached, or players that already entered
		// Exception: Added bots with a undefined id (only spawnable by devs/operators)
		if(typeof id === "string" && this.isRaceFull()
		|| (typeof id === "string" && typeof this.raceEntries.find(playerEntry => id === playerEntry.id) !== "undefined") )
			return this.isRaceFull();

		let entry = new RaceEntry(id, name, marbleAttributes);
		this.raceEntries.push(entry);

		this.onNewRaceEntry(entry);

		return this.isRaceFull();
	}

	onNewRaceEntry(entry) {
		this.spawnMarble(entry);
	}

	spawnMarble(entry) {
		let marble = new Marble(entry.id, this.marbleEntries.length, entry.name, entry.marbleAttributes);
		entry.marbles.push(marble);
		entry.marblesEntered++;
		this.marbleEntries.push(marble);
		this.game.onSpawnedMarble(marble);

		if(this.marbleEntries.length === 1)
			physicsWorld.startUpdateInterval(); //TODO: Let physics handle this automatically
	}

	// Returns true if the player and/or marble limit has been reached for this race
	isRaceFull() {
		return this.marbleEntries.length >= config.marbles.rules.maxMarbleCount
			|| this.raceEntries.length >= config.marbles.rules.maxPlayerCount;
	}

	onMarbleFinished(entryId) {
		let marble = this.marbleEntries[entryId];
		if(marble.finished)
			return;

		let finishTime = Date.now(); // TODO: May be *slightly* inaccurate, more so in laggy situations. Maybe prefer frame-counting in physics instead
		// Set their rank and final time
		marble.rank = this.marblesFinished++;
		marble.time = finishTime - this.round.start;
		marble.finished = true;

		// If this is the first finished marble, record it in the round data
		if(this.marblesFinished === 1)
			this.round.timeBest = marble.time;

		// Get raceEntry that belongs to this marble
		let raceEntry = this.raceEntries.find((raceEntry) => {
			return marble.userId === raceEntry.id;
		});

		if (raceEntry) {
			// Mark them as finished
			raceEntry.finished = true;
			raceEntry.marblesFinished++;

			// Add their best time to the entry (so it can be stored in the case of a PB)
			if(typeof raceEntry.time === "undefined")
				raceEntry.time = marble.time;

			// Award points if eligible
			if(raceEntry.earnsPoints)
				this.awardPoints(raceEntry, marble);
		}
	}

	awardPoints(raceEntry, marble) {
		raceEntry.pointsEarned += this.calculateAwardedPoints(marble.rank, this.pointContributors);
	}

	// Technically a helper function, but other race types may want to override it for their own point distribution
	calculateAwardedPoints(rank, pointContributors) {
		let P = pointContributors; // Amount of entries that contribute to the point pool
		let G = config.marbles.scoring.pointScale; // Percentage of marbles that finish that will receive more than 1 points for finishing

		return Math.max(
			Math.ceil(
				P / ( P ** (G / P) ) ** rank
			),

			// Finishing always gives you at least 1 additional point
			1
		) + config.marbles.scoring.pointsAwardedForFinishing; // Plus potential bonus for finishing
	}

	finalizeRound() {
		// Set the last few round parameters and store it in the database
		// If round is null, the results are discarded and the race is considered aborted
		if(this.round) {
			// Prepare quicklist for all human entries
			let playerEntries = this.raceEntries.filter(entry => entry.isHuman);

			// Calculate total earned points from all entries
			let totalPointsAwarded = 0;
			for (let entry of this.raceEntries) {
				totalPointsAwarded += entry.pointsEarned;
			}

			this.round.end = Date.now();
			this.round.pointsAwarded = totalPointsAwarded;
			this.round.playersEntered = playerEntries.length;
			this.round.playersFinished = playerEntries.filter(playerEntry => playerEntry.finished).length;
			this.round.playersNotFinished = this.round.playersEntered - this.round.playersFinished;
			this.round.marblesEntered = this.marbleEntries.length;
			this.round.marblesFinished = this.marblesFinished;
			this.round.marblesNotFinished = this.round.marblesEntered - this.round.marblesFinished;

			db.round.insertNewRound(this.round);
			db.user.batchUpdateStatistics(playerEntries);

			// Update personal bests where applicable. Returns array with all IDs that got a PB this round.
			let personalBestIds = db.personalBest.batchInsertOrUpdatePersonalBest(playerEntries, this.round.levelId);

			// Get points of all users that participated in this race. Returns array with objects: { stat_points_earned: <POINTS>, id: <USERID> }
			let pointTotals = db.user.batchGetPoints(playerEntries);

			// Gather up point gains/total and pb status for all players, to be sent to the client
			let scoreResults = [];
			// Points earned in this round
			for (let player of playerEntries) {
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
				scoreResults.push(player.id, player.pointsEarned, pointTotal, record);
			}
			if(scoreResults.length > 0)
				this.game.onRaceResults(scoreResults);
		}
	}
}

module.exports = DefaultRace;
