const socketManager = require("./websocket-manager");
const messages = require("../chat/messages");
const log = require("../../log");

const setupGameplay = function(db, config, game) {
	// Gameplay socket
	let gameplaySocketManager = new socketManager.Socket(
		"/gameplay",
		{
			compression: 0,
			maxPayloadLength: 1024 ** 2,
			idleTimeout: 3600,
			open: function(ws, req) {
				// Get user if there is one
				// Note: this might be pretty unsafe code. Remove or improve.
				let name = " [Guest]";
				let cookie = req.getHeader("cookie");
				if (cookie) {
					let cookies = cookie.split("; ");
					let user_data = cookies.find(element => { return element.startsWith("user_data"); });
					if (user_data) {
						try {
							user_data = decodeURIComponent(user_data);
							user_data = user_data.substr(10);
							user_data = JSON.parse(user_data);
							if (db.user.idIsAuthenticated(user_data.id, user_data.access_token)) {
								name = (` (${db.user.getUsernameById(user_data.id)})`).yellow;
							} else {
								name = " Hacker?!? (Authentication failed)".red;
							}
						}
						catch (error) {
							name = " Hacker?!? (Invalid cookie)".red;
						}
					}
				}

				log.info("A user connected!".green + name);
				ws.meta = { name };

				// Send initial game data to client
				ws.send(game.getInitialDataPayload(), true);
			},
			close: function(ws) {
				log.info("A user disconnected...".red + ws.meta.name);
			}
		}
	);

	gameplaySocketManager.messageFunctions.push(function(ws, message, isBinary, type) {
		if (type === "request_physics") {
			let marbleTransformations = game.getMarbleTransformations();
			if (marbleTransformations !== null) {
				ws.sendTyped(
					JSON.stringify({
						pos: marbleTransformations.position,
						rot: marbleTransformations.rotation
					}),
					type
				);
			} else {
				ws.sendTyped("false", type);
			}
		}
	});

	return gameplaySocketManager;
};

const setupChat = function(db, chatWebhook) {
	// Chat socket
	let chatSocketManager = new socketManager.Socket(
		"/chat",
		{
			compression: 1,
			maxPayloadLength: 128 * 1024,
			idleTimeout: 3600
		}
	);

	chatSocketManager.messageFunctions.push(function(ws, message) {
		try {
			message = JSON.parse(message);
		}
		catch (e) {
			ws.send("Invalid JSON");
			return;
		}

		let row = db.user.getUserDetailsById(message.id);
		if (row && row.access_token == message.access_token) {
			messages.parse(message.content, message.id, row.username);

			chatWebhook.send(message.content, {
				username: row.username,
				avatarURL: `https://cdn.discordapp.com/avatars/${message.id}/${row.avatar}.png`,
				disableEveryone: true
			});

			chatSocketManager.emit(JSON.stringify({
				username: row.username,
				discriminator: row.discriminator,
				content: message.content
			}));
		} else {
			log.warn("User ID and access token mismatch!", row);
		}
	});

	return chatSocketManager;
};

function close() {
	socketManager.stopListening();
}

module.exports = {
	close,
	setupChat,
	setupGameplay
};
