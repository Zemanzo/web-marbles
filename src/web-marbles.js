const config = require("./server/config");
const log = require("./log");

// Splash screen
require("colors");
console.log(" web-marbles".cyan);
console.log(`   by ${"Z".green}emanz${"o".green}`);
console.log(` ${(new Date()).toLocaleString("nl").cyan}`);

// Database
const db = require("./server/database/manager");
db.setCurrentDatabase(
	require("better-sqlite3")(config.database.path)
);

// Set up physics world
const physics = require("./server/physics/manager")(config);

// Set up game logic
const game = require("./server/game")(config, physics);

// Set up gameplay socket
const sockets = require("./server/network/sockets");
const socketGameplay = sockets.setupGameplay(db, physics, config, game);

// Set game socketManager
game.setSocketManager(socketGameplay);

// Chat testing
const chat = require("./server/chat")(game);

// Need discord.js for WebHookClient and for regular client
const discord = require("discord.js");

// Set up chat socket
const chatWebhook = new discord.WebhookClient(config.discord.webhookId, config.discord.webhookToken);
const socketChat = sockets.setupChat(db, chat, chatWebhook);

// Set up discord client
const discordClient = new discord.Client();

discordClient.on("ready", function() {
	log.info(`DISCORD: ${"Discord bot is ready!".green}`);
	discordClient.user.setActivity("Manzo's Marbles", { type: "PLAYING" });
});

discordClient.on("message", function(message) {
	if (message.channel.id == config.discord.gameplayChannelId) {
		if (message.author.id != config.discord.webhookId) { // Make sure we're not listening to our own blabber
			// Send it to the client chat
			socketChat.emit(
				JSON.stringify({
					username: message.author.username,
					discriminator: message.author.discriminator,
					content: message.content
				})
			);

			chat.testMessage(message.content, message.author.id, message.author.username);

			if (message.content === "!doot") {
				message.reply("🎺");
			}
		}
	}
});

discordClient.login(config.discord.botToken);

// Express connections
const express = require("express");
const mustacheExpress = require("mustache-express");
const compression = require("compression");
const helmet = require("helmet");
const app = express();
const http = require("http").Server(app);
app.use(helmet());
app.use(compression({
	filter: function() { return true; }
}));
app.use(express.static(`${__dirname}/../public`));
app.engine("mustache", mustacheExpress());
app.set("view engine", "mustache");
if (!config.express.cache) app.disable("view cache");
app.set("views", `${__dirname}/../templates`);

const bodyParser = require("body-parser");
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
	extended: true
}));

app.get("/", function(req, res) {
	res.render("index");
});

app.get("/client", function(req, res) {
	if (Object.keys(req.query).length !== 0 && req.query.constructor === Object) {
		// Send over the gamestate when a new connection is made
		if (req.query.gamestate) {
			res.send(
				{
					gameState: game.state,
					roundTimerStart: game.startTime,
					enterPeriod: config.marbles.rules.enterPeriod,
					maxRoundLength: config.marbles.rules.maxRoundLength,
					timeToEnter: game.getTimeRemaining(),
					mapId: config.marbles.mapRotation[0].name
				}
			);
		}

		// Send map id -- DEPRECATED
		else if (req.query.dlmap) {
			res.send(config.marbles.mapRotation[0].name);
		}

		// Got nothing for ya.
		else {
			res.send("You probably can't do that. Nice try tho gg.");
		}
	} else {
		res.render("client");
	}
});

