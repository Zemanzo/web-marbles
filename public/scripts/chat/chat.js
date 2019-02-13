/* Origin window variant */
let socket, cookieData;

function init() {
	/* Simple function that returns current date as Date object or integer (ms since epoch) */
	let now = function(ms) {
		let date = new Date();
		if (ms)
			return date.getTime();
		else
			return date;
	};

	/* Add discord link open as new window */
	document.getElementById("discordLink").addEventListener("click",authenticationWindow,false);

	/* Get some references to DOM */
	let chatMessages = document.getElementById("chatMessages");
	let chatMessageTemplate = document.getElementById("messageTemplate");

	/* Check for former authentication */
	cookieData = Cookies.getJSON("user_data");

	// If there is former data, check if it is not outdated.
	if (cookieData) {
		// See if current date is later than origin date + expiration period
		if ( now(true) < cookieData.access_granted + cookieData.expires_in * 1000 ) {

			// Request a fresh token
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
				if (this.readyState == 4 && this.status == 200) {

					let response = JSON.parse(xhr.responseText);
					response.id = cookieData.id;
					response.username = cookieData.username;
					response.discriminator = cookieData.discriminator;
					response.avatar = cookieData.avatar;
					let days = (response.expires_in / 62400) - 0.1; // seconds to days minus some slack
					Cookies.set("user_data", response, { expires: days });
					cookieData = response;

					/* Add login message */
					let clone = chatMessageTemplate.cloneNode(true);
					clone.removeAttribute("id");

					let timestamp = now().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}).replace(/ /g,"").toLowerCase();
					clone.getElementsByClassName("timestamp")[0].innerText = timestamp;
					clone.getElementsByClassName("content")[0].removeChild(clone.getElementsByClassName("username")[0]);
					clone.getElementsByClassName("content")[0].innerText = "Logged in as "+cookieData.username;
					clone.getElementsByClassName("content")[0].style.marginLeft = "0px";
					clone.getElementsByClassName("content")[0].style.color = "#999";
					clone.getElementsByClassName("content")[0].style.fontStyle = "italic";

					chatMessages.insertAdjacentElement("beforeend",clone);

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

			isAuthorized(cookieData);
		}
	}


	/* Add welcome message */
	let clone = chatMessageTemplate.cloneNode(true);
	clone.removeAttribute("id");

	let timestamp = now().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}).replace(/ /g,"").toLowerCase();
	clone.getElementsByClassName("timestamp")[0].innerText = timestamp;
	clone.getElementsByClassName("content")[0].removeChild(clone.getElementsByClassName("username")[0]);
	clone.getElementsByClassName("content")[0].innerText = "Successfully connected to chat. Say !marble to join the race!";
	clone.getElementsByClassName("content")[0].style.marginLeft = "0px";
	clone.getElementsByClassName("content")[0].style.color = "#999";
	clone.getElementsByClassName("content")[0].style.fontStyle = "italic";

	chatMessages.insertAdjacentElement("beforeend",clone);

	/* Listen for chat messages */
	socket.on("chat message", function(obj) {
		let clone = chatMessageTemplate.cloneNode(true);
		clone.removeAttribute("id");

		let timestamp = now().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}).replace(/ /g,"").toLowerCase();
		clone.getElementsByClassName("timestamp")[0].innerText = timestamp;
		clone.getElementsByClassName("name")[0].innerText = obj.username;
		clone.getElementsByClassName("name")[0].title = obj.username+"#"+obj.discriminator;
		clone.getElementsByClassName("text")[0].innerText = obj.content;

		chatMessages.insertAdjacentElement("beforeend",clone);
		chatMessages.scrollTop = chatMessages.scrollHeight;
	});

	let lastMessageSent = now(true);
	let sendMessage = function(message) {
		// Check whether messages are not being spammed.
		let messageTimestamp = now(true);
		if (messageTimestamp > lastMessageSent + 500) {
			socket.emit("chat incoming", {
				access_token: cookieData.access_token,
				id: cookieData.id,
				avatar: cookieData.avatar,
				message: message
			});
			lastMessageSent = messageTimestamp;
			return true;
		} else {
			return false;
		}
	};

	// Be able to send chat messages back
	let chatInput = document.getElementById("chatInput");
	chatInput.addEventListener("keypress",function(event) {
		let message = this.value;
		if (event.keyCode === 13 && this.checkValidity() && message != "") {
			sendMessage(message);

			// Clean input
			this.value = "";
		}

	},false);

	// Make SEND button functional
	let chatButtonSend = document.getElementById("buttonSend");
	chatButtonSend.addEventListener("click",function() {
		if (chatInput.checkValidity() && chatInput.value != "") {
			sendMessage(chatInput.value);

			// Clean input
			chatInput.value = "";
		}
	},false);

	// Make !MARBLE button functional
	let chatButtonMarble = document.getElementById("buttonMarble");
	chatButtonMarble.addEventListener("click",function() {
		sendMessage("!marble");
	},false);

}

let authWindow;
function authenticationWindow() {
	let authorizationUrl = "https://discordapp.com/api/oauth2/authorize?response_type=code";
	authorizationUrl += "&client_id="+this.dataset.client_id;
	authorizationUrl += "&scope="+this.dataset.scope;
	authorizationUrl += "&redirect_uri="+this.dataset.redirect_uri;
	if (this.dataset.state)
		authorizationUrl += "&state="+this.dataset.state;

	authWindow = window.open(authorizationUrl, "_blank", "location=yes,height=800,width=720,scrollbars=yes,status=yes");
}

window.addEventListener("message", receiveMessage, false);
function receiveMessage(event) {
	if (event.data && event.data.success && event.origin === window.location.origin) {
		isAuthorized(event.data.response);
		cookieData = Cookies.getJSON("user_data");
		authWindow.close();
	}
}

function isAuthorized(data) {
	document.getElementById("userAvatar").src = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.jpg`;
	document.getElementById("userName").innerText = `${data.username}#${data.discriminator}`;
	document.getElementById("chatInputContainer").className = "authorized";
}

/* Popout variant */
if (user_data) {

	let days = (user_data.expires_in / 62400) - 0.1; // seconds to days minus some slack
	Cookies.set("user_data", user_data, { expires: days });

	window.opener.postMessage({
		success: true,
		response: user_data
	},window.location.origin);

} else {
	socket = io({
		transports: ["websocket"]
	});
	window.addEventListener("DOMContentLoaded",init,false);
}
