import io from "socket.io-client";
import * as config from "../../config";

let socket = io({
	transports: ["websocket"]
});

let renderer;

let net = {
	tickrate: config.network.tickrate, // Cannot be 0
	ticksToLerp: config.network.ticksToLerp, // Cannot be 0

	// Initialize, do not configure these values.
	marbleData: undefined,
	marblePositions: new Float32Array(0),
	marbleRotations: new Float32Array(0),
	lastUpdate: 0,
	ready: 0,
	requestsSkipped: 0 // Helps detect network issues
};

let game = {
	audio: {
		start: new Audio("resources/audio/start.mp3"),
		end: new Audio("resources/audio/end.mp3")
	},
	state: {
		timeToEnter: null
	},
	start: function() {
		game.audio.start.play();
		document.getElementById("state").innerHTML = "Race started!";
		document.getElementById("timer").style.display = "none";
	},
	end: function() {
		game.audio.end.play();
		renderer.clearMarbleMeshes();
		document.getElementById("marbleList").innerHTML = document.getElementById("marbleListTemplate").outerHTML;
		document.getElementById("entries").innerHTML = "0";
		document.getElementById("state").innerHTML = "Enter marbles now!";
		document.getElementById("timer").style.display = "block";
		game.startTimerInterval(this.state.enterPeriod * 1000);
	},
	startTimerInterval: function(ms) {
		let s = ms/1000;
		let timerElement = document.getElementById("timer");
		timerElement.innerHTML = Math.ceil(s);
		setTimeout(function() {
			let timeLeft = Math.floor(s);
			console.log(s,timeLeft);
			let timerInterval = setInterval(function() {
				if (timeLeft < 0) {
					clearInterval(timerInterval);
				} else {
					timerElement.innerHTML = timeLeft;
				}
				timeLeft--;
			},1000);
			timerElement.innerHTML = timeLeft;
			timeLeft--;
		}, ms - Math.floor(s)*1000); // milliseconds only, i.e. 23941 becomes 941
		console.log(ms - Math.floor(s)*1000);
	}
};

// Document state promise
let domReadyTimestamp;
let domReady =
	new Promise((resolve) => {
		if (document.readyState === "interactive" || document.readyState === "complete") {
			resolve(true);
		} else {
			window.addEventListener("DOMContentLoaded", () => resolve(true), false);
		}
	}).then(() => {
		domReadyTimestamp = (new Date()).getTime();
	});

// Socket data promise
let netReady = new Promise((resolve) => {
	// Once connected, client receives initial data
	socket.on("initial data", function(obj) {
		net.marbleData = obj;

		/* Socket RPCs */
		// New marble
		socket.on("new marble", function(obj) {
			renderer.spawnMarble(obj);
		});

		// Start game
		socket.on("start", function() {
			game.start();
		});

		// End game, and start next round
		socket.on("clear", function() {
			game.end();
		});

		resolve(true);
	});
}).then(()=>{
	/* Physics syncing */
	// Once connection is acknowledged, start requesting physics updates
	net.getServerData = function() {
		if (net.ready < net.tickrate) {
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
		setTimeout(net.getServerData,1000 / net.tickrate);
	};
	net.getServerData();
});

let requestComplete;
let requestStart = (new Date()).getTime();
let gameStateReady = fetch("/client?gamestate=true")
	.then((response) => {
		requestComplete = (new Date()).getTime();
		return response.json();
	});

// If both promises fulfill, start rendering & fill entries field
Promise.all([netReady, domReady]).then(function () {
	import(
		/* webpackPrefetch: true */
		/* webpackChunkName: "renderer" */
		"./render"
	).then((dImport)=>{
		renderer = dImport;
		renderer.updateNet(net);
		renderer.renderInit();
	});
	document.getElementById("entries").innerHTML = net.marbleData.length;
});


Promise.all([gameStateReady, domReady]).then((values) => {
	game.state = values[0];
	console.log(
		values,
		game.state,
		requestComplete,
		requestStart,
		domReadyTimestamp,
		(requestComplete - requestStart) + (requestComplete - domReadyTimestamp)
	);
	if (game.state.gameState === "started") {
		document.getElementById("timer").style.display = "none";
		document.getElementById("state").innerHTML = "Race started!";
	} else {
		// Remove document load time & request time
		game.state.timeToEnter -= (
			(requestComplete - requestStart) + (requestComplete - domReadyTimestamp)
		);

		// Start timer interval
		game.startTimerInterval(game.state.timeToEnter);

		// Show the timer
		document.getElementById("timer").innerHTML = game.state.timeToEnter.toString().substr(0, 2);
	}
});

window.addEventListener("DOMContentLoaded", function() {

	// Fix camera
	/* document.getElementById("fixCam").addEventListener("click", function(){
		controls.getObject().position.x = 0;
		controls.getObject().position.y = 0;
		controls.getObject().position.z = 0;
	},false); */

},false);
