const log = require("../../log");
const { parentPort, isMainThread } = require("worker_threads");

// Fetch and validate levels
const levelManager = require("../levels/manager");

const raceWorker = function() {
	//let _nothing = undefined;

	log.warn(`We're here! And we're${(isMainThread ? "" : " NOT")} on the main thread!`);

	parentPort.once("message", (value) => {
		value.workerMessagePort.postMessage("Race Control to Major Tom");
		//value.workerMessagePort.close();

		levelManager.retrieveLevels().then(() => {
			//game.initialize();
			value.workerMessagePort.postMessage(`Found ${levelManager.availableLevels.length} valid levels!`);
		}).catch((error) => {
			//throw new Error(`Initialization failed during loading of assets: ${error}`);
			value.workerMessagePort.postMessage(`Level check failed: ${error}`);
		});
	});

	return {
		// TODO: Functionalities
		// For races: Open/close gates, create/destroy a marble, receive events (e.g. finish)
		// For game.js: retrieveLevels, loadLevel, physicsMarble data
		// ...And make it work single-threaded too for debugging purposes
	};
}();

module.exports = raceWorker;
