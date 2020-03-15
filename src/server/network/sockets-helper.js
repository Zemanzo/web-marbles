const uWS = require("uWebSockets.js");
const config = require("../config");
const log = require("../../log");
const EventEmitter = require("events");


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

	function Socket(route, options) {
		if (!options)
			options = {};

		// No compression by default
		if (!options.compression || options.compression === 0)
			options.compression = 0;

		// Max 1 MB payload by default
		if (!options.maxPayloadLength || options.maxPayloadLength === 0)
			options.maxPayloadLength = 1 * 1024 * 1024;

		// Max 16 * max payload by default
		if (!options.maxBackpressure || options.maxBackpressure === 0)
			options.maxBackpressure = options.maxPayloadLength * 16;

		// Default timeout after 10 minutes
		if (!options.idleTimeout || options.idleTimeout === 0)
			options.idleTimeout = 600;

		this.route = route;
		this.options = options;

		// List of all open socket connections
		this.openSockets = [];

		// Event emitter for open/close/message events
		this.eventEmitter = new EventEmitter();

		// Create the socket endpoint
		_app.ws(
			`/ws${route}`,
			Object.assign(
				{
					// Handlers
					open: (ws, req) => {
						this._open(ws, req);
					},
					message: (ws, message, isBinary) => {
						this._message(ws, message, isBinary);
					},
					close: (ws, req) => {
						this._close(ws, req);
					}
				},
				options
			)
		);
	}

	Socket.prototype._open = function(ws, req) {
		// Add socket to the list
		this.openSockets.push(ws);

		// Call open event
		this.eventEmitter.emit("open", ws, req);
	};

	Socket.prototype._close = function(ws, req) {
		// Call close event
		this.eventEmitter.emit("close", ws, req);

		//Remove socket from the list
		this.openSockets.splice(this.openSockets.indexOf(ws), 1);
	};

	Socket.prototype._message = function(ws, message, isBinary) {
		// Convert non-binary messages back to a string
		if (!isBinary) {
			message = Buffer.from(message).toString("utf-8");
		}

		// Only call event if there is no backpressure built up
		if (ws.getBufferedAmount() < this.options.maxBackpressure) {
			// Call message event
			this.eventEmitter.emit("message", ws, message, isBinary);
		} else {
			log.warn(`µWS: Too much backpressure has built up in the ${this.route} sockets, will not run associated functions until backpressure has been cleared.`);
		}
	};

	// Function that sends message data to all currently connected sockets
	Socket.prototype.emit = function(message) {
		for (let i = 0; i < this.openSockets.length; i++) {
			if (this.openSockets[i].getBufferedAmount() < this.options.maxBackpressure) {
				this.openSockets[i].send(message, typeof message !== "string");
			} else {
				return false;
			}
		}
		return true;
	};

	Socket.prototype.closeAll = function() {
		for (let socket of this.openSockets) {
			// HTTP 503 Service Unavailable
			socket.end(503);
		}
	};

	return {
		stopListening: function() {
			uWS.us_listen_socket_close(_token);
		},

		Socket
	};
}();

module.exports = socketsHelper;
