import domReady from "../dom-ready";
import * as renderer from "./render";

let audio = {
		start: new Audio("resources/audio/start.mp3"),
		end: new Audio("resources/audio/end.mp3")
	},
	_marbles = [],
	_state = {
		gameState: undefined,
		roundTimerStart: undefined,
		timeToEnter: undefined,
		enterPeriod: undefined,
		maxRoundLength: undefined,
		mapId: undefined,
		initialMarbleData: undefined
	},
	_enterTimerInterval,
	_startTimerIsRunning = false,
	_domReadyTimestamp,
	_elements = {},
	_requestComplete,
	_requestStart = Date.now();

// DOM ready
domReady.then(() => {
	_domReadyTimestamp = (new Date()).getTime();

	// Get element references
	_elements.timer = document.getElementById("timer");
	_elements.state = document.getElementById("state");
	_elements.entries = document.getElementById("entries");
	_elements.gameInfo = document.getElementById("gameInfo");
	_elements.marbleList = document.getElementById("marbleList");
	_elements.marbleListTemplate = document.getElementById("marbleListTemplate");
});

let _startTimerInterval = function(s) {
	if (!_startTimerIsRunning) {
		_startTimerIsRunning = true;

		let ms = Math.round(s * 1000);
		console.log(s, ms, ms - Math.floor(s) * 1000);

		setTimeout(() => {
			let timeLeft = Math.floor(s);

			_enterTimerInterval = setInterval(() => {
				if (timeLeft <= 0) {
					clearInterval(_enterTimerInterval);
				} else {
					_elements.timer.innerText = timeLeft;
				}
				timeLeft--;
			}, 1000);

			_elements.timer.innerText = timeLeft;

			timeLeft--;
		}, ms - Math.floor(s) * 1000); // milliseconds only, i.e. 23941 becomes 941
	}
};

let _roundTimer = function() {
	if (_state.roundTimerIsVisible) {
		requestAnimationFrame(_roundTimer);
		_elements.timer.innerText = ((Date.now() - _state.timerStart) * .001).toFixed(1);
	}
};

export function setState(newState, initial = false) {
	_state.gameState = newState;
	_elements.gameInfo.className = newState;

	switch(newState) {
	// Round end
	case "waiting":
		if (!initial) {
			audio.end.play();
		}
		_startTimerIsRunning = false;
		_state.roundTimerIsVisible = false;
		_marbles = [];
		renderer.clearMarbleMeshes();
		_elements.marbleList.innerHTML = _elements.marbleListTemplate.outerHTML;
		_elements.entries.innerText = "0";
		_elements.state.innerText = "Enter marbles now!";
		_elements.timer.innerText = Math.ceil(_state.enterPeriod);
		break;

	// First marble has been entered
	case "enter":
		if (initial) {
			// Remove document load time & request time
			_state.timeToEnter -= (
				(_requestComplete - _requestStart) + (_requestComplete - _domReadyTimestamp)
			);
		} else {
			_state.timeToEnter = _state.enterPeriod * 1000;
		}

		// Start timer interval
		_startTimerInterval(_state.timeToEnter / 1000);

		// Show the timer
		_elements.timer.innerText = Math.ceil(_state.timeToEnter / 1000).toFixed(0);
		break;

	// Marbles can no longer be entered
	case "starting":
		if (!initial) {
			audio.start.play();
		}
		clearInterval(_enterTimerInterval);
		_elements.state.innerHTML = "The race is starting...";
		break;

	// The game has started
	case "started":
		if (initial) {
			// The round has already started, so give the timer a head-start
			_state.timerStart = _state.roundTimerStartTime;
		} else {
			// The round started just now, so use the current date
			_state.timerStart = Date.now();
		}
		_state.roundTimerIsVisible = true;
		_roundTimer();
		_elements.state.innerHTML = "Race started!";
		break;
	}
}

export function spawnMarble(tags) {
	// Add to list
	_marbles[tags.id] = tags;

	// Add mesh
	renderer.spawnMarbleMesh(tags);

	// Add UI stuff
	let listEntry = _elements.marbleListTemplate.cloneNode(true);
	listEntry.removeAttribute("id");
	listEntry.getElementsByClassName("name")[0].innerText = tags.name;
	listEntry.getElementsByClassName("color")[0].style.background = tags.color;
	listEntry.getElementsByClassName("time")[0].innerText = tags.time ? `🏁 ${(tags.time * .001).toFixed(2)}s` : "";
	listEntry.getElementsByClassName("rank")[0].innerText = !isNaN(tags.rank) ? `#${tags.rank + 1}` : "";
	listEntry.style.order = tags.rank;
	_marbles[tags.id].listEntryElement = listEntry;

	_elements.marbleList.appendChild(listEntry);
	_elements.entries.innerHTML = renderer.marbleMeshes.length;
}

export function finishMarble(tags) {
	_marbles[tags.id].rank = tags.rank;
	_marbles[tags.id].time = tags.time;

	_marbles[tags.id].listEntryElement.getElementsByClassName("rank")[0].innerText = `#${tags.rank + 1}`;
	_marbles[tags.id].listEntryElement.style.order = tags.rank;
	_marbles[tags.id].listEntryElement.getElementsByClassName("time")[0].innerText = `🏁 ${(tags.time * .001).toFixed(2)}s`;
}

// Fill gamestate properties in UI
export function setInitialState(gameStateReady) {
	_requestComplete = Date.now();
	Promise.all([gameStateReady, domReady]).then((values) => {
		_state = values[0];

		setState(_state.gameState, true);
	});
}
