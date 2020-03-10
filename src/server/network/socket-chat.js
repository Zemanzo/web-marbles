const socketsHelper = require("./sockets-helper");
const commandsManager = require("../chat/commands-manager");
const log = require("../../log");
const db = require("../database/manager");

const socketChat = function(chatWebhook) {
	let socket = new socketsHelper.Socket(
		"/chat",
		{
			compression: 1,
			maxPayloadLength: 128 * 1024,
			idleTimeout: 3600
		}
	);

	socket.messageFunctions.push(function(ws, message) {
		try {
			message = JSON.parse(message);
		}
		catch (e) {
			ws.send("Invalid JSON");
			return;
		}

		if (db.user.idIsAuthenticated(message.id, message.access_token)) {
			let row = db.user.getUserDetailsById(message.id);
			if (row) {
				commandsManager.parse(message.content, message.id, row.username);

				chatWebhook.send(message.content, {
					username: row.username,
					avatarURL: `https://cdn.discordapp.com/avatars/${message.id}/${row.avatar}.png`,
					disableEveryone: true
				});

				socket.emit(JSON.stringify({
					username: row.username,
					discriminator: row.discriminator,
					content: message.content
				}));
			} else {
				log.warn("User ID and access token mismatch!", row);
			}
		}
	});

	return socket;
};

module.exports = socketChat;
