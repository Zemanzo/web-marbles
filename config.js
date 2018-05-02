var config = {};

/* Marbles */
config.marbles = {};
config.marbles.resources = "public/resources/"; // Be sure to add trailing slash
config.marbles.mapRotation = [
	{
		name: "map4v2.obj",
		startGate: {
			position: {x: -23, y: 8, z: 50},
			size: [7.5, 6, .5]
		}
	}
];
// Bots
config.marbles.bots = {}
config.marbles.bots.names = [
	{
		name: "LAIKA bot",
	},{
		name: "Hirona bot"
	},{
		name: "Racherona bot"
	},{
		name: "A Generic Gamer bot"
	},{
		name: "Kcaz95 bot"
	},{
		name: "Nightbot",
		color: "#000000"
	}
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