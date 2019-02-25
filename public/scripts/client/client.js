import * as config from "../../config";
import * as renderer from "./render";
import domReady from "../domReady";
import { net as networking, socket } from "./networking";

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
		let s = ms / 1000;
		let timerElement = document.getElementById("timer");
		timerElement.innerHTML = Math.ceil(s);
		setTimeout(function() {
			let timeLeft = Math.floor(s);
			console.log(s, timeLeft);
			let timerInterval = setInterval(function() {
				if (timeLeft < 0) {
					clearInterval(timerInterval);
				} else {
					timerElement.innerHTML = timeLeft;
				}
				timeLeft--;
			}, 1000);

			timerElement.innerHTML = timeLeft;
			timeLeft--;
		}, ms - Math.floor(s) * 1000); // milliseconds only, i.e. 23941 becomes 941
		console.log(ms - Math.floor(s) * 1000);
	},
	spawnMarble: function(tags) {
		// Add mesh
		renderer.spawnMarbleMesh(tags);

		// Add UI stuff
		let listEntry = document.getElementById("marbleListTemplate").cloneNode(true);
		listEntry.removeAttribute("id");
		listEntry.getElementsByClassName("name")[0].innerText = tags.name;
		listEntry.getElementsByClassName("color")[0].style.background = tags.color;
		listEntry.getElementsByClassName("id")[0].innerText = renderer.marbleMeshes.length;

		document.getElementById("marbleList").appendChild(listEntry);
		document.getElementById("entries").innerHTML = renderer.marbleMeshes.length;
	}
};

// Add socket RPCs
networking.socketReady.then(() => {
	// New marble
	socket.on("new marble", function(tags) {
		game.spawnMarble(tags);
	});

	// Start game
	socket.on("start", function() {
		game.start();
	});

	// End game, and start next round
	socket.on("clear", function() {
		game.end();
	});
});

// If both promises fulfill, start rendering & fill entries field
Promise.all([networking.socketReady, domReady]).then(() => {
	for (let i = 0; i < networking.marblePositions.length / 3; i++) {
		game.spawnMarble(networking.marbleData[i].tags);
	}

	renderer.init();
	document.getElementById("entries").innerHTML = networking.marbleData.length;
});

// Fetch gamestate
let requestComplete;
let requestStart = (new Date()).getTime();
let gameStateReady = fetch("/client?gamestate=true")
	.then((response) => {
		requestComplete = (new Date()).getTime();
		return response.json();
	});

// Fill gamestate properties in UI
let domReadyTimestamp;
domReady.then(() => {
	domReadyTimestamp = (new Date()).getTime();
});

Promise.all([gameStateReady, domReady]).then((values) => {
	game.state = values[0];
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

}, false);
