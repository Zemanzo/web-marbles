/* Origin window variant */
function init(){
	document.getElementById("discordLink").addEventListener("click",authenticationWindow,false);
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
		let response = event.data.response;
		document.getElementById("userAvatar").src = 
			"https://cdn.discordapp.com/avatars/"+response.id+"/"+response.avatar+".jpg";
		document.getElementById("userName").innerText = 
			response.username+"#"+response.discriminator;
		document.getElementById("chatInputContainer").className = "authorized";
		authWindow.close();
	}
}

/* Popout variant */
let locationParameters = window.location.search.substr(1).split("=");

if (locationParameters[0] === "code" && locationParameters[1]) {
	getXHR(function(response){
		let data;
		if (response){
			let parsed = JSON.parse(response);
			console.log(parsed);
			data = {
				success: true,
				response: parsed
			};
		} else {
			data = {
				success: false
			};
		}
		window.opener.postMessage(data,window.location.origin);
	});
} else {
	window.addEventListener("DOMContentLoaded",init,false);
}

function getXHR(callback){
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "https://discordapp.com/api/users/@me", true);

	xhr.setRequestHeader("Authorization", "Bearer "+access_token);

	xhr.onreadystatechange = function() {
		if(this.readyState === XMLHttpRequest.DONE && this.status === 200) {
			callback(xhr.responseText);
		} else if(this.readyState === XMLHttpRequest.DONE && this.status !== 200) {
			callback(false); /* TODO: make proper error thing */
		}
	}
	xhr.send(); 
}