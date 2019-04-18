import domReady from "../dom-ready";
import * as Cookies from "js-cookie";
import * as renderer from "./render";

let game = (function() {
	let _audio = {
			start: new Audio("resources/audio/start.mp3"),
			end: new Audio("resources/audio/end.mp3")
		},

		_enteredMarbleList = [],

		_serverData = {
			currentGameState: undefined,
			roundStartTime: undefined,
			maxRoundLength: undefined,
			enterPeriodTimeRemaining: undefined,
			enterPeriodLength: undefined,

			mapId: undefined
		},

		_roundTimerStartDate,
		_roundTimerIsVisible = false,
		_enterPeriodTimerInterval,
		_startTimerIsRunning = false,

		_DOMReadyTimestamp,
		_DOMElements = {},

		_requestComplete,
		_requestStart = Date.now();

	let _startTimerInterval = function(s) {
		// Make sure it only runs once
		if (!_startTimerIsRunning) {
			_startTimerIsRunning = true;

			// Convert to milliseconds
			let ms = Math.round(s * 1000);

			// Wait to get back on whole seconds, so we can decrement the timer by 1 every second
			setTimeout(() => {
				let timeLeft = Math.floor(s);

				_enterPeriodTimerInterval = setInterval(() => {
					if (timeLeft <= 0) {
						clearInterval(_enterPeriodTimerInterval);
					} else {
						_DOMElements.timer.innerText = timeLeft;
					}
					timeLeft--;
				}, 1000);

				_DOMElements.timer.innerText = timeLeft;

				timeLeft--;
			}, ms % 1000); // milliseconds only, i.e. 23941 becomes 941
		}
	};

	let _animateRoundTimer = function() {
		if (_roundTimerIsVisible) {
			requestAnimationFrame(_animateRoundTimer);
			_DOMElements.timer.innerText = ((Date.now() - _roundTimerStartDate) * .001).toFixed(1);
		}
	};

	// DOM ready
	domReady.then(() => {
		_DOMReadyTimestamp = (new Date()).getTime();

		// Get element references
		_DOMElements.timer = document.getElementById("timer");
		_DOMElements.state = document.getElementById("state");
		_DOMElements.entries = document.getElementById("entries");
		_DOMElements.gameInfo = document.getElementById("gameInfo");
		_DOMElements.marbleList = document.getElementById("marbleList");
		_DOMElements.marbleListTemplate = document.getElementById("marbleListTemplate");
		_DOMElements.raceLeaderboard = document.getElementById("raceLeaderboard");
		_DOMElements.resultsList = document.getElementById("resultsList");
		_DOMElements.resultsListTemplate = document.getElementById("resultsListTemplate");
	});

	return {
		setCurrentGameState: function(newStateData, isInitialState = false) {
			let newState = newStateData.state;

			_serverData.currentGameState = newState;
			_DOMElements.gameInfo.className = newState;

			switch(newState) {
			// Start of a new round
			case "waiting":
				_startTimerIsRunning = false;
				_roundTimerIsVisible = false;
				_enteredMarbleList = [];
				renderer.clearMarbleMeshes();
				_DOMElements.entries.innerText = "0";
				_DOMElements.state.innerText = "Enter marbles now!";
				_DOMElements.timer.innerText = Math.ceil(_serverData.enterPeriodLength);
				break;

			// First marble has been entered
			case "enter":
				if (isInitialState) {
					// Remove document load time & request time
					_serverData.enterPeriodTimeRemaining -= (
						(_requestComplete - _requestStart) + (_requestComplete - _DOMReadyTimestamp)
					);
				} else {
					_serverData.enterPeriodTimeRemaining = _serverData.enterPeriodLength * 1000;
				}

				// Start timer interval
				_startTimerInterval(_serverData.enterPeriodTimeRemaining / 1000);

				// Show the timer
				_DOMElements.timer.innerText = Math.ceil(_serverData.enterPeriodTimeRemaining / 1000).toFixed(0);
				break;

			// Marbles can no longer be entered
			case "starting":
				if (!isInitialState) {
					_audio.start.play();
				}
				clearInterval(_enterPeriodTimerInterval);
				_DOMElements.state.innerHTML = "The race is starting...";
				break;

			// The race has started
			case "started":
				if (isInitialState) {
					// The round has already started, so give the timer a head-start
					_roundTimerStartDate = _serverData.roundStartTime;
				} else {
					// The round started just now, so use the current date
					_roundTimerStartDate = Date.now();
				}
				_roundTimerIsVisible = true;
				_animateRoundTimer();
				_DOMElements.state.innerHTML = "Race started!";
				break;

			// The race has finished
			case "finished":
				if (!isInitialState) {
					_audio.end.play();

					_DOMElements.raceLeaderboard.className = "visible";

					_enteredMarbleList.sort((a, b) => {
						if (a.finished && b.finished) {
							return b.time - a.time;
						} else if (a.finished) {
							return 1;
						} else if (b.finished) {
							return -1;
						} else {
							return 0;
						}
					});

					// Reverse it cause im stupid
					_enteredMarbleList.reverse();

					_DOMElements.resultsList.innerHTML = "";

					// Get current user_data to see if any row needs to be highlighted
					let user_data = Cookies.getJSON("user_data");

					// Build leaderboard DOM
					let resultsListFragment = new DocumentFragment();
					for (let i = 0; i < _enteredMarbleList.length; i++) {
						let marble = _enteredMarbleList[i];
						let resultsEntry = _DOMElements.resultsListTemplate.cloneNode(true);

						resultsEntry.removeAttribute("id");

						// Highlight for current player
						if (user_data && user_data.id === marble.userId) {
							resultsEntry.className += " currentPlayer";
						}

						resultsEntry.getElementsByClassName("rank")[0].innerText = (i + 1);
						resultsEntry.getElementsByClassName("name")[0].innerText = marble.name;

						if (marble.userId && newStateData.data[marble.userId].record === "pb") {
							resultsEntry.getElementsByClassName("record")[0].innerText = "PB";
							resultsEntry.getElementsByClassName("record")[0].className += " pb";
						}

						if (marble.finished) {
							resultsEntry.getElementsByClassName("time")[0].innerText = (marble.time * .001).toFixed(2);
							resultsEntry.getElementsByClassName("timediff")[0].innerText = i !== 0
								? `+${((marble.time - _enteredMarbleList[0].time) * .001).toFixed(2)}`
								: "-";
						} else {
							resultsEntry.getElementsByClassName("time")[0].className += " dnf";
						}

						if (marble.points) {
							resultsEntry.getElementsByClassName("points")[0].innerText = `+${marble.points}`;
						} else {
							resultsEntry.getElementsByClassName("points")[0].className += " none";
						}

						if (marble.userId) resultsEntry.getElementsByClassName("pointstotal")[0].innerText = newStateData.data[marble.userId].points;

						resultsListFragment.appendChild(resultsEntry);
					}
					_DOMElements.resultsList.appendChild(resultsListFragment);

					// Automatic scroll
					if (_DOMElements.resultsList.scrollHeight !== 0) {
						_DOMElements.resultsList.scrollTop = _DOMElements.resultsList.scrollHeight;

						// Start scrolling up
						setTimeout(function() {
							let scrollStart = new Date();
							let scrollTimeLength = (_serverData.finishPeriodLength * 1000 - 3000);

							let animateResultsScroll = function() {
								let scrollCurrent = new Date();
								if (_DOMElements.resultsList.scrollTop !== 0) {
									requestAnimationFrame(animateResultsScroll);

									_DOMElements.resultsList.scrollTop =
										Math.floor(_DOMElements.resultsList.scrollHeight * (1 - (scrollCurrent - scrollStart) / scrollTimeLength));
								}
							};

							animateResultsScroll();
						}, 3000);
					}

					// Hide leaderboard
					setTimeout(function() {
						_DOMElements.raceLeaderboard.className = "";
					}, _serverData.finishPeriodLength * 1000 + 5000);
				}

				_roundTimerIsVisible = false;

				_DOMElements.marbleList.innerHTML = _DOMElements.marbleListTemplate.outerHTML;
				_DOMElements.entries.innerText = "0";
				_DOMElements.state.innerText = "Race finished!";
				break;
			}
		},

		spawnMarble: function(marble) {
			// Add to list
			_enteredMarbleList[marble.entryId] = marble;

			// Add mesh
			renderer.spawnMarbleMesh(marble);

			// Add UI stuff
			let listEntry = _DOMElements.marbleListTemplate.cloneNode(true);
			listEntry.removeAttribute("id");
			listEntry.getElementsByClassName("name")[0].innerText = marble.name;
			listEntry.getElementsByClassName("color")[0].style.background = marble.color;
			listEntry.getElementsByClassName("time")[0].innerText = marble.time ? `🏁 ${(marble.time * .001).toFixed(2)}s` : "";
			listEntry.getElementsByClassName("rank")[0].innerText = !isNaN(marble.rank) && marble.rank !== null ? `#${marble.rank + 1}` : "";
			listEntry.style.order = marble.rank;
			_enteredMarbleList[marble.entryId].listEntryElement = listEntry;

			_DOMElements.marbleList.appendChild(listEntry);
			_DOMElements.entries.innerHTML = renderer.marbleMeshes.length;
		},

		finishMarble: function(marble) {
			_enteredMarbleList[marble.id].finished = true;
			_enteredMarbleList[marble.id].rank = marble.rank;
			_enteredMarbleList[marble.id].time = marble.time;
			_enteredMarbleList[marble.id].points = marble.points;

			_enteredMarbleList[marble.id].listEntryElement.getElementsByClassName("rank")[0].innerText = `#${marble.rank + 1}`;
			_enteredMarbleList[marble.id].listEntryElement.style.order = marble.rank;
			_enteredMarbleList[marble.id].listEntryElement.getElementsByClassName("time")[0].innerText = `🏁 ${(marble.time * .001).toFixed(2)}s`;
		},

		// Fill gamestate properties in UI
		setInitialGameState: function(gameStateReady) {
			_requestComplete = Date.now();
			Promise.all([gameStateReady, domReady]).then((values) => {
				_serverData = values[0];

				this.setCurrentGameState(_serverData.currentGameState, true);
			});
		}
	};
})();

export { game };
