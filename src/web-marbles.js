const config = require("./server/config");
const log = require("./log");

// Splash screen
require("colors");
console.log(" web-marbles".cyan);
console.log(`   by ${"Z".green}emanz${"o".green}`);
console.log(` ${(new Date()).toLocaleString("nl").cyan}`);

// Database
const db = require("./server/database/manager");
db.setCurrentDatabase(config.database.path);

// Fetch and validate levels
const levelManager = require("./server/levels/manager");
let levelManagerReady = levelManager.retrieveLevels();

// Prepare marble skins
const skins = require("./server/skins");
let skinsReady = skins.updateIdList();

// Set up game logic
const game = require("./server/game");

// Set up chat
let discordManager = null;
if (config.discord.enabled) {
	discordManager = require("./server/chat/discord-manager");
	discordManager.initialize();
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
	res.render("index", { rootUrl: config.network.rootUrl });
});

// Git commit hash, optional dependency
let gitHash;
try {
	let git = require("git-rev-sync");
	gitHash = git.long();
} catch (error) {
	log.warn("git-rev-sync is not installed, no git information will be displayed");
}

const version = require("../package.json").version;
app.get("/client", function(req, res) {
	res.render("client", {
		gitHash,
		version,
		discordEnabled: config.discord.enabled,
		invitelink: config.discord.inviteLink,
		rootUrl: config.network.rootUrl
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
			res.render("chat-redirect", { rootUrl: config.network.rootUrl });
		} else {
			// Otherwise, simply display the chat.
			res.render("chat", {
				invitelink: config.discord.inviteLink,
				client_id: config.discord.clientId,
				redirect_uri: redirectUri,
				scope: scope,
				rootUrl: config.network.rootUrl
			});
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
		res.render("chat", { rootUrl: config.network.rootUrl });
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
		res.render("editor", {rootUrl: config.network.rootUrl, version});
	else
		res.render("editor-disabled", {});
});

app.get("/skins", function(req, res) {
	res.render("skins", { rootUrl: config.network.rootUrl, version, skinList: Object.values(skins.skinList) });
});

app.get("/terms", function(req, res) {
	res.render("terms-and-conditions", { rootUrl: config.network.rootUrl });
});

app.get("/privacy", function(req, res) {
	res.render("privacy", { rootUrl: config.network.rootUrl });
});

import Page from "./server/router/page";
import ContactComponent from "./client/contact/root-component";
new Page(
	app,
	{
		id: "contact",
		label: "Contact",
		description: "Contact information for inqueries regarding the game or website.",
		isSimplePage: true
	},
	ContactComponent
);

import LeaderboardsComponent from "./client/leaderboards/root-component";
const getLatestLeaderboard = function() {
	return this.user.getTopAlltime(10);
};
new Page(
	app,
	{
		id: "leaderboards",
		label: "Leaderboards",
		description: "An overview of the current rankings for web-marbles"
	},
	LeaderboardsComponent,
	{
		serverSideProps: {
			leaderboards: {
				alltime: getLatestLeaderboard.bind(db) // oofies
			}
		}
	}
);

app.use(function(req, res) {
	res.status(404)
		.render("status/404", { rootUrl: config.network.rootUrl });
});

// Express listener
let server = http.listen(config.express.port, function() {
	let port = server.address().port;
	log.info("EXPRESS: Listening at port %s".cyan, port);
});

// Start the game loop
Promise.all([skinsReady, levelManagerReady])
	.then(() => {
		game.initialize();
	})
	.catch((error) => {
		throw new Error(`Initialization failed during loading of assets: ${error}`);
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

		game.stop();

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
			discordManager.stop();
			log.warn("DISCORD client & webhook(s) stopped");
		}

		// Database
		db.close();
		log.warn("DATABASE connection closed");

		// µWebSockets
		require("./server/network/sockets-helper").stopListening();
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
