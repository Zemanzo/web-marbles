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
config.marbles.bots = {};
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
		name: "Rhyjohnson bot"
	},{
		name: "Nightbot",
		color: "#000000"
	}
];

// Game rules -- Move this to the mapRotation and have it set per map.
config.marbles.rules = {};
config.marbles.rules.enterPeriod = 40; // Time in seconds
config.marbles.rules.maxRoundLength = 160; // Time in seconds
config.marbles.rules.waitAfterFinish = 40; // Time in seconds

/* Twitch connection */
config.twitch = {};
config.twitch.clientId = "<your-client-id-here>";
config.twitch.clientSecret = "<your-client-secret-here>";
config.twitch.root = "http://localhost:3004/"; // Be sure to add trailing slash
config.twitch.redirectUri = "twitch"; // NO trailing or preceding slash here

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