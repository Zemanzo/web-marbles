const log = require("../../log");
const { parentPort, isMainThread } = require("worker_threads");
const levelManager = require("../levels/manager");

const raceWorker = function() {
	let _raceControl = null;
	let _levelControl = null;
	let _marbleData = null;

	let _onLevelControlMessage = function(data) {
		log.info(`Received level load request for: ${data.loadLevel}`);
		if(typeof data.loadLevel === "string") {
			// Prepare message object to send back to the main thread
			let loadedLevel = {
				ready: false,
				levelName: data.loadLevel,
				authorName: null,
				levelId: null,
				roundLength: 0
			};
			levelManager.loadLevel(data.loadLevel).then( (levelData) => {
				if(levelData) {
					// Fill in the remaining data the main thread wouldn't have access to, but probably needs
					loadedLevel.ready = true;
					loadedLevel.authorName = levelData.authorName;
					loadedLevel.levelId = levelData.getLevelId();
					loadedLevel.roundLength = levelData.gameplay.roundLength;
				}
				_levelControl.postMessage({loadedLevel});
			});
		}
	};

	return {
		// TODO: Functionalities
		// For races: Open/close gates, create/destroy a marble, receive events (e.g. finish)
		// For game.js: retrieveLevels, loadLevel, physicsMarble data

		initialize(messagePorts) {
			log.warn(`We're here! And we're${(isMainThread ? "" : " NOT")} on the main thread!`);
			_raceControl = messagePorts.raceControl;
			_levelControl = messagePorts.levelControl;
			_marbleData = messagePorts.marbleData;

			// Set up message port callbacks
			_levelControl.on("message", (data) => {
				_onLevelControlMessage(data);
			});

			// Retrieve/check for available levels
			levelManager.retrieveLevels().then(() => {
				_levelControl.postMessage({
					availableLevels: levelManager.availableLevels
				});
			}).catch((error) => {
				throw new Error(`Initialization failed during loading of assets: ${error}`);
			});
		}
	};
}();


// If we're in a worker thread, handle module initialization by listening to the parent port
if(!isMainThread) {
	parentPort.once("message", (value) => {
		raceWorker.initialize(value);
	});
}

module.exports = raceWorker;
