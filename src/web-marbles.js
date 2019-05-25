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

// Fetch levels & build primary level
const levels = require("./server/levels/manager");

// Set up physics world
const physics = require("./physics/manager");
physics.world.setTickRate(config.physics.steps);
physics.world.setGravity(config.physics.gravity);

// Set up game logic
const game = require("./server/game");

// Set up gameplay socket
const sockets = require("./server/network/sockets");
const socketGameplay = sockets.setupGameplay(db, config, game, levels);

// Set game socketManager
game.setSocketManager(socketGameplay);

// Set up chat
let discordManager = null,
	socketChat;
if (config.discord.enabled) {
	discordManager = require("./server/chat/discord-manager");
	socketChat = discordManager.initialize(db);
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
		version,
		discordEnabled: config.discord.enabled
	});
});

if (config.discord.enabled) {
	let redirectUri = encodeURIComponent(`${config.discord.redirectUriRoot}chat`);
	let scope = encodeURIComponent(config.discord.scope);

	app.get("/chat", function(req, res) {
		if (req.query && req.query.code) {
			// If we receive a code, the client is trying to authorize with Discord and we must handle this request.
			discordManager.authorizeClient(req, res);
		} else if (req.query && req.query.error) {
			res.render("chat-redirect");
		} else {
			// Otherwise, simply display the chat.
			let discordData = {
				invitelink: config.discord.inviteLink,
				client_id: config.discord.clientId,
				redirect_uri: redirectUri,
				scope: scope
			};

			res.render("chat", discordData);
		}
	});

	app.post("/chat", function(req, res) {
		if (req.body && req.body.type === "refresh_token") {
			discordManager.refreshClient(req, res);
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
levels.currentLevelData.then(() => {
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
				discordManager.stop().then(() => {
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
