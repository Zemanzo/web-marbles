// Note: Do NOT modify this config file directly!
// If you want to override any settings,
// please do so in config.user.js!

const clientConfig = require("../client/config");
const userConfig = require("./config.user");
const config = {};

/* Marbles */
config.marbles = {};
config.marbles.resources = "public/resources/"; // Be sure to add trailing slash

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

// Global game rules
config.marbles.rules = {};
config.marbles.rules.maxPlayerCount = 250; // Maximum amount of players that can enter in a single round
config.marbles.rules.maxMarbleCount = 500; // Maximum amount of marbles that can be entered in a single round
config.marbles.rules.enterPeriod = 20; // Time in seconds
config.marbles.rules.finishPeriod = 15; // Time in seconds
config.marbles.rules.timeUntilDnf = 30; // Time in seconds

// Earning points
config.marbles.scoring = {};

// Points a player will receive for entering. Negative values are also supported.
config.marbles.scoring.pointsAwardedForEntering = 1;

// Addtional points a player will receive for finishing. Negative values are also supported.
// NOTE: The current formula always gives at least 1 point for finishing!
config.marbles.scoring.pointsAwardedForFinishing = 0;

// This value determines the scale at which points are distributed to marbles that finish.
// The formula used is the following, where G is the value adjustable here and P the amount of player-entered marbles:
// points = Math.max( Math.ceil( P / (P ** (G / P)) ** rank ), 1 )
// Examples:
// G = 1.5; 1 / G = 0.667 = 66.7% of all entrants will receive more than one point for finishing.
// G = 2.0; 1 / G = 0.500 = 50.0% of all entrants will receive more than one point for finishing.
config.marbles.scoring.pointScale = 1.5;

/* Levels */
config.levels = {};
config.levels.folderPath = `${__dirname}/../../public/resources/maps`;

/* Database */
config.database = {};
config.database.path = "web-marbles.db3";

/* Editor */
config.editor = {};
config.editor.enabled = true;

/* Discord integration */
config.discord = {};
config.discord.enabled = true; // Disabling Discord should only be done when debugging! This is not for production.

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
config.network.tickRate = 10; // Max amount of times game data should be sent to clients per second.

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
