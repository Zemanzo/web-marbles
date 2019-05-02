const config = require("../config");
const log = require("../../log");
const messages = require("./messages");
// Need discord.js for WebHookClient and for regular client
const discord = require("discord.js");

let discordClient,
	chatWebhook;

const initialize = function(db) {
	// Set up clients
	discordClient = new discord.Client();
	chatWebhook = new discord.WebhookClient(config.discord.webhookId, config.discord.webhookToken);

	// Set up chat socket
	const sockets = require("../network/sockets");
	const socketChat = sockets.setupChat(db, chatWebhook);

	discordClient.on("ready", function() {
		log.info(`DISCORD: ${"Discord bot is ready!".green}`);
		discordClient.user.setActivity("Manzo's Marbles", { type: "PLAYING" });
	}, console.error);

	discordClient.on("message", function(message) {
		if (message.channel.id == config.discord.gameplayChannelId) {
			if (message.author.id != config.discord.webhookId) { // Make sure we're not listening to our own blabber
				if (!db.user.idExists(message.author.id)) {
					// This is a new user!
					db.user.insertNewUserDiscord(message.author);
				}

				// Send it to the client chat
				socketChat.emit(
					JSON.stringify({
						username: message.author.username,
						discriminator: message.author.discriminator,
						content: message.content
					})
				);

				messages.parse(message.content, message.author.id, message.author.username, message.member);

				if (message.content === "!doot") {
					message.reply("🎺");
				}
			}
		}
	}, console.error);

	discordClient.on("error", console.error, console.error);

	discordClient.login(config.discord.botToken);

	return socketChat;
};

const stop = function() {
	chatWebhook.destroy();
	return discordClient.destroy();
};

module.exports = {
	initialize,
	stop
};
