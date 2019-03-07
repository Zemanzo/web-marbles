import domReady from "../domReady";
import * as renderer from "./render";

let audio = {
		start: new Audio("resources/audio/start.mp3"),
		end: new Audio("resources/audio/end.mp3")
	},
	marbles = [],
	state = {};

export function setState(newState, initial = false) {
	state.gameState = newState;

	elements.gameInfo.className = newState;
	switch(newState) {

	// Round end
	case "waiting":
		if (!initial) {
			audio.end.play();
		}
		_startTimerIsRunning = false;
		state.roundTimer = false;
		marbles = [];
		renderer.clearMarbleMeshes();
		elements.marbleList.innerHTML = elements.marbleListTemplate.outerHTML;
		elements.entries.innerText = "0";
		elements.state.innerText = "Enter marbles now!";
		elements.timer.innerText = Math.ceil(state.enterPeriod);
		break;

	// First marble has been entered
	case "enter":
		if (initial) {
			// Remove document load time & request time
			state.timeToEnter -= (
				(requestComplete - requestStart) + (requestComplete - domReadyTimestamp)
			);
		} else {
			state.timeToEnter = state.enterPeriod * 1000;
		}

		// Start timer interval
		startTimerInterval(state.timeToEnter / 1000);

		// Show the timer
		elements.timer.innerText = Math.ceil(state.timeToEnter / 1000).toFixed(0);
		break;

	// Marbles can no longer be entered
	case "starting":
		if (!initial) {
			audio.start.play();
		}
		clearInterval(_timerInterval);
		elements.state.innerHTML = "The race is starting...";
		break;

	// The game has started
	case "started":
		if (initial) {
			state.timerStart = state.roundTimerStart;
		} else {
			state.timerStart = Date.now();
		}
		state.roundTimer = true;
		roundTimer();
		elements.state.innerHTML = "Race started!";
		break;
	}
}

let _timerInterval,
	_startTimerIsRunning = false;
function startTimerInterval(s) {
	if (!_startTimerIsRunning) {
		_startTimerIsRunning = true;

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
}

let roundTimer = function() {
	if (state.roundTimer) {
		requestAnimationFrame(roundTimer);
		elements.timer.innerText = ((Date.now() - state.timerStart) * .001).toFixed(1);
	}
};

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


// Initial gamestate
let requestComplete,
	requestStart = Date.now();

// Fill gamestate properties in UI
export function setInitialState(gameStateReady) {
	requestComplete = Date.now();
	Promise.all([gameStateReady, domReady]).then((values) => {
		state = values[0];

		setState(state.gameState, true);
	});
}
