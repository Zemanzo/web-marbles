import domReady from "../domReady";
import * as renderer from "./render";

let audio = {
	start: new Audio("resources/audio/start.mp3"),
	end: new Audio("resources/audio/end.mp3")
};

let state = {
	timeToEnter: null
};

let marbles = [];

export function start() {
	audio.start.play();
	clearInterval(_timerInterval);
	setTimeout(function() {
		state.timerStart = Date.now();
		state.roundTimer = true;
		roundTimer();
		elements.state.innerHTML = "Race started!";
		elements.gameInfo.className = "started";
	}, 2825);
	elements.state.innerHTML = "The race is starting...";
	elements.gameInfo.className = "starting";
}

export function end() {
	audio.end.play();
	state.roundTimer = false;
	marbles = [];
	renderer.clearMarbleMeshes();
	elements.marbleList.innerHTML = elements.marbleListTemplate.outerHTML;
	elements.entries.innerHTML = "0";
	elements.state.innerHTML = "Enter marbles now!";
	elements.gameInfo.className = "enter";
	elements.timer.innerText = Math.ceil(state.enterPeriod);
	startTimerInterval(state.enterPeriod);
}

let _timerInterval;
function startTimerInterval(s) {
	let ms = Math.round(s * 1000);
	console.log(s, ms, ms - Math.floor(s) * 1000);

	setTimeout(() => {
		let timeLeft = Math.floor(s);

		_timerInterval = setInterval(() => {
			if (timeLeft <= 0) {
				clearInterval(_timerInterval);
			} else {
				elements.timer.innerText = timeLeft;
			}
			timeLeft--;
		}, 1000);

		elements.timer.innerText = timeLeft;

		timeLeft--;
	}, ms - Math.floor(s) * 1000); // milliseconds only, i.e. 23941 becomes 941
}

let roundTimer = function() {
	if (state.roundTimer) {
		requestAnimationFrame(roundTimer);
		elements.timer.innerText = ((Date.now() - state.timerStart) * .001).toFixed(1);
	}
};

export function setInitialRoundTimer(time) {
	state.timerStart = time;
	state.roundTimer = true;
	roundTimer();
}

export function spawnMarble(tags) {
	// Add to list
	marbles[tags.id] = tags;

	// Add mesh
	renderer.spawnMarbleMesh(tags);

	// Add UI stuff
	let listEntry = elements.marbleListTemplate.cloneNode(true);
	listEntry.removeAttribute("id");
	listEntry.getElementsByClassName("name")[0].innerText = tags.name;
	listEntry.getElementsByClassName("color")[0].style.background = tags.color;
	listEntry.getElementsByClassName("time")[0].innerText = tags.time ? `🏁 ${(tags.time * .001).toFixed(2)}s` : "";
	listEntry.getElementsByClassName("rank")[0].innerText = !isNaN(tags.rank) ? `#${tags.rank + 1}` : "";
	listEntry.style.order = tags.rank;
	marbles[tags.id].listEntryElement = listEntry;

	elements.marbleList.appendChild(listEntry);
	elements.entries.innerHTML = renderer.marbleMeshes.length;
}

export function finishMarble(tags) {
	marbles[tags.id].rank = tags.rank;
	marbles[tags.id].time = tags.time;

	marbles[tags.id].listEntryElement.getElementsByClassName("rank")[0].innerText = `#${tags.rank + 1}`;
	marbles[tags.id].listEntryElement.style.order = tags.rank;
	marbles[tags.id].listEntryElement.getElementsByClassName("time")[0].innerText = `🏁 ${(tags.time * .001).toFixed(2)}s`;
}

// Fetch gamestate
let requestComplete,
	requestStart = (new Date()).getTime(),
	gameStateReady = fetch("/client?gamestate=true")
		.then((response) => {
			requestComplete = (new Date()).getTime();
			return response.json();
		});

// DOM ready
let domReadyTimestamp,
	elements = {};

domReady.then(() => {
	domReadyTimestamp = (new Date()).getTime();

	// Get element references
	elements.timer = document.getElementById("timer");
	elements.state = document.getElementById("state");
	elements.entries = document.getElementById("entries");
	elements.gameInfo = document.getElementById("gameInfo");
	elements.marbleList = document.getElementById("marbleList");
	elements.marbleListTemplate = document.getElementById("marbleListTemplate");
});

// Fill gamestate properties in UI
Promise.all([gameStateReady, domReady]).then((values) => {
	state = values[0];
	if (state.gameState === "started") {

		// Start timer
		console.log(state);
		if (state.roundTimerStart) {
			elements.state.innerHTML = "Race started!";
			elements.gameInfo.className = "started";
			setInitialRoundTimer(state.roundTimerStart);
		} else {
			elements.state.innerHTML = "The race is starting...";
			elements.gameInfo.className = "starting";
		}

	} else {
		// Remove document load time & request time
		state.timeToEnter -= (
			(requestComplete - requestStart) + (requestComplete - domReadyTimestamp)
		);

		// Start timer interval
		startTimerInterval(state.timeToEnter / 1000);

		// Show the timer
		elements.timer.innerHTML = state.timeToEnter.toString().substr(0, 2);
	}
});
