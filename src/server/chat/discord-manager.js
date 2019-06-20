const config = require("../config");
const log = require("../../log");
const messages = require("./messages");
const discord = require("discord.js");
const request = require("request-promise-native");

const discordManager = function() {
	return {
		initialize: function(db) {
			const self = this;
			// Set up clients
			this.db = db;
			this.client = new discord.Client();
			this.chatWebhook = new discord.WebhookClient(config.discord.webhookId, config.discord.webhookToken);

			// Set up chat socket
			const sockets = require("../network/sockets");
			const socketChat = sockets.setupChat(db, this.chatWebhook);

			this.client.on("ready", function() {
				log.info(`DISCORD: ${"Discord bot is ready!".green}`);
				self.client.user.setActivity("Manzo's Marbles", { type: "PLAYING" });
			}, console.error);

			this.client.on("message", function(message) {
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

			this.client.on("error", console.error, console.error);

			this.client.on("guildBanAdd", function(guild, user) {
				db.user.setBanState(true, user.id);
			}, console.error);

			this.client.on("guildBanRemove", function(guild, user) {
				db.user.setBanState(false, user.id);
			}, console.error);


			this.client.login(config.discord.botToken);

			return socketChat;
		},

		stop: function() {
			this.chatWebhook.destroy();
			return this.client.destroy();
		},

		authorizeClient: function(req, res) {
			let rejectionHasFired = false;
			let onReject = function() {
				if (!rejectionHasFired) {
					rejectionHasFired = true;

					res.render("chat-redirect");
				}
			};

			let tokenBody,
				userBody;

			// Make an API request to get the access token
			request.post({
				url: "https://discordapp.com/api/oauth2/token",
				form: {
					client_id: config.discord.clientId,
					client_secret: config.discord.clientSecret,
					grant_type: "authorization_code",
					code: req.query.code,
					redirect_uri: `${config.discord.redirectUriRoot}chat`,
					scope: config.discord.scope
				}
			}).then(
				(token_body) => {
					tokenBody = JSON.parse(token_body);

					return request.get({
						url: "https://discordapp.com/api/users/@me",
						headers: {
							"Authorization": `Bearer ${tokenBody.access_token}`
						}
					});
				},
				onReject
			).then(
				(user_body) => {
					userBody = JSON.parse(user_body);

					let exists = this.db.user.idExists(userBody.id);
					tokenBody.access_granted = Date.now();

					if (exists) {
						this.db.user.updateTokenById(tokenBody, userBody.id);
					} else {
						this.db.user.insertNewUserEmbed(tokenBody, userBody, config.discord.scope);
					}

					let user_data = JSON.stringify({
						id: userBody.id,
						username: userBody.username,
						access_token: tokenBody.access_token,
						access_granted: tokenBody.access_granted,
						expires_in: tokenBody.expires_in,
						discriminator: userBody.discriminator,
						avatar: userBody.avatar
					});

					res.render("chat-redirect", { user_data });
				},
				onReject
			).catch(onReject);
		},

		refreshClient: function(req, res) {
			// Request new access_token
			if (req.body.id && req.body.access_token) {
				if (this.db.user.idIsAllowedRefresh(req.body.id, req.body.access_token)) {
					let row = this.db.user.getTokenById(req.body.id),
						options = {
							url: "https://discordapp.com/api/oauth2/token",
							form: {
								client_id: config.discord.clientId,
								client_secret: config.discord.clientSecret,
								grant_type: "refresh_token",
								refresh_token: row.refresh_token,
								redirect_uri: `${config.discord.redirectUriRoot}chat`,
								scope: row.scope
							}
						},
						tokenBody = null;

					return request.post(options).then((token_body) => {
						tokenBody = JSON.parse(token_body);
						tokenBody.access_granted = Date.now();

						this.db.user.updateTokenById(tokenBody, req.body.id);

						let response = {
							authorized: true,
							refreshed: true,
							tokenBody
						};

						res.send(response);
					},
					() => {
						res.status(400).send({ authorized: false, refreshed: false });
					});
				} else if (this.db.user.idIsAuthenticated(req.body.id, req.body.access_token)) {
					res.send({ authorized: true, refreshed: false });
					return;
				}
			}

			res.status(400).send({ authorized: false, refreshed: false });
		}
	};
}();

module.exports = discordManager;
