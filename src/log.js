const utility = require("./utility.js");
require("colors"); // Fixes colored text strings for worker thread logging

module.exports = {
	info: function(message, ...args) {
		console.log(`[${utility.currentTimeString()}] ${message}`, ...args);
	},

	warn: function(message, ...args) {
		console.log(`[${utility.currentTimeString().yellow}] ${message}`, ...args);
	},

	error: function(message, ...args) {
		console.log(`[${utility.currentTimeString().red}] ${message}`, ...args);
	},

	throw: function(message) {
		throw `[${utility.currentTimeString().red}] ${"[FATAL]".red} ${message}`;
	}
};
