import domReady from "../dom-ready";
import { network as config } from "../config";
import { userState } from "../user-state";
import * as Cookies from "js-cookie";
import ReconnectingWebSocket from "reconnecting-websocket";

let wsUri = `ws${config.ssl ? "s" : ""}://${window.location.hostname}${config.websockets.localReroute ? "" : `:${config.websockets.port}`}/ws/chat`;
let ws = new ReconnectingWebSocket(wsUri, [], {
	minReconnectionDelay: 1000,
	maxReconnectionDelay: 30000,
	reconnectionDelayGrowFactor: 2
});

let cookieData;

function inIframe() {
	try {
		return window.self !== window.top;
	} catch (e) {
		return true;
	}
}

domReady.then(() => {
	// String formatted timestamp
	let timestamp = function() {
		return new Date()
			.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit"
			})
			.replace(/ /g, "")
			.toLowerCase();
	};

	if (inIframe()) {
		document.body.classList.add("semiTransparent");
	}

	// Add discord link open as new window
	document.getElementById("discordLink").addEventListener("click", authenticationWindow, false);

	// Get some references to DOM
	let chatMessages = document.getElementById("chatMessages");
	let chatMessageTemplate = document.getElementById("messageTemplate");

	// Check for former authentication
	cookieData = Cookies.getJSON("user_data");
	checkAuthentication();

	let lastMessageSent = Date.now();
	let sendMessage = function(message) {
		// Check whether messages are not being spammed.
		let messageTimestamp = Date.now();
		if (messageTimestamp > lastMessageSent + 500) {
			ws.send(JSON.stringify({
				access_token: cookieData.access_token,
				id: cookieData.id,
				avatar: cookieData.avatar,
				content: message
			}));
			lastMessageSent = messageTimestamp;
			return true;
		} else {
			return false;
		}
	};

	// On websocket open (connection), add welcome message
	ws.addEventListener("open", function() {
		let clone = chatMessageTemplate.cloneNode(true);
		clone.removeAttribute("id");
		clone.getElementsByClassName("timestamp")[0].innerText = timestamp();
		clone.getElementsByClassName("content")[0].removeChild(clone.getElementsByClassName("username")[0]);
		clone.getElementsByClassName("content")[0].innerText = "Successfully connected to chat. Say !marble to join the race!";
		clone.getElementsByClassName("content")[0].style.marginLeft = "0px";
		clone.getElementsByClassName("content")[0].style.color = "#090";
		clone.getElementsByClassName("content")[0].style.fontStyle = "italic";
		chatMessages.insertAdjacentElement("beforeend", clone);
		chatMessages.scrollTop = chatMessages.scrollHeight;
	});

	// On message, add message to DOM
	ws.addEventListener("message", function(event) {
		let data = JSON.parse(event.data);
		let clone = chatMessageTemplate.cloneNode(true);
		clone.removeAttribute("id");
		clone.getElementsByClassName("timestamp")[0].innerText = timestamp();
		clone.getElementsByClassName("name")[0].innerText = data.username;
		clone.getElementsByClassName("name")[0].title = `${data.username}#${data.discriminator}`;
		clone.getElementsByClassName("text")[0].innerText = data.content;
		chatMessages.insertAdjacentElement("beforeend", clone);
		chatMessages.scrollTop = chatMessages.scrollHeight;
	});

	// On websocket close (disconnect), add warning message. Reconnecting happens automagically.
	ws.addEventListener("close", () => {
		let clone = chatMessageTemplate.cloneNode(true);
		clone.removeAttribute("id");
		clone.getElementsByClassName("timestamp")[0].innerText = timestamp();
		clone.getElementsByClassName("content")[0].removeChild(clone.getElementsByClassName("username")[0]);
		clone.getElementsByClassName("content")[0].innerText =
			`Lost connection... Attempt #${ws._retryCount} to reconnect in ${
				Math.min(Math.ceil(
					ws._options.minReconnectionDelay
					* ws._options.reconnectionDelayGrowFactor
					** (ws._retryCount - 1)
					/ 1000
				), 30)
			} seconds`;
		clone.getElementsByClassName("content")[0].style.marginLeft = "0px";
		clone.getElementsByClassName("content")[0].style.color = "#900";
		clone.getElementsByClassName("content")[0].style.fontStyle = "italic";
		chatMessages.insertAdjacentElement("beforeend", clone);
		chatMessages.scrollTop = chatMessages.scrollHeight;
	});

	// Be able to send chat messages back
	let chatInput = document.getElementById("chatInput");
	chatInput.addEventListener("keypress", function(event) {
		let message = this.value;
		if (event.keyCode === 13 && this.checkValidity() && message != "") {
			sendMessage(message);

			// Clean input
			this.value = "";
		}
	}, false);

	// Make send button functional
	let chatButtonSend = document.getElementById("buttonSend");
	chatButtonSend.addEventListener("click", function() {
		if (chatInput.checkValidity() && chatInput.value != "") {
			sendMessage(chatInput.value);

			// Clean input
			chatInput.value = "";
		}
	}, false);

	// Make !marble button functional
	let chatButtonMarble = document.getElementById("buttonMarble");
	chatButtonMarble.addEventListener("click", function() {
		sendMessage("!marble");
	}, false);

	// Make log out button functional
	for (let chatButtonLogOut of document.getElementsByClassName("buttonLogOut")) {
		chatButtonLogOut.addEventListener("click", function() {
			if (confirm("Do you really wish to log out?")) {
				Cookies.remove("user_data",
					{
						path: "/",
						domain: window.location.hostname
					}
				);

				// Send to parent if applicable
				if (inIframe()) {
					window.top.postMessage(userState.AUTH_CHANGED, `${window.location.origin}/client`);
				}

				window.location.reload(true);
			}
		}, false);
	}
});

