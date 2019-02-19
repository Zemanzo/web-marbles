import io from "socket.io-client";
import { network as config } from "../../config";
import { renderer } from "./render";

let socket = io({
	transports: ["websocket"]
});

let net = { // Initialize, do not configure these values.
	marbleData: undefined,
	marblePositions: new Float32Array(0),
	marbleRotations: new Float64Array(0),
	lastUpdate: 0,
	ready: 0,
	requestsSkipped: 0 // Helps detect network issues
};


// Socket data promise
net.socketReady = new Promise((resolve) => {
	// Once connected, client receives initial data
	socket.on("initial data", function(data) {
		net.marbleData = data;
		resolve(true);
	});
}).then(() => {
	/* Physics syncing */
	// Once connection is acknowledged, start requesting physics updates
	net.getServerData = function() {
		if (net.ready < config.tickrate) {
			net.ready++;
			socket.emit("request physics", Date.now(), (data) => {
				net.marblePositions = new Float32Array(data.pos);
				net.marbleRotations = new Float64Array(data.rot);
				net.lastUpdate = 0;
				net.ready--;
			});
		} else {
			net.requestsSkipped++;
		}
		if (renderer) {
			renderer.updateNet(net);
		}
		setTimeout(net.getServerData, 1000 / config.tickrate);
	};
	net.getServerData();

	return true;
});

export { net, socket };