let request = require("request");
app.get("/chat", function(req, res) {
	if (req.query) {
		if (req.query.code) {
			let options = {
				url: "https://discordapp.com/api/oauth2/token",
				form: {
					client_id: config.discord.clientId,
					client_secret: config.discord.clientSecret,
					grant_type: "authorization_code",
					code: req.query.code,
					redirect_uri: `${config.discord.redirectUriRoot}chat`,
					scope: config.discord.scope
				}
			};

			let callback = function(error, response, token_body) {
				if (!error && response.statusCode === 200) {
					token_body = JSON.parse(token_body);

					request.get({
						url: "https://discordapp.com/api/users/@me",
						headers: {
							"Authorization": `Bearer ${token_body.access_token}`
						}
					}, function(error, response, user_body) {
						if (!error && response.statusCode === 200) {
							user_body = JSON.parse(user_body);

							let exists = db.user.idExists(user_body.id);

							token_body.access_granted = Date.now();

							if (exists)
								db.user.updateTokenById(token_body, user_body.id);
							else
								db.user.insertNewUser(token_body, user_body, config.discord.scope);

							res.render("chat", {
								invitelink: config.discord.inviteLink,
								user_data: JSON.stringify({
									id: user_body.id,
									username: user_body.username,
									access_token: token_body.access_token,
									access_granted: token_body.access_granted,
									expires_in: token_body.expires_in,
									discriminator: user_body.discriminator,
									avatar: user_body.avatar
								}),
								success: true
							});
						} else {
							log.error(error, response.statusCode);
						}
					});
				} else {
					res.render("chat", {
						invitelink: config.discord.inviteLink,
						success: false
					});
				}
			};

			request.post(options, callback);
			return;
		}
	}

	res.render("chat", {
		invitelink: config.discord.inviteLink,
		client_id: config.discord.clientId,
		redirect_uri: encodeURIComponent(`${config.discord.redirectUriRoot}chat`),
		scope: encodeURIComponent(config.discord.scope) // separated with spaces
	});
});

app.post("/chat", function(req, res) {
	if (req.body) {
		// Request new access_token
		if (
			req.body.type == "refresh_token"
			&& req.body.id
			&& req.body.access_token
			&& db.user.idIsAuthenticated(req.body.id, req.body.access_token)
		) {
			let row = db.user.getTokenById(req.body.id);
			let options = {
				url: "https://discordapp.com/api/oauth2/token",
				form: {
					client_id: config.discord.clientId,
					client_secret: config.discord.clientSecret,
					grant_type: "refresh_token",
					refresh_token: row.refresh_token,
					redirect_uri: `${config.discord.redirectUriRoot}chat`,
					scope: row.scope
				}
			};
			let callback = function(error, response, token_body) {
				if (!error && response.statusCode === 200) {
					token_body = JSON.parse(token_body);
					token_body.access_granted = Date.now();

					db.user.updateTokenById(token_body, req.body.id);

					res.send(token_body);
				}
			};

			request.post(options, callback);
		}
	}
});

app.get("/editor", function(req, res) {
	if (config.editor.enabled)
		res.render("editor", {});
	else
		res.render("editor-disabled", {});
});

app.get("/shutdown", function(req, res) {
	res.send("wow ok then");
	shutdown();
});

// Express listener
let server = http.listen(config.express.port, function() {
	let port = server.address().port;
	log.info("EXPRESS: Listening at port %s".cyan, port);
});

// Start the game loop
game.end();

// Graceful shutdown
process.on("exit", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

let shuttingDown = false;
function shutdown() {
	if (!shuttingDown) {
		shuttingDown = true;

		log.warn("Termination signal received. Shutting down web-marbles...".yellow);

		// Inform any connected clients
		socketGameplay.emit(JSON.stringify({
			content: "The server is shutting down.",
			style: {
				backgroundColor: "#d00"
			}
		}), "notification");

		// Create a list of promises that all have to resolve before we can consider being shut down
		let promises = [];

		// Express
		promises.push(
			new Promise((resolve) => {
				server.close(() => {
					log.warn("EXPRESS server closed");
					resolve();
				});
			})
		);

		// Discord
		promises.push(
			discordClient.destroy().then(() => {
				log.warn("DISCORD main client stopped");
			})
		);

		chatWebhook.destroy();
		log.warn("DISCORD chat webhook stopped");

		// Database
		db.close();
		log.warn("DATABASE connection closed");

		// Stopped physics simulation
		physics.stopUpdateInterval();
		log.warn("PHYSICS stopped");

		// µWebSockets
		socketChat.close();
		socketGameplay.close();
		sockets.close();
		log.warn("µWS server closed");

		// Once promises resolve, we should be done
		Promise.all(promises).then(() => {
			log.warn("Successfully shut down web-marbles. Smell ya later!".green);
		}, (reason) => {
			shuttingDown = false;
			log.error("Failed to shut down gracefully, try again?", reason);
		});
	}
}
