const config = require("./config");
require("colors");

console.log(" Web marbles".cyan);
console.log(`   by ${"Z".green}emanz${"o".green}`);
console.log(` ${(new Date()).toLocaleString("nl").cyan}`);

/* Database */
const db = require("./src/database/manager");
db.setCurrentDatabase(
	require("better-sqlite3")(config.database.path)
);

// Based on https://stackoverflow.com/questions/3144711/find-the-time-left-in-a-settimeout/36389263#36389263
let timeoutMap = {};
function setTrackableTimeout(callback, delay) { // Modify setTimeout
	let id = setTimeout(callback, delay); // Run the original, and store the id

	timeoutMap[id] = [Date.now(), delay]; // Store the start date and delay

	return id; // Return the id
}

function getTimeout(id) { // The actual getTimeLeft function
	let m = timeoutMap[id]; // Find the timeout in map

	// If there was no timeout with that id, return NaN, otherwise, return the time left clamped to 0
	return m ? Math.max(m[1] + m[0] - Date.now(), 0) : NaN;
}

/* Set up physics world */
const physics = require("./src/physics/manager")(config);

/* Game logic */
let game = {
	logic: {
		state: "started" // "enter", "started"
	},
	startDelay: 2825, // length in ms of audio
	entered: []
};

game.addMarble = function(id, name, color) {
	// Only allow marbles during entering phase
	if (game.logic.state === "enter") {

		// Make sure this person hasn't entered in this round yet
		if (!game.entered.includes(id)) {
			game.entered.push(id);
			spawnMarble(name, color);
		}
	}
};

game.end = function() {
	if (game.logic.state === "started") {
		game.logic.state = "enter";
		console.log(currentHourString() + "Current state: ".magenta, game.logic.state);

		// Close the gate
		physics.closeGate();

		// Remove all marbles
		physics.marbles.destroyAllMarbles();

		// Clear the array of people that entered
		game.entered = [];

		// Send clients game restart so they can clean up on their side
		io.sockets.emit("clear", true);

		// Start the game after the entering period is over
		clearTimeout(game.enterTimeout);
		game.enterTimeout = setTrackableTimeout(
			game.start,
			config.marbles.rules.enterPeriod * 1000
		);

		/* setInterval(
			function(){
				console.log(getTimeout(game.enterTimeout));
			},1000
		); */

		return true;
	} else {
		return false;
	}
};

game.start = function() {
	if (game.logic.state === "enter") {
		game.logic.state = "started";
		console.log(currentHourString() + "Current state: ".magenta, game.logic.state);
		io.sockets.emit("start", true);

		setTimeout(function() {
			physics.openGate();

			// Add bot marble to ensure physics not freezing
			spawnMarble("Nightbot", "#000000");
		}, game.startDelay);

		clearTimeout(game.gameplayTimeout);
		game.gameplayTimeout = setTrackableTimeout(
			game.end,
			config.marbles.rules.maxRoundLength * 1000
		);

		return true;
	} else {
		return false;
	}
};

/* Express connections */
const express = require("express");
const mustacheExpress = require("mustache-express");
const compression = require("compression");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
app.use(compression({
	filter: function () { return true; }
}));
app.use(express.static(`${__dirname}/public`));
app.engine("mustache", mustacheExpress());
app.set("view engine", "mustache");
if (!config.express.cache) app.disable("view cache");
app.set("views", `${__dirname}/templates`);

const bodyParser = require("body-parser");
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
	extended: true
}));

app.get("/", function (req, res) {
	res.render("index");
});

