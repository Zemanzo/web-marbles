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

// Fetch maps & build primary map
const maps = require("./server/maps/manager");

// Set up physics world
const physics = require("./physics/manager");
physics.world.setTickRate(config.physics.steps);
physics.world.setGravity(config.physics.gravity);

// Set up game logic
const game = require("./server/game");

// Set up gameplay socket
const sockets = require("./server/network/sockets");
const socketGameplay = sockets.setupGameplay(db, config, game, maps);

// Set game socketManager
game.setSocketManager(socketGameplay);

// Set up chat
let discord = null,
	socketChat;
if (config.discord.enabled) {
	discord = require("./server/chat/discord");
	socketChat = discord.initialize(db);
}

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

// Git commit hash, optional dependency
let git, gitHash, gitBranch;
try {
	git = require("git-rev-sync");
	gitHash = git.long();
	gitBranch = git.branch();
} catch (error) {
	log.warn("git-rev-sync is not installed, no git information will be displayed");
}

const version = require("../package.json").version;
app.get("/client", function(req, res) {
	res.render("client", {
		gitHash,
		gitBranch,
		version
	});
});

if (config.discord.enabled) {
	const request = require("request");
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
									db.user.insertNewUserEmbed(token_body, user_body, config.discord.scope);

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

		let discordData = {};
		if (config.discord.enabled) {
			discordData = {
				invitelink: config.discord.inviteLink,
				client_id: config.discord.clientId,
				redirect_uri: encodeURIComponent(`${config.discord.redirectUriRoot}chat`),
				scope: encodeURIComponent(config.discord.scope) // separated with spaces
			};
		}
		res.render("chat", discordData);
	});

	app.post("/chat", function(req, res) {
		if (config.discord.enabled && req.body) {
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
} else {
	// Render chat, just for styling purposes
	app.get("/chat", function(req, res) {
		res.render("chat");
	});

	// New alternative route for adding in marbles
	app.get("/debug", function(req, res) {
		if (req.query) {
			if (req.query.marble) {
				let name = req.query.name || "Nightbot";
				let color = req.query.color;
				let amount = Math.max(parseInt(req.query.amount) || 1, 1);
				for (let i = 0; i < amount; i++) {
					game.spawnMarble(undefined, name, color);
				}
			}
			if (req.query.start) {
				game.start();
			}
			if (req.query.end) {
				game.end();
			}
		}

		res.send("ok");
	});
}

app.get("/editor", function(req, res) {
	if (config.editor.enabled)
		res.render("editor", {version});
	else
		res.render("editor-disabled", {});
});

app.get("/terms", function(req, res) {
	res.render("terms-and-conditions", {});
});

app.get("/privacy", function(req, res) {
	res.render("privacy", {});
});

app.get("/contact", function(req, res) {
	res.render("contact", {});
});

app.use(function(req, res) {
	res.status(404)
		.render("status/404", {});
});

// Express listener
let server = http.listen(config.express.port, function() {
	let port = server.address().port;
	log.info("EXPRESS: Listening at port %s".cyan, port);
});

// Start the game loop
maps.currentMapData.then(() => {
	game.end();
});

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
		if (config.discord.enabled) {
			promises.push(
				discord.stop().then(() => {
					log.warn("DISCORD client & webhook(s) stopped");
				})
			);
		}

		// Database
		db.close();
		log.warn("DATABASE connection closed");

		// Stopped physics simulation
		physics.world.stopUpdateInterval();
		log.warn("PHYSICS stopped");

		// µWebSockets
		if (socketChat) socketChat.close();
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
