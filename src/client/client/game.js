import domReady from "../dom-ready";
import * as Cookies from "js-cookie";
import { levelManager } from "../level-manager";
import { marbleManager } from "../marble-manager";
import { renderCore } from "../render/render-core";

let _userData = Cookies.getJSON("user_data");

let game = function() {
	let _audio = {
			start: new Audio("resources/audio/start.mp3"),
			end: new Audio("resources/audio/end.mp3")
		},

		_enteredMarbleList = [],

		_currentLevelId = null,

		_serverData = {
			currentGameState: null,
			roundStartTime: null,
			maxRoundLength: null,
			enterPeriodTimeRemaining: null,
			enterPeriodLength: null,

			levelId: null
		},

		_roundTimerStartDate,
		_roundTimerIsVisible = false,
		_enterPeriodTimerInterval,
		_startTimerIsRunning = false,

		_initPromise = null,
		_DOMReadyTimestamp,
		_DOMElements = {},

		_marbleBeingTracked = null,

		_requestComplete,
		_requestStart = Date.now();

	let _toggleMarbleTracking = function(marble) {
		if (renderCore.controls.type === "TrackingCamera") {
			let mesh = null;
			if (_marbleBeingTracked === marble) {
				_marbleBeingTracked = null;
				marble.listEntryElement.getElementsByClassName("camera")[0].classList.remove("selected");
			} else {
				if (_marbleBeingTracked) {
					_marbleBeingTracked.listEntryElement.getElementsByClassName("camera")[0].classList.remove("selected");
				}
				_marbleBeingTracked = marble;
				mesh = marble.mesh;
				marble.listEntryElement.getElementsByClassName("camera")[0].classList.add("selected");
			}

			if (mesh !== undefined) {
				renderCore.controls.setTarget(mesh);
			}
		}
	};

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
					if (timeLeft < 0) {
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

	return {

		// Returns a Promise that resolves once initialization is complete
		// Can be called multiple times but will initialize only once
		initialize: function() {
			if(!_initPromise) {
				_initPromise = domReady.then( () => {
					_DOMReadyTimestamp = (new Date()).getTime();

					// Get element references
					_DOMElements.timer = document.getElementById("timer");
					_DOMElements.state = document.getElementById("state");
					_DOMElements.entries = document.getElementById("entries");
					_DOMElements.gameInfo = document.getElementById("gameInfo");
					_DOMElements.marbleList = document.getElementById("marbleList");
					_DOMElements.marbleListTemplate = document.getElementById("marbleListTemplate");
					_DOMElements.raceLeaderboard = document.getElementById("raceLeaderboard");
					_DOMElements.raceLeaderboardLevelName = _DOMElements.raceLeaderboard.getElementsByClassName("levelName")[0];
					_DOMElements.raceLeaderboardAuthorName = _DOMElements.raceLeaderboard.getElementsByClassName("authorName")[0];
					_DOMElements.resultsList = document.getElementById("resultsList");
					_DOMElements.resultsListTemplate = document.getElementById("resultsListTemplate");
				});
			}
			return _initPromise;
		},

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
				marbleManager.clearMarbles();
				_marbleBeingTracked = null;
				if (renderCore.controls.type === "TrackingCamera") {
					renderCore.controls.setTarget(null);
				}
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

					// Set text (usually set in the previous state)
					_DOMElements.state.innerText = "Enter marbles now!";
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
				_DOMElements.state.innerText = "The race is starting...";
				_DOMElements.timer.innerHTML = "&#129345;";
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
				levelManager.activeLevel.openGates();
				_DOMElements.state.innerHTML = "Race started!";
				break;

			// The race has finished
			case "finished":
				if (!isInitialState) {
					_audio.end.play();
					levelManager.activeLevel.closeGates();

					_DOMElements.raceLeaderboard.className = "visible";

					_enteredMarbleList.sort((a, b) => {
						if (a.finished && b.finished) {
							return a.time - b.time;
						} else if (a.finished) {
							return -1;
						} else if (b.finished) {
							return 1;
						} else {
							return 0;
						}
					});

					_DOMElements.resultsList.innerHTML = "";

					// Build leaderboard DOM
					let resultsListFragment = new DocumentFragment();
					for (let i = 0; i < _enteredMarbleList.length; i++) {
						let marble = _enteredMarbleList[i];
						let resultsEntry = _DOMElements.resultsListTemplate.cloneNode(true);

						resultsEntry.removeAttribute("id");

						// Highlight for current player
						if (_userData && _userData.id === marble.userId) {
							resultsEntry.className += " currentPlayer";
						}

						// Rank & name
						resultsEntry.getElementsByClassName("rank")[0].innerText = (i + 1);
						resultsEntry.getElementsByClassName("name")[0].innerText = marble.name;

						// Marble finished state
						if (marble.finished) {
							resultsEntry.getElementsByClassName("time")[0].innerText = (marble.time * .001).toFixed(2);
							resultsEntry.getElementsByClassName("timediff")[0].innerText = i !== 0
								? `+${((marble.time - _enteredMarbleList[0].time) * .001).toFixed(2)}`
								: "-";
						} else {
							resultsEntry.getElementsByClassName("time")[0].className += " dnf";
						}

						// In case our marble is human
						if (marble.userId) {
							// PBs
							if (newStateData.data[marble.userId].record === "pb") {
								resultsEntry.getElementsByClassName("record")[0].innerText = "PB";
								resultsEntry.getElementsByClassName("record")[0].className += " pb";
							}

							// Points earned this round
							resultsEntry.getElementsByClassName("points")[0].innerText = `+${newStateData.data[marble.userId].pointsEarned}`;

							// Points earned over time
							resultsEntry.getElementsByClassName("pointstotal")[0].innerText = newStateData.data[marble.userId].pointsTotal;
						} else {
							// Points earned this round
							resultsEntry.getElementsByClassName("points")[0].className += " none";
						}

						resultsListFragment.appendChild(resultsEntry);
					}
					_DOMElements.resultsList.appendChild(resultsListFragment);

					_DOMElements.raceLeaderboardLevelName.innerText = newStateData.data.level.name;
					_DOMElements.raceLeaderboardAuthorName.innerText = newStateData.data.level.author;

					// Make we're scrolled all the way to the top
					_DOMElements.resultsList.scrollTop = 0;

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

		getCurrentGameState: function() {
			return _serverData.currentGameState;
		},

		spawnMarble: function(marble) {
			// Add to list
			_enteredMarbleList[marble.entryId] = marble;

			// Add mesh
			marbleManager.spawnMarble(marble);

			// Add UI stuff
			let listEntry = _DOMElements.marbleListTemplate.cloneNode(true);
			listEntry.removeAttribute("id");
			listEntry.getElementsByClassName("camera")[0].addEventListener("click", function() {
				_toggleMarbleTracking(marble);
			}, false);
			if (marble.finished) listEntry.classList.add("finished");
			listEntry.getElementsByClassName("name")[0].innerText = marble.name;
			listEntry.getElementsByClassName("name")[0].innerText = marble.name;
			listEntry.getElementsByClassName("color")[0].style.background = marble.color;
			listEntry.getElementsByClassName("time")[0].innerText = marble.time ? `${(marble.time * .001).toFixed(2)}s` : "";
			listEntry.getElementsByClassName("rank")[0].innerText = !isNaN(marble.rank) && marble.rank !== null ? `#${marble.rank + 1}` : "";
			listEntry.style.order = marble.rank;
			_enteredMarbleList[marble.entryId].listEntryElement = listEntry;

			if (_userData && _userData.id === marble.userId) {
				if (!renderCore.controls.target && renderCore.controls.type === "TrackingCamera") {
					_toggleMarbleTracking(marble);
				}
				listEntry.classList.add("player");
			}

			_DOMElements.marbleList.appendChild(listEntry);
			_DOMElements.entries.innerHTML = _enteredMarbleList.length;
		},

		finishMarble: function(marble) {
			_enteredMarbleList[marble.id].finished = true;
			_enteredMarbleList[marble.id].rank = marble.rank;
			_enteredMarbleList[marble.id].time = marble.time;
			_enteredMarbleList[marble.id].points = marble.points;

			_enteredMarbleList[marble.id].listEntryElement.classList.add("finished");
			_enteredMarbleList[marble.id].listEntryElement.getElementsByClassName("rank")[0].innerText = `#${marble.rank + 1}`;
			_enteredMarbleList[marble.id].listEntryElement.style.order = marble.rank;
			_enteredMarbleList[marble.id].listEntryElement.getElementsByClassName("time")[0].innerText = `${(marble.time * .001).toFixed(2)}s`;
		},

		// Initialize game's state, marbles, and level based on server's initial_data
		initializeGameState: function(gameState) {
			_requestComplete = Date.now();
			_serverData = gameState;
			this.setCurrentGameState({state: _serverData.currentGameState}, true);

			// Spawn marbles
			for (let i = 0; i < gameState.initialMarbleData.length; i++) {
				this.spawnMarble(gameState.initialMarbleData[i]);
			}

			// Start loading the level asynchronously
			if(_currentLevelId !== gameState.levelId) {
				_currentLevelId = gameState.levelId;
				levelManager.activeLevel.loadLevelFromUrl(`/resources/maps/${_currentLevelId}.mmc`).then( () => {
					if(this.getCurrentGameState() === "started") {
						levelManager.activeLevel.openGates();
					}
				});
			}
		}
	};
}();

export { game };
