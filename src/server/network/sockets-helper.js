const uWS = require("uWebSockets.js");
const config = require("../config");
const log = require("../../log");

const socketsHelper = function() {
	// Setup socket app
	const _app = config.network.ssl
		? uWS.SSLApp({
			key_file_name: config.uwebsockets.keyFileName,
			cert_file_name: config.uwebsockets.certFileName,
			passphrase: config.uwebsockets.passphrase
		})
		: uWS.App();

	// Start listening for socket requests
	let _token;
	_app.listen(config.uwebsockets.port, (token) => {
		if (token) {
			_token = token;
			log.info(`µWS: Listening to port ${config.uwebsockets.port}`.cyan);
		} else {
			log.warn(`µWS: Failed to listen to port ${config.uwebsockets.port}`.cyan);
		}
	});

	return {
		stopListening: function() {
			uWS.us_listen_socket_close(_token);
		},

		Socket: function(
			route,
			options
		) {
			if (!options)
				options = {};

			// No compression by default
			if (!options.compression || options.compression === 0)
				options.compression = 0;

			// Max 1 MB payload by default
			if (!options.maxPayloadLength || options.maxPayloadLength === 0)
				options.maxPayloadLength = 1 * 1024 * 1024;

			// Max 16 * max payload by default
			let _maxBackpressure;
			if (!options.maxBackpressure || options.maxBackpressure === 0)
				_maxBackpressure = options.maxBackpressure = options.maxPayloadLength * 16;

			// Default timeout after 10 minutes
			if (!options.idleTimeout || options.idleTimeout === 0)
				options.idleTimeout = 600;

			// Additional functionality when connection to socket is made (open)
			let _open = options._open = options.open;
			delete options.open; // avoid conflict with Object.assign;

			// Additional functionality when connection to socket is lost (close, disconnect)
			let _close = options._close = options.close;
			delete options.close; // avoid conflict with Object.assign;

			// Create list that contains all open socket connections
			this._list = [];

			// Function that adds socket to the list
			this._add = function(ws) {
				this._list.push(ws);
			};

			// Function that removes socket to the list
			this._remove = function(ws) {
				this._list.splice(this._list.indexOf(ws), 1);
			};

			// Function that sends message data to all currently connected sockets
			this.emit = function(message) {
				for (let i = 0; i < this._list.length; i++) {
					if (this._list[i].getBufferedAmount() < _maxBackpressure) {
						this._list[i].send(message, typeof message !== "string");
					} else {
						return false;
					}
				}
				return true;
			};

			this.messageFunctions = [];

			// Create the socket endpoint
			_app.ws(
				`/ws${route}`,
				Object.assign(
					{
						// Handlers
						open: (ws, req) => {
							this._add(ws);
							if (_open) _open(ws, req);
						},
						message: (ws, message, isBinary) => {
							// Convert non-binary messages back to a string
							if (!isBinary) {
								message = Buffer.from(message).toString("utf-8");
							}

							// Only execute functions if there is no backpressure built up.
							if (ws.getBufferedAmount() < _maxBackpressure) {
								// Execute functions
								for (let i = 0; i < this.messageFunctions.length; i++) {
									this.messageFunctions[i](ws, message, isBinary);
								}
							} else {
								log.warn(`µWS: Too much backpressure has built up in the ${route} sockets, will not run associated functions until backpressure has been cleared.`);
							}
						},
						close: (ws, req) => {
							this._remove(ws);
							if (_close) _close(ws, req);
						}
					},
					options
				)
			);

			// Close all related sockets
			this.close = function() {
				for (let socket of this._list) {
					// HTTP 503 Service Unavailable
					socket.end(503);
				}
			};
		}
	};
}();

module.exports = socketsHelper;
