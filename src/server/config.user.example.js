// Add any config properties you wish to override here
// To see which properties you can override, check config.js

const userConfig = {
	"discord.clientId": "<your-client-id-here>",
	"discord.clientSecret": "<your-client-secret-here>",

	"discord.botToken": "<your-bot-token-here>",
	"discord.gameplayChannelId": "<discord-channel-id-here>",

	"discord.webhookId": "<webhook-id-here>",
	"discord.webhookToken": "<webhook-token-here>",
	
	"discord.permissions.guildId": "<discord-server-id-here>",
	"discord.permissions.PREMIUM_SKINS": ["<discord-role-id-here>", "<etc>"],
	"discord.permissions.DEVELOPER_COMMANDS": ["<discord-role-id-here>", "<etc>"]
};

module.exports = userConfig;
