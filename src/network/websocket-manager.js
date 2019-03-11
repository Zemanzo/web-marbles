const uWS = require("uWebSockets.js");
const config = require("../../config");
const socketMessageTypes = require("./socket-message-types");
const log = require("../log");

const appOptions = {
	key_file_name: config.uwebsockets.keyFileName,
	cert_file_name: config.uwebsockets.certFileName,
	passphrase: config.uwebsockets.passphrase
};
const app = config.network.ssl ? uWS.SSLApp(appOptions) : uWS.App();

function Socket(
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

	let _typeMessage = this._typeMessage = function(message, type) {
		type = socketMessageTypes.routes[route][type];

		// Modify message based on type
		if (typeof message === "string" && typeof type !== "undefined") {
			type = (new Buffer.from([type])).readUInt8(0);
			message = type + message;
		} else if (typeof type !== "undefined") {
			message = Buffer.concat([
				(new Buffer.from([type])),
				message
			], message.length + 1);
		}

		return message;
	};

	this._add = function(ws) {
		ws.sendTyped = function(message, type) {
			ws.send( _typeMessage(message, type) );
		};

		this._list.push(ws);
	};

	this._remove = function(ws) {
		this._list.splice(this._list.indexOf(ws), 1);
	};

	this.emit = function(message, type) {
		for (let i = 0; i < this._list.length; i++) {
			if (this._list[i].getBufferedAmount() < _maxBackpressure) {
				if (type) {
					this._list[i].sendTyped(message, type);
				} else {
					this._list[i].send(message);
				}
			} else {
				return false;
			}
		}
		return true;
	};

	this.messageFunctions = [];

	// Create the socket endpoint
	app.ws(
		route,
		Object.assign(
			{
				// Handlers
				open: (ws, req) => {
					this._add(ws);
					if (_open) _open(ws, req);
				},
				message: (ws, message, isBinary) => {
					// Strip message type if neccesary
					let type = socketMessageTypes.routes[route] ? Buffer.from(message).readUInt8(0) : false;

					if (type) {
						// Remove type byte
						message = message.slice(1);

						// Determine type
						type = Object.keys(socketMessageTypes.routes[route]).find(
							key => socketMessageTypes.routes[route][key] === parseInt(String.fromCharCode(type))
						);
					}

					// Convert non-binary messages back to a string
					if (!isBinary) {
						message = Buffer.from(message).toString("utf-8");
					}

					// Only execute functions if there is no backpressure built up.
					if (ws.getBufferedAmount() < _maxBackpressure) {
						// Execute functions
						for (let i = 0; i < this.messageFunctions.length; i++) {
							this.messageFunctions[i](ws, message, isBinary, type);
						}
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

	this.close = function() {
		for (let socket of this._list) {
			// HTTP 503 Service Unavailable
			socket.end(503);
		}
	};
}

app.listen(config.uwebsockets.port, (token) => {
	if (token) {
		this._listenSocket = token;
		log.info(`µWS: Listening to port ${config.uwebsockets.port}`.cyan);
	} else {
		log.info(`µWS: Failed to listen to port ${config.uwebsockets.port}`.cyan);
	}
});

function stopListening() {
	uWS.us_listen_socket_close(this._listenSocket);
}

module.exports = {
	stopListening,
	Socket
};
