import domReady from "../dom-ready";
import { levelManager } from "../level-manager";
import { marbleManager } from "../marble-manager";
import { userState } from "../user-state";
import { renderCore } from "../render/render-core";
import { cameras } from "../render/cameras";
import { HUDNotification } from "./hud-notification";
import { updateManager } from "../update-manager";
import { networking } from "./networking";
import * as gameConstants from "../../game-constants.json";

const game = function() {
	const _audio = {
		start: new Audio("resources/audio/start.mp3"),
		end: new Audio("resources/audio/end.mp3")
	};

	let _enteredMarbleList = [];
	let _finishedMarbles = 0;

	const _serverData = {
		enterPeriodLength: null,
		finishPeriodLength: null,

		currentGameState: null,
		currentLevelId: null
	};

	let _roundTimerStartDate,
		_roundTimerIsVisible = false,
		_enterCountdownTimer = null,

		_initPromise = null,
		_DOMElements = {},

		_marbleBeingTracked = null;

	const _trackMarble = function(marble, forceTracking) {
		if (forceTracking) {
			renderCore.setCameraStyle(cameras.CAMERA_TRACKING);
		}
		if (renderCore.activeCamera.type === cameras.CAMERA_TRACKING) {
			let target = null;
			if (_marbleBeingTracked === marble) {
				_marbleBeingTracked = null;
				renderCore.setCameraStyle(cameras.CAMERA_FREE);
				marble.listEntryElement.getElementsByClassName("camera")[0].classList.remove("selected");
			} else {
				if (_marbleBeingTracked) {
					_marbleBeingTracked.listEntryElement.getElementsByClassName("camera")[0].classList.remove("selected");
				}
				_marbleBeingTracked = marble;
				target = marble.renderObject;
				marble.listEntryElement.getElementsByClassName("camera")[0].classList.add("selected");
			}

			if (target !== undefined) {
				renderCore.trackingCamera.setTarget(target);
			}
		}
	};

	// Starts the "enter marbles now" visual timer. timeLeft in milliseconds
	const _startEnterCountdown = function(timerValue) {
		// Make sure it only runs once
		if(_enterCountdownTimer !== null) clearInterval(_enterCountdownTimer);

		_DOMElements.timer.innerText = Math.ceil(timerValue / 1000).toFixed(0);

		// Wait to get back on whole seconds, so we can decrement the timer by 1 every second
		_enterCountdownTimer = setTimeout(() => {
			let timeLeft = Math.floor(timerValue / 1000);

			_enterCountdownTimer = setInterval(() => {
				if (timeLeft < 0) {
					clearInterval(_enterCountdownTimer);
					_enterCountdownTimer = null;
				} else {
					_DOMElements.timer.innerText = timeLeft;
				}
				timeLeft--;
			}, 1000);

			_DOMElements.timer.innerText = timeLeft;

			timeLeft--;
		}, timerValue % 1000); // milliseconds only, i.e. 23941 becomes 941
	};

	const _animateRoundTimer = function() {
		if (_roundTimerIsVisible) {
			requestAnimationFrame(_animateRoundTimer);
			_DOMElements.timer.innerText = ((Date.now() - _roundTimerStartDate) * .001).toFixed(1);
		}
	};

	const _update = function(deltaTime) {
		levelManager.activeLevel.update(deltaTime);
		networking.update(deltaTime);
	};

	return {
		// Returns a Promise that resolves once initialization is complete
		// Can be called multiple times but will initialize only once
		initialize: function() {
			if(!_initPromise) {
				_initPromise = domReady.then( () => {
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
					updateManager.addUpdateCallback(_update);
				});
			}
			return _initPromise;
		},

		setServerConstants: function(enterPeriod, finishPeriod) {
			_serverData.enterPeriodLength = enterPeriod;
			_serverData.finishPeriodLength = finishPeriod;
		},

		// Resets the game's state (not including the level) to their defaults
		resetGame: function() {
			// Reset/hide DOM elements
			_DOMElements.gameInfo.className = "";
			_DOMElements.marbleList.innerHTML = _DOMElements.marbleListTemplate.outerHTML;
			_DOMElements.entries.innerText = "0";
			_DOMElements.state.innerText = "...";
			_DOMElements.timer.innerText = "...";
			_DOMElements.resultsList.innerHTML = "";
			_DOMElements.raceLeaderboard.className = "";

			// Stop timers
			clearInterval(_enterCountdownTimer);
			_enterCountdownTimer = null;
			_roundTimerIsVisible = false;

			// Clear marble data
			_enteredMarbleList = [];
			_finishedMarbles = 0;
			marbleManager.clearMarbles();
			_marbleBeingTracked = null;
			renderCore.trackingCamera.setTarget(null);
			levelManager.activeLevel.closeGates();

			_serverData.currentGameState = null;
		},

		setLevel: function(levelId) {
			// Start loading the level asynchronously if not yet loaded
			if(_serverData.currentLevelId !== levelId) {
				console.log(`Loading level: ${levelId}`);
				let loadingNotification = new HUDNotification({
					content: "Downloading...",
					lifetime: 0,
					classNames: "blue wait",
					progressTarget: 2
				});
				_serverData.currentLevelId = levelId;

				// Add loading event listeners
				levelManager.activeLevel.eventTarget.addEventListener("downloadComplete", () => {
					loadingNotification.incrementProgress("Loading models...");
				}, false);

				levelManager.activeLevel.eventTarget.addEventListener("loadModelsComplete", () => {
					loadingNotification.incrementProgress("Building world...");
				}, false);

				levelManager.activeLevel.loadLevelFromUrl(`/resources/levels/${levelId}.mmc`).then((result) => {
					if (result === "failed") {
						loadingNotification.failProgress();
						loadingNotification.changeContent("Level loading failed... Try refreshing the page?");
						loadingNotification.changeClassNames("red cross");
						loadingNotification.remove(10);
					} else if (result !== 0) {
						loadingNotification.failProgress();
						loadingNotification.changeContent("Level loading incomplete... If this happens often, contact the server admin.");
						loadingNotification.changeClassNames("red cross");
						loadingNotification.remove(5);
					} else {
						loadingNotification.incrementProgress();
						loadingNotification.changeContent("Level successfully loaded!");
						loadingNotification.changeClassNames("green check");
						loadingNotification.remove(5);
					}
					if(this.getCurrentGameState() === gameConstants.STATE_STARTED) {
						levelManager.activeLevel.openGates();
					}
				});
			}
		},

		setGameState: function(newState, additionalData) {
			switch(newState) {
			// Server is loading a level
			case gameConstants.STATE_LOADING:
				_DOMElements.gameInfo.className = "waiting";
				clearInterval(_enterCountdownTimer);
				_enterCountdownTimer = null;
				_roundTimerIsVisible = false;
				_enteredMarbleList = [];
				_finishedMarbles = 0;
				marbleManager.clearMarbles();
				_marbleBeingTracked = null;
				renderCore.trackingCamera.setTarget(null);
				_DOMElements.entries.innerText = "0";
				_DOMElements.state.innerText = "Warming up...";
				_DOMElements.timer.innerText = "...";
				_DOMElements.marbleList.innerHTML = _DOMElements.marbleListTemplate.outerHTML;
				break;

			// Start of a new round
			case gameConstants.STATE_WAITING:
				renderCore.autoUpdateShadowMap(false);
				renderCore.updateShadowMap(); // Update the shadows once for when last round's marbles disappear
				_DOMElements.gameInfo.className = "waiting";
				clearInterval(_enterCountdownTimer);
				_enterCountdownTimer = null;
				_roundTimerIsVisible = false;
				_enteredMarbleList = [];
				_finishedMarbles = 0;
				marbleManager.clearMarbles();
				_marbleBeingTracked = null;
				renderCore.trackingCamera.setTarget(null);
				_DOMElements.entries.innerText = "0";
				_DOMElements.state.innerText = "Enter marbles now!";
				_DOMElements.timer.innerText = Math.ceil(_serverData.enterPeriodLength);

				// In some cases, STATE_FINISHED can be skipped, which causes problems.
				// The commands below make sure to avoid the problems mentioned.
				levelManager.activeLevel.closeGates();
				_DOMElements.marbleList.innerHTML = _DOMElements.marbleListTemplate.outerHTML;
				break;

			// First marble has been entered
			case gameConstants.STATE_ENTER:
				_DOMElements.gameInfo.className = "enter";
				// Set text (set in the previous state unless this is the initial state)
				_DOMElements.state.innerText = "Enter marbles now!";
				// Start enter period countdown. additionalData is time left in ms
				_startEnterCountdown(additionalData); // TODO: Take ping & buffer into account
				break;

			// Server is preparing a race start
			case gameConstants.STATE_PREPARING:
				_DOMElements.state.innerText = "Getting ready...";
				break;

			// Marbles can no longer be entered
			case gameConstants.STATE_STARTING:
				_DOMElements.gameInfo.className = "starting";
				if (_serverData.currentGameState !== null) {
					_audio.start.play();
				}
				clearInterval(_enterCountdownTimer);
				_enterCountdownTimer = null;
				_DOMElements.state.innerText = "The race is starting...";
				_DOMElements.timer.innerHTML = "&#129345;";
				break;

			// The race has started
			case gameConstants.STATE_STARTED:
				_DOMElements.gameInfo.className = "started";
				// additionalData represents current race time here
				_roundTimerStartDate = Date.now() - additionalData;
				_roundTimerIsVisible = true;
				_animateRoundTimer();
				levelManager.activeLevel.openGates();
				_DOMElements.state.innerHTML = "Race started!";
				break;

			// The race has finished
			case gameConstants.STATE_FINISHED:
				renderCore.autoUpdateShadowMap(false);
				_DOMElements.gameInfo.className = "finished";
				if (_serverData.currentGameState !== null) {
					_audio.end.play();

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

					// Prepare additional data
					let finishData = {};
					if(additionalData) { // Can be empty in a bot-only round
						for(let i = 0; i < additionalData.length; i += 4) {
							finishData[additionalData[i]] = {
								pointsEarned: additionalData[i + 1],
								pointTotal: additionalData[i + 2],
								record: additionalData[i + 3]
							};
						}
					}

					// Build leaderboard DOM
					let resultsListFragment = new DocumentFragment();
					for (let i = 0; i < _enteredMarbleList.length; i++) {
						let marble = _enteredMarbleList[i];
						let resultsEntry = _DOMElements.resultsListTemplate.cloneNode(true);

						resultsEntry.removeAttribute("id");

						// Highlight for current player
						if (userState.data && userState.data.id === marble.userId) {
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
							// PBs and WRs
							if (finishData[marble.userId].record === gameConstants.RECORD_PB) {
								resultsEntry.getElementsByClassName("record")[0].innerText = "PB";
								resultsEntry.getElementsByClassName("record")[0].className += " pb";
							} else if(finishData[marble.userId].record === gameConstants.RECORD_WR) {
								resultsEntry.getElementsByClassName("record")[0].innerText = "WR";
								resultsEntry.getElementsByClassName("record")[0].className += " wr";
							}

							// Points earned this round
							resultsEntry.getElementsByClassName("points")[0].innerText = `+${finishData[marble.userId].pointsEarned}`;

							// Points earned over time
							resultsEntry.getElementsByClassName("pointstotal")[0].innerText = finishData[marble.userId].pointTotal;
						} else {
							// Points earned this round
							resultsEntry.getElementsByClassName("points")[0].className += " none";
						}

						resultsListFragment.appendChild(resultsEntry);
					}
					_DOMElements.resultsList.appendChild(resultsListFragment);

					_DOMElements.raceLeaderboard.className = "visible";
					_DOMElements.raceLeaderboardLevelName.innerText = levelManager.activeLevel.levelName;
					_DOMElements.raceLeaderboardAuthorName.innerText = levelManager.activeLevel.authorName;

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
			default:
				console.warn(`Unknown new state ID "${newState}" in setState.`);
				return;
			}
			_serverData.currentGameState = newState;
		},

		getCurrentGameState: function() {
			return _serverData.currentGameState;
		},

		spawnMarble: function(marble) {
			// Set defaults that aren't sent over from the server
			marble.finished = false;
			marble.rank = null;

			// Add to array of marble entries
			_enteredMarbleList[marble.entryId] = marble;

			// Add mesh
			marble.renderObject = marbleManager.spawnMarble(marble);

			// Add UI stuff
			let listEntry = _DOMElements.marbleListTemplate.cloneNode(true);
			listEntry.removeAttribute("id");
			listEntry.getElementsByClassName("camera")[0].addEventListener("click", function() {
				_trackMarble(marble, true);
			}, false);
			listEntry.getElementsByClassName("name")[0].innerText = marble.name;
			listEntry.getElementsByClassName("color")[0].style.backgroundColor = marble.color;
			listEntry.getElementsByClassName("color")[0].style.backgroundImage = `url("resources/skins/${marble.skinId}/diffuse.png")`;
			listEntry.getElementsByClassName("time")[0].innerText = "";
			listEntry.getElementsByClassName("rank")[0].innerText = "";
			_enteredMarbleList[marble.entryId].listEntryElement = listEntry;

			if (userState.data && userState.data.id === marble.userId) {
				if (!renderCore.trackingCamera.target) {
					_trackMarble(marble);
				}
				listEntry.classList.add("player");
			}

			_DOMElements.marbleList.appendChild(listEntry);
			_DOMElements.entries.innerHTML = _enteredMarbleList.length;

			// Make sure shadows updates are enabled
			renderCore.autoUpdateShadowMap(true);
		},

		finishMarble: function(marble) {
			let finishedMarble = _enteredMarbleList[marble.entryId];
			finishedMarble.finished = true;
			finishedMarble.rank = _finishedMarbles++;
			finishedMarble.time = marble.time;

			finishedMarble.listEntryElement.classList.add("finished");
			finishedMarble.listEntryElement.getElementsByClassName("rank")[0].innerText = `#${finishedMarble.rank + 1}`;
			finishedMarble.listEntryElement.getElementsByClassName("time")[0].innerText = `${(finishedMarble.time * .001).toFixed(2)}s`;
			finishedMarble.listEntryElement.style.order = finishedMarble.rank;
		}
	};
}();

export { game };
