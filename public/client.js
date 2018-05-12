var socket = io({
	transports: ["websocket"]
});
var net = {
	tickrate: 20, // Cannot be 0
	ticksToLerp: 2, // Cannot be 0
	
	// Initialize, do not configure these values.
	marblePositions: new Float32Array(0),
	marbleRotations: new Float32Array(0),
	lastUpdate: 0,
	ready: 0,
	requestsSkipped: 0 // Helps detect network issues
};
var marbleData;
var renderInitFired = false;

// Once connected, client receives initial data
socket.on("initial data", function(obj){
	
	marbleData = obj;
	
	socket.on("new marble", function(obj){
		console.log(obj);
		spawnMarble(obj);
		
	});
	
	socket.on("clear", function(obj){
		console.log("Clearning mah marbles?",obj)
		for (let mesh of marbleMeshes){
			for (i = mesh.children.length; i >= 0; i--) {
				scene.remove(mesh.children[i]);
			}
			scene.remove(mesh);
		}
		marbleMeshes = [];
	});

	// Once connection is acknowledged, start requesting physics updates
	net.getServerDataInterval = setInterval(function(){
		if (net.ready < net.tickrate){
			net.ready++;
			socket.emit("request physics", Date.now(), (data) => {
				net.marblePositions = new Float32Array(data.pos);
				net.marbleRotations = new Float64Array(data.rot);
				net.lastUpdate = 0;
				net.ready--;
			});
		} else {
			net.requestsSkipped++;
		}
	}, 1000 / net.tickrate);
	
	// Initial request to kick off rendering on the first physics update
	net.ready++;
	socket.emit("request physics", Date.now(), (data) => {
		net.marblePositions = new Float32Array(data.pos);
		net.marbleRotations = new Float64Array(data.rot);
		net.lastUpdate = 0;
		net.ready--;
		if (!renderInitFired && document.readyState === "complete"){
			renderInitFired = true;
			renderInit();
		} else {
			renderInitFired = "tried";
		}
	});
});

let jwtValid = null;
let jwtDOMChanged = false;
if (localStorage.id_token){
	verifyAndParseJWT(localStorage.id_token,false,(valid)=>{
		jwtValid = valid;
		if (docReady()){
			jwtDOMChanged = true;
			if (valid){
				document.getElementById("menuButtons").style.display = "block";
			} else {
				document.getElementById("twitchConnect").style.display = "flex";
			}
		}
	});
}

window.addEventListener("DOMContentLoaded", function(){
	
	if ((jwtValid !== null && !jwtDOMChanged) || !localStorage.id_token){
		if (jwtValid){
			document.getElementById("menuButtons").style.display = "block";
		} else {
			document.getElementById("twitchConnect").style.display = "flex";
		}
	}
	
	if (localStorage.parsedJWT){
		parsedJWT = JSON.parse(localStorage.parsedJWT);
	}
	
	// !marble
	document.getElementById("marble").addEventListener("click", function(){
		if (localStorage.id_token){
			let str = "/client?marble=true";
			str += "&jwt="+localStorage.id_token;
			str += "&color="+document.getElementById("color").value.substr(1);
			str += "&name="+parsedJWT.preferred_username;
			/* str += "&size="+(Math.floor(Math.random()*3)*.1+.1); */
			str += "&size=.2";
			getXMLDoc(str);
		} else {
			console.log("No id_token found, login with Twitch first!");
		}
	},false);
	
	// !clear
	document.getElementById("clear").addEventListener("click", function(){
		getXMLDoc("/client?clear=true");
	},false);
	
	// Start race
	document.getElementById("start").addEventListener("click", function(){
		getXMLDoc("/client?start=true");
	},false);
},false);

window.addEventListener("load", function(){
	if (renderInitFired === "tried"){
		renderInitFired = true;
		renderInit();
	}
},false);

function getXMLDoc(doc,callback){
	var xmlhttp;
	xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState === 4 && xmlhttp.status !== 200) {
			console.log("rip", xmlhttp.response);
  		} else if (callback && xmlhttp.readyState === 4 && xmlhttp.status === 200){
			callback(xmlhttp.response);
		}
	}
	xmlhttp.open("GET", doc, true);
	xmlhttp.send();
}

function docReady(){
	return (document.readyState === "interactive" || document.readyState === "complete");
}