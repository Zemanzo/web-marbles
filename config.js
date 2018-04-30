var config = {};

/* Marbles */
config.marbles = {};
config.marbles.resources = "resources/";
config.marbles.maprotation = [
	"map1",
	"map2"
];

/* Physics */
config.physics = {};
config.physics.gravity = -10;
config.physics.steps = 120; // Amount of physics steps to calculate per second.

/* Express */
config.express = {};
config.express.port = 3004;
config.express.cache = false;

/* Network */
config.network = {};
config.network.tickrate = 20; // Max amount of times physics data should be sent to clients per second.

module.exports = config;