let authWindow;
function authenticationWindow() {
	let authorizationUrl = "https://discordapp.com/api/oauth2/authorize?response_type=code";
	authorizationUrl += `&client_id=${this.dataset.client_id}`;
	authorizationUrl += `&scope=${this.dataset.scope}`;
	authorizationUrl += `&redirect_uri=${this.dataset.redirect_uri}`;
	if (this.dataset.state)
		authorizationUrl += `&state=${this.dataset.state}`;

	authWindow = window.open(authorizationUrl, "_blank", "location=yes,height=800,width=720,scrollbars=yes,status=yes");
}

window.addEventListener("message", receiveMessage, false);
function receiveMessage(event) {
	if (event.data && event.data.success && event.origin === window.location.origin) {
		cookieData = Cookies.getJSON("user_data");
		authWindow.close();
		checkAuthentication();

		// Send to parent if applicable
		if (inIframe()) {
			window.top.postMessage(userState.AUTH_CHANGED, `${window.location.origin}/client`);
		}
	}
}

function onAuthorization(data) {
	document.getElementById("userAvatar").src = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.jpg`;
	document.getElementById("userName").innerText = `${data.username}#${data.discriminator}`;
	document.getElementById("chatInputContainer").className = "authorized";
}

function onBanned() {
	document.getElementById("chatInputContainer").className = "banned";
}

function checkAuthentication() {
	if (
		// If there is former data, check if it is not outdated.
		cookieData

		// See if current date is later than origin date + expiration period
		&& Date.now() < cookieData.access_granted + cookieData.expires_in * 1000
	) {
		// Request a fresh token
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (this.readyState === 4 && this.status === 200) {
				let response = JSON.parse(xhr.responseText);

				if (response.authorized && response.refreshed && response.tokenBody) {
					response.tokenBody.id = cookieData.id;
					response.tokenBody.username = cookieData.username;
					response.tokenBody.discriminator = cookieData.discriminator;
					response.tokenBody.avatar = cookieData.avatar;
					let days = (response.tokenBody.expires_in / 62400) - 0.1; // seconds to days minus some slack
					Cookies.set("user_data", response.tokenBody, {
						expires: days,
						path: "/",
						domain: window.location.hostname,
						secure: config.ssl
					});
					cookieData = response.tokenBody;
				}

				if (response.authorized) {
					onAuthorization(cookieData);
				} else if (response.banned) {
					onBanned();
				}
			}
		};
		xhr.open("POST", "/chat", true);
		xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
		xhr.send(
			JSON.stringify({
				"type": "refresh_token",
				"id": cookieData.id,
				"access_token": cookieData.access_token
			})
		);
	}
}