app.get("/client", function (req, res) {
	if (Object.keys(req.query).length !== 0 && req.query.constructor === Object) {

		// Add bot marble
		if (
			req.query.bot
			&& game.logic.state === "enter"
		) {
			spawnMarble("nightbot", "#000000");
			res.send("ok");
		}

		// Clear all marbles
		else if (req.query.clear) {

			res.send(
				game.end() ? "ok" : "already waiting for start"
			);

		}

		// Start the game, move the startGate out of the way
		else if (req.query.start) {

			res.send(
				game.start() ? "ok" : "already started"
			);

		}

		// Send over the gamestate when a new connection is made
		else if (req.query.gamestate) {

			res.send(
				{
					gameState: game.logic.state,
					enterPeriod: config.marbles.rules.enterPeriod,
					maxRoundLength: config.marbles.rules.maxRoundLength,
					timeToEnter: getTimeout(game.enterTimeout),
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

// Discord integration

let discord, discordClient;
discord = require("discord.js");
discordClient = new discord.Client();

discordClient.on("ready", function() {
	console.log(`${currentHourString()}DISCORD: ${"Discord bot is ready!".green}`);
	discordClient.user.setActivity("Manzo's Marbles", { type: "PLAYING" });
});

discordClient.on("message", function(message) {
	if (message.channel.id == config.discord.gameplayChannelId) {
		if (message.author.id != config.discord.webhookId) { // Make sure we're not listening to our own blabber

			io.sockets.emit("chat message", {
				username: message.author.username,
				discriminator: message.author.discriminator,
				content: message.content
			});

			chat.testMessage(message.content, message.author.id, message.author.username);

			if (message.content === "!doot") {
				message.reply("🎺");
			}
		}
	}
});

discordClient.login(config.discord.botToken);

//

let chat = {};
chat.testMessage = function(messageContent, id, username) {
	if (messageContent.startsWith("!marble")) {
		let colorRegEx = /#(?:[0-9a-fA-F]{3}){1,2}$/g;
		let match = messageContent.match(colorRegEx);
		let color = (match === null ? undefined : match[0]);

		game.addMarble(
			id,
			username,
			color
		);
	}

	else if (messageContent.startsWith("!end") && (id == "112621040487702528" || id == "133988602530103298")) {
		game.end();
	}

	else if (messageContent.startsWith("!lotsofbots") && (id == "112621040487702528" || id == "133988602530103298")) {
		let amount = Math.min(100, parseInt(messageContent.substr(11)) || 10);
		for (let i = 0; i < amount; i++) {
			spawnMarble();
		}
	}
};

//

function spawnMarble(name, color) {
	let body = physics.marbles.createMarble(name, color);

	// Send client info on new marble
	io.sockets.emit("new marble", body.tags);
}

//

let request = require("request");
app.get("/chat", function (req, res) {
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

			let callback = function (error, response, token_body) {
				if (!error && response.statusCode === 200) {
					token_body = JSON.parse(token_body);

					request.get({
						url: "https://discordapp.com/api/users/@me",
						headers: {
							"Authorization": `Bearer ${token_body.access_token}`
						}
					}, function (error, response, user_body) {
						if (!error && response.statusCode === 200) {

							user_body = JSON.parse(user_body);

							let exists = db.user.idExists(user_body.id);

							token_body.access_granted = now();

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
							console.log(error, response.statusCode);
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

app.post("/chat", function (req, res) {
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
			let callback = function (error, response, token_body) {
				if (!error && response.statusCode === 200) {
					token_body = JSON.parse(token_body);
					token_body.access_granted = now();

					db.user.updateTokenById(token_body, req.body.id);

					res.send(token_body);
				}
			};

			request.post(options, callback);
		}
	}
});

app.get("/editor", function (req, res) {
	if (config.editor.enabled)
		res.render("editor", {});
	else
		res.render("editorDisabled", {});
});

//

app.get("/debug", function (req, res) {
	res.render("ammo", {
		map: JSON.stringify(physics.world.map.parsed)
	});
});

/* Express listener */
let server = http.listen(config.express.port, function () {
	let port = server.address().port;
	console.log(currentHourString() + "EXPRESS: Listening at port %s".cyan, port);
});

/* Sockets */
io.on("connection", function(socket) {

	// Get user if there is one
	// Note: this is pretty unsafe code. Remove or improve.
	let name = " [Guest]";
	if (socket.handshake.headers && socket.handshake.headers.cookie) {
		let cookies = socket.handshake.headers.cookie.split("; ");
		let user_data = cookies.find( element => { return element.startsWith("user_data"); } );
		if (user_data) {
			user_data = decodeURIComponent(user_data);
			user_data = user_data.substr(10);
			user_data = JSON.parse(user_data);
			if ( db.user.idIsAuthenticated(user_data.id, user_data.access_token) ) {
				name = (` (${db.user.getUsernameById(user_data.id)})`).yellow;
			} else {
				name = " Hacker?!?".red;
			}
		}
	}

	console.log(currentHourString() + "A user connected!".green + name);

	let initialMarbleData = [];
	for (let i = 0; i < physics.marbles.list.length; i++) {
		initialMarbleData.push({
			pos: physics.marbles.list[i].position,
			id: physics.marbles.list[i].id,
			tags: physics.marbles.list[i].tags
		});
	}
	/* console.log(initialMarbleData); */
	socket.emit("initial data", initialMarbleData);

	// Request physics
	socket.on("request physics", (timestamp, callback) => {
		if (physics.marbles.list.length !== 0) {

			let marbleTransformations = physics.marbles.getMarbleTransformations();

			let gateOrigin = physics.gateBody.getWorldTransform().getOrigin();
			let startGatePosition = [gateOrigin.x(), gateOrigin.y(), gateOrigin.z()];

			callback({
				pos: marbleTransformations.position.buffer,
				rot: marbleTransformations.rotation.buffer,
				startGate: startGatePosition
			});
		} else {
			callback(0); // Still need to send the callback so the client doesn't lock up waiting for packets.
		}
	});

	// Discord chat embed
	const chatWebhook = new discord.WebhookClient(config.discord.webhookId, config.discord.webhookToken);
	socket.on("chat incoming", (obj) => {
		let row = db.user.getUserDetailsById(obj.id);
		console.log(row);

		if (row && row.access_token == obj.access_token) {
			chat.testMessage(obj.message, obj.id, row.username);

			chatWebhook.send(obj.message, {
				username: row.username,
				avatarURL: `https://cdn.discordapp.com/avatars/${obj.id}/${row.avatar}.png`,
				disableEveryone: true
			});

			io.sockets.emit("chat message", {
				username: row.username,
				discriminator: row.discriminator,
				content: obj.message
			});
		} else {
			console.log("User ID and access token mismatch!", row);
		}
	});
});

io.on("disconnected", function() {
	console.log("A user disconnected...".red);
});

/* Other */
function pad(num, size) {
	let s = `000000000${num}`;
	return s.substr(s.length - size);
}

function currentHourString() {
	let date = new Date();
	return `[${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}] `;
}

function now() {
	return (new Date()).getTime();
}


// Start the game loop
game.end();
