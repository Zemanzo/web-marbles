import domReady from "../domReady";
import * as renderer from "./render";

let audio = {
	start: new Audio("resources/audio/start.mp3"),
	end: new Audio("resources/audio/end.mp3")
};

let state = {
	timeToEnter: null
};

export function start() {
	audio.start.play();
	document.getElementById("state").innerHTML = "Race started!";
	document.getElementById("timer").style.display = "none";
}

export function end() {
	audio.end.play();
	renderer.clearMarbleMeshes();
	document.getElementById("marbleList").innerHTML = document.getElementById("marbleListTemplate").outerHTML;
	document.getElementById("entries").innerHTML = "0";
	document.getElementById("state").innerHTML = "Enter marbles now!";
	document.getElementById("timer").style.display = "block";
	startTimerInterval(state.enterPeriod * 1000);
}

function startTimerInterval(ms) {
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
}

export function spawnMarble(tags) {
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

// Fetch gamestate
let requestComplete,
	requestStart = (new Date()).getTime(),
	gameStateReady = fetch("/client?gamestate=true")
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
	state = values[0];
	if (state.gameState === "started") {
		document.getElementById("timer").style.display = "none";
		document.getElementById("state").innerHTML = "Race started!";
	} else {
		// Remove document load time & request time
		state.timeToEnter -= (
			(requestComplete - requestStart) + (requestComplete - domReadyTimestamp)
		);

		// Start timer interval
		startTimerInterval(state.timeToEnter);

		// Show the timer
		document.getElementById("timer").innerHTML = state.timeToEnter.toString().substr(0, 2);
	}
});
