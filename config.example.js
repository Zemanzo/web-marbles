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

/* Editor */
config.editor = {};
config.editor.enabled = false;

/* Discord integration */
config.discord = {};
config.discord.clientId = "<your-client-id-here>";
config.discord.clientSecret = "<your-client-secret-here>";
config.discord.botToken = "<your-bot-token-here>";
config.discord.redirectUriRoot = "http://localhost:3004/"; // Be sure to add trailing slash
config.discord.scope = "connections identify"; // Space separated
config.discord.gameplayChannelId = "<channel-id-of-gameplay-chat>";
config.discord.useOAuth2State = false; // More secure, but not implemented yet...

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