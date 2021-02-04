const gameConstants = require("../../game-constants");
const config = require("../config");
const Marble = require("./marble");
const RaceEntry = require("./race-entry");
const db = require("../database/manager");
const physicsWorld = require("../../physics/world");
const skins = require("../skins");
const permissions = require("../chat/permissions");
const utility = require("../../utility");

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
	constructor(game, levelId) {
		this.game = game;
		this.raceEntries = [];
		this.pointContributors = 0;
		this.marbleEntries = [];
		this.marbleLimitReached = false;
		this.marblesFinished = 0;

		this.round = new Round(levelId);

		// Contains a set of functions that returns a valid value if the passed attribute string can be parsed correctly
		// Attributes/functions can be replaced/removed/added as needed
		this.marbleAttributeList = {
			color: {
				userValue: (userId, attribute) => {
					const colorRegEx = /#(?:[0-9a-fA-F]{3}){1,2}$/g;
					let match = attribute.match(colorRegEx);
					return match === null ? undefined : match[0];
				},
				defaultValue: () => {
					return utility.randomHexColor();
				}
			},
			size: {
				defaultValue: () => {
					// 2% chance for a entry's marbles to be of a random size between .3 and .6
					return Math.random() > .98 ? (.3 + Math.random() * .3) : 0.2;
				}
			},
			skinId: {
				userValue: (userId, attribute) => {
					let skinId = skins.idList[attribute];
					if (typeof skinId === "undefined")
						return undefined;

					// Check if this user has permission to use this skin
					if(	config.discord.enabled
						&& skins.skinList[skinId].premium
						&& !permissions.memberHasPermission(userId, "PREMIUM_SKINS")) {
						return undefined;
					}
					return skinId;
				},
				defaultValue: () => {
					return "default";
				}
			}
		};
	}

	//
	// State-related functions
	//

	onStateEnter() {
	}

	// Returns a promise that resolves once preparation has finished, or null if this state can be skipped
	onStatePreparing() {
		return null;
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

		physicsWorld.clearMarbles();
		physicsWorld.closeGates();
	}

	//
	// Non-state functions
	//

	// Returns true if the marble/entry limit has been reached
	addRaceEntry(id, name, attributeString = "") {
		// Don't add new player entries if the limit has been reached, or players that already entered
		// Exception: Added bots with a undefined id (only spawnable by devs/operators)
		if(typeof id === "string" && this.isRaceFull()
		|| (typeof id === "string" && typeof this.raceEntries.find(playerEntry => id === playerEntry.id) !== "undefined") ) {
			return this.isRaceFull();
		}

		let marbleAttributes = this.parseMarbleAttributes(id, attributeString);
		let entry = new RaceEntry(id, name, marbleAttributes);
		this.raceEntries.push(entry);

		this.onNewRaceEntry(entry);

		return this.isRaceFull();
	}

	// Returns a marbleAttributes object for the given user id and attributes string
	parseMarbleAttributes(id, attributeString) {
		let marbleAttributes = {};
		let messageSections = attributeString.split(" ").filter( (attr) => {return attr != "";}); // Split, filter out additional whitespaces
		messageSections.length = Math.min(messageSections.length, 4); // At most, check only the first 4 words

		// Set attributes based on user input
		for(let i = 0; i < messageSections.length; i++) {
			Object.keys(this.marbleAttributeList).forEach( attribute => {
				// If this attribute hasn't been set yet and supports user input, check for a match and set the property if we have a valid return value
				if(typeof marbleAttributes[attribute] === "undefined"
				&& typeof this.marbleAttributeList[attribute].userValue !== "undefined") {
					let match = this.marbleAttributeList[attribute].userValue(id, messageSections[i]);
					if(typeof match !== "undefined") {
						marbleAttributes[attribute] = match;
					}
				}
			});
		}

		// Set any default attributes that are (still) undefined
		Object.keys(this.marbleAttributeList).forEach( attribute => {
			if(typeof marbleAttributes[attribute] === "undefined"
			&& typeof this.marbleAttributeList[attribute].defaultValue !== "undefined") {
				marbleAttributes[attribute] = this.marbleAttributeList[attribute].defaultValue(id);
			}
		});

		return marbleAttributes;
	}

	onNewRaceEntry(entry) {
		// By default, spawn a marble right away
		this.spawnMarble(entry);
	}

	spawnMarble(entry) {
		let marble = new Marble(entry.id, this.marbleEntries.length, entry.name, entry.marbleAttributes);
		entry.marbles.push(marble);
		this.marbleEntries.push(marble);
		this.game.onSpawnedMarble(marble);
	}

	// Returns true if the player and/or marble limit has been reached for this race
	isRaceFull() {
		return this.getProjectedMarbleCount() >= config.marbles.rules.maxMarbleCount
			|| this.raceEntries.length >= config.marbles.rules.maxPlayerCount;
	}

	// Returns the current/expected marble count for the race
	getProjectedMarbleCount() {
		return this.raceEntries.length; // By default, we have one marble per entry
	}

	onMarbleFinished(entryId) {
		let marble = this.marbleEntries[entryId];
		if(marble.finished) {
			return;
		}

		let finishTime = Date.now();
		// Set their rank and final time
		marble.rank = this.marblesFinished++;
		marble.time = finishTime - this.round.start;
		marble.finished = true;

		// If this is the first finished marble, record it in the round data
		if(this.marblesFinished === 1) {
			this.round.timeBest = marble.time;
		}

		// Get raceEntry that belongs to this marble
		let raceEntry = this.raceEntries.find((raceEntry) => {
			return marble.userId === raceEntry.id;
		});

		if (raceEntry) {
			// Add their best time to the entry (so it can be stored in the case of a PB)
			if(typeof raceEntry.time === "undefined") {
				raceEntry.time = marble.time;
			}

			// Award points if eligible
			if(raceEntry.earnsPoints) {
				this.awardPoints(raceEntry, marble);
			}
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
			this.round.playersFinished = playerEntries.filter(playerEntry => playerEntry.hasFinished()).length;
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
			if(scoreResults.length > 0) {
				this.game.onRaceResults(scoreResults);
			}
		}
	}
}

module.exports = DefaultRace;
