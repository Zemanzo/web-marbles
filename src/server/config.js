// Note: Do NOT modify this config file directly!
// If you want to override any settings,
// please do so in config.user.js!

const clientConfig = require("../client/config");
const userConfig = require("./config.user");
const config = {};

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
		name: "LAIKA bot"
	}, {
		name: "Hirona bot"
	}, {
		name: "Racherona bot"
	}, {
		name: "A Generic Gamer bot"
	}, {
		name: "Kcaz95 bot"
	}, {
		name: "Rhyjohnson bot"
	}, {
		name: "Nightbot",
		color: "#000000"
	}
];

// Game rules -- Move this to the mapRotation and have it set per map.
config.marbles.rules = {};
config.marbles.rules.maxPlayerCount = 250; // Maximum amount of players that can enter in a single round
config.marbles.rules.maxMarbleCount = 500; // Maximum amount of marbles that can be entered in a single round
config.marbles.rules.enterPeriod = 40; // Time in seconds
config.marbles.rules.maxRoundLength = 160; // Time in seconds
config.marbles.rules.waitAfterFinish = 40; // Time in seconds

/* Database */
config.database = {};
config.database.path = "web-marbles.db3";

/* Editor */
config.editor = {};
config.editor.enabled = true;

/* Discord integration */
config.discord = {};

config.discord.clientId = "<USE CONFIG.USER.JS OVERRIDE>";
config.discord.clientSecret = "<USE CONFIG.USER.JS OVERRIDE>";

config.discord.botToken = "<USE CONFIG.USER.JS OVERRIDE>";
config.discord.redirectUriRoot = "http://localhost:3004/"; // Be sure to add trailing slash
config.discord.scope = "connections identify"; // Space separated
config.discord.useOAuth2State = false; // More secure, but not implemented yet...

// Server variables
config.discord.inviteLink = "https://discord.gg/1234567";
config.discord.gameplayChannelId = "<USE CONFIG.USER.JS OVERRIDE>";

config.discord.webhookId = "<USE CONFIG.USER.JS OVERRIDE>"; // Create a default webhook to your gameplay channel
config.discord.webhookToken = "<USE CONFIG.USER.JS OVERRIDE>";

/* Physics */
config.physics = {};
config.physics.gravity = -10;
config.physics.steps = 120; // Amount of physics steps to calculate per second.

/* Express */
config.express = {};
config.express.port = 3004;
config.express.cache = false;

/* µWebSockets */
config.uwebsockets = {};
config.uwebsockets.port = clientConfig.network.websockets.port;
config.uwebsockets.keyFileName = "misc/key.pem";
config.uwebsockets.certFileName = "misc/cert.pem";
config.uwebsockets.passphrase = "1234";

/* Network */
config.network = {};
config.network.ssl = clientConfig.network.ssl;
config.network.tickrate = 20; // Max amount of times physics data should be sent to clients per second.

/* Override any user properties set in config.user.js */
for(let key in userConfig) {
	let obj = config;
	let property;

	key.split(".").forEach( function(val) {
		if(obj) {
			if(typeof obj[val] !== "undefined") {
				if(typeof obj[val] === "object") {
					obj = obj[val]; // change to child object
				} else {
					property = val; // obj[property] is the property to set
				}
			} else {
				obj = null; // Property doesn't exist
			}
		}
	} );

	if(obj && property) {
		obj[property] = userConfig[key];
	} else {
		console.warn(`Warning: Cannot override non-existing config property: config.${key}`);
	}
}

// Environment variable overrides
if (process.env.DISCORD_CLIENT_ID)				config.discord.clientId				= process.env.DISCORD_CLIENT_ID;
if (process.env.DISCORD_CLIENT_SECRET)			config.discord.clientSecret			= process.env.DISCORD_CLIENT_SECRET;
if (process.env.DISCORD_BOT_TOKEN)				config.discord.botToken				= process.env.DISCORD_BOT_TOKEN;
if (process.env.DISCORD_GAMEPLAY_CHANNEL_ID)	config.discord.gameplayChannelId	= process.env.DISCORD_GAMEPLAY_CHANNEL_ID;
if (process.env.DISCORD_WEBHOOK_ID)				config.discord.webhookId			= process.env.DISCORD_WEBHOOK_ID;
if (process.env.DISCORD_WEBHOOK_TOKEN)			config.discord.webhookToken			= process.env.DISCORD_WEBHOOK_TOKEN;

module.exports = config;
