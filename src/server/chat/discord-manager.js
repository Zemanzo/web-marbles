const config = require("../config");
const log = require("../../log");
const db = require("../database/manager");
const commandsManager = require("./commands-manager");
const permissions = require("./permissions");
const discord = require("discord.js");
const request = require("request-promise-native");
const socketsHelper = require("../network/sockets-helper");

const discordManager = function() {
	let _discordClient = null;
	let _chatWebhook = null; // Discord chat webhook
	let _chatClientSocket = null;

	let _onChatClientConnected = function(ws, req) {
		// Get user if there is one
		// Note: this might be pretty unsafe code. Remove or improve.
		let name = "[Guest]";
		let cookie = req.getHeader("cookie");
		if (cookie) {
			let cookies = cookie.split("; ");
			let user_data = cookies.find(element => { return element.startsWith("user_data"); });
			if (user_data) {
				try {
					user_data = decodeURIComponent(user_data);
					user_data = user_data.substring(10);
					user_data = JSON.parse(user_data);
					if (db.user.idIsAuthenticated(user_data.id, user_data.access_token)) {
						name = (`(${db.user.getUsernameById(user_data.id)})`).yellow;
					} else {
						name = "Hacker?!? (Authentication failed)".red;
					}
				}
				catch (error) {
					name = "Hacker?!? (Invalid cookie)".red;
				}
			}
		}

		log.info("A user connected! ".green + name);
		ws.meta = { name };
	};

	let _onChatClientDisconnected = function(ws) {
		log.info("A user disconnected... ".red + ws.meta.name);
	};

	let _onChatClientMessage = function(ws, message) {
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

				_chatWebhook.send(message.content, {
					username: row.username,
					avatarURL: `https://cdn.discordapp.com/avatars/${message.id}/${row.avatar}.png`,
					disableEveryone: true
				});

				_chatClientSocket.emit(JSON.stringify({
					username: row.username,
					discriminator: row.discriminator,
					content: message.content
				}));
			} else {
				log.warn("User ID and access token mismatch!", row);
			}
		}
	};

	return {
		initialize: function() {
			_discordClient = new discord.Client();
			_chatWebhook = new discord.WebhookClient(config.discord.webhookId, config.discord.webhookToken);

			// Set up chat socket
			_chatClientSocket = new socketsHelper.Socket("/chat", {
				compression: 1,
				maxPayloadLength: 128 * 1024,
				idleTimeout: 3600
			});

			_chatClientSocket.eventEmitter.on("open", _onChatClientConnected);
			_chatClientSocket.eventEmitter.on("close", _onChatClientDisconnected);
			_chatClientSocket.eventEmitter.on("message", _onChatClientMessage);

			_discordClient.on("ready", () => {
				// Get role permissions
				permissions.initialize(_discordClient.guilds);

				// Set default commands reply channel, which is the gameplay channel
				commandsManager.setDefaultChannel(
					_discordClient
						.guilds.cache.get(config.discord.permissions.guildId)
						.channels.cache.get(config.discord.gameplayChannelId)
				);

				log.info(`DISCORD: ${"Discord bot is ready!".green}`);
				_discordClient.user.setActivity("Manzo's Marbles", { type: "PLAYING" });
			}, console.error);

			// Log warnings and errors
			_discordClient.on("error", console.error, console.error);
			_discordClient.on("warn", console.warn, console.warn);
			_discordClient.on("rateLimit", (rateLimitInfo) => {
				log.info(`DISCORD: ${"Hit API ratelimit!".red} ${rateLimitInfo}`);
			}, console.error);

			// All messages sent in #gameplay channel
			_discordClient.on("message", (message) => {
				if (
					!config.discord.ignoreChannelIds.includes(message.channel.id)
					&& message.author.id != config.discord.webhookId // Make sure we're not listening to our own blabber
				) {
					if (!db.user.idExists(message.author.id)) {
						// This is a new user!
						db.user.insertNewUserDiscord(message.author);
					}

					const nickname = message.member.nickname || message.author.username;

					// Send it to the client chat
					if (message.channel.id === config.discord.gameplayChannelId) {
						_chatClientSocket.emit(
							JSON.stringify({
								username: nickname,
								discriminator: message.author.discriminator,
								content: message.content
							})
						);
					}

					// Parse commands
					commandsManager.parse(message.content, message.author.id, nickname, message.channel);
				}
			}, console.error);

			// Bans
			_discordClient.on("guildBanAdd", (guild, user) => {
				log.info(`DISCORD: ${"Banned user".red} ${user.username}#${user.discriminator} (${user.id})`);
				db.user.setBanState(true, user.id);
			}, console.error);

			_discordClient.on("guildBanRemove", (guild, user) => {
				log.info(`DISCORD: ${"Unbanned user".green} ${user.username}#${user.discriminator} (${user.id})`);
				db.user.setBanState(false, user.id);
			}, console.error);

			_discordClient.on("guildMemberUpdate", (oldGuildMember, newGuildMember) => {
				if (oldGuildMember.nickname !== newGuildMember.nickname) {
					db.user.updateUsernameById(
						newGuildMember.nickname || newGuildMember.user.username,
						newGuildMember.id
					);
				}
			}, console.error);

			// Everything has been set up, log the bot into the discord channel
			_discordClient.login(config.discord.botToken);
		},

		stop: function() {
			_chatClientSocket.closeAll();
			_chatWebhook.destroy();
			_discordClient.destroy();
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

					let exists = db.user.idExists(userBody.id);
					tokenBody.access_granted = Date.now();

					if (exists) {
						db.user.updateTokenById(tokenBody, userBody.id);
					} else {
						db.user.insertNewUserEmbed(tokenBody, userBody, config.discord.scope);
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
				if (db.user.idIsAllowedRefresh(req.body.id, req.body.access_token)) {
					let row = db.user.getTokenById(req.body.id),
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

						db.user.updateTokenById(tokenBody, req.body.id);

						let response = {
							authorized: true,
							refreshed: true,
							banned: false,
							tokenBody
						};

						res.send(response);
					},
					() => {
						res.status(400).send({ authorized: false, refreshed: false, banned: false });
					});
				} else if (db.user.idIsAuthenticated(req.body.id, req.body.access_token)) {
					res.send({ authorized: true, refreshed: false, banned: false });
					return;
				} else if (db.user.idIsBanned(req.body.id)) {
					res.send({ authorized: false, refreshed: false, banned: true });
					return;
				}
			}

			res.status(400).send({ authorized: false, refreshed: false, banned: false });
		}
	};
}();

module.exports = discordManager;
