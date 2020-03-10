const socketsHelper = require("./sockets-helper");
const log = require("../../log");
const db = require("../database/manager");

const socketGameplay = function(getInitialDataPayload) {
	return new socketsHelper.Socket(
		// Route
		"/gameplay",

		// Options
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
				ws.send(getInitialDataPayload(), true);
			},

			close: function(ws) {
				log.info("A user disconnected...".red + ws.meta.name);
			}
		}
	);
};

module.exports = socketGameplay;
