/* Origin window variant */
let socket, cookieData;

function init(){
	document.getElementById("discordLink").addEventListener("click",authenticationWindow,false);
	
	/* Check for former authentication */
	cookieData = Cookies.getJSON('user_data');
	if (cookieData) isAuthorized(cookieData);
	
	/* Add welcome message */
	let chatMessages = document.getElementById("chatMessages");
	let chatMessageTemplate = document.getElementById("messageTemplate");
	
	let clone = chatMessageTemplate.cloneNode(true);
	clone.removeAttribute("id");
	
	let now = new Date();
	let timestamp = now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}).replace(/ /g,'').toLowerCase();
	clone.getElementsByClassName("timestamp")[0].innerText = timestamp;
	clone.getElementsByClassName("content")[0].removeChild(clone.getElementsByClassName("username")[0]);
	clone.getElementsByClassName("content")[0].innerText = "Successfully connected to chat. Say !marble to join the race!";
	clone.getElementsByClassName("content")[0].style.marginLeft = "0px";
	clone.getElementsByClassName("content")[0].style.color = "#999";
	clone.getElementsByClassName("content")[0].style.fontStyle = "italic";
	
	chatMessages.insertAdjacentElement("beforeend",clone);
	
	/* Listen for chat messages */
	socket.on("chat message", function(obj){
		let clone = chatMessageTemplate.cloneNode(true);
		clone.removeAttribute("id");
		
		let now = new Date();
		let timestamp = now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}).replace(/ /g,'').toLowerCase();
		clone.getElementsByClassName("timestamp")[0].innerText = timestamp;
		clone.getElementsByClassName("name")[0].innerText = obj.username;
		clone.getElementsByClassName("name")[0].title = obj.username+"#"+obj.discriminator;
		clone.getElementsByClassName("text")[0].innerText = obj.content;
		
		chatMessages.insertAdjacentElement("beforeend",clone);
		chatMessages.scrollTop = chatMessages.scrollHeight;
	});
	
	/* Be able to send chat messages back */
	let chatInput = document.getElementById("chatInput");
	chatInput.addEventListener("keypress",function(event){
		let message = this.value;
		if (event.keyCode === 13 && this.checkValidity() && this.value != "") {
			socket.emit("chat incoming",{
				access_token: cookieData.access_token,
				id: cookieData.id,
				avatar: cookieData.avatar,
				message: message
			});
			
			// Clean input
			this.value = ""; 
		}
		
	},false);
}

let authWindow;
function authenticationWindow(){
	
	let authorizationUrl = "https://discordapp.com/api/oauth2/authorize?response_type=code";
	authorizationUrl += "&client_id="+this.dataset.client_id;
	authorizationUrl += "&scope="+this.dataset.scope;
	authorizationUrl += "&redirect_uri="+this.dataset.redirect_uri;
	if (this.dataset.state)
		authorizationUrl += "&state="+this.dataset.state;
	
	authWindow = window.open(authorizationUrl, '_blank', 'location=yes,height=800,width=720,scrollbars=yes,status=yes');
	
}

window.addEventListener("message", receiveMessage, false);
function receiveMessage(event){	
	if (event.data && event.data.success && event.origin === window.location.origin){
		isAuthorized(event.data.response);
		cookieData = Cookies.getJSON('user_data');
		authWindow.close();
	}
}

function isAuthorized(data){
	document.getElementById("userAvatar").src = 
		"https://cdn.discordapp.com/avatars/"+data.id+"/"+data.avatar+".jpg";
	document.getElementById("userName").innerText = 
		data.username+"#"+data.discriminator;
	document.getElementById("chatInputContainer").className = "authorized";
}

/* Popout variant */
if (user_data) {
	
	let days = (user_data.expires_in / 62400) - 0.1; // seconds to days minus some slack
	Cookies.set('user_data', user_data, { expires: days });
	
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