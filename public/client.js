// Cool fucntion yo
var whenDocReady = {
	lookup: {},
	add: function(callback,id,...args){
		this.lookup[id] = {
			callback: callback,
			id: id,
			fired: false,
			args: args
		}
	},
	args: function(id,...args){
		this.lookup[id].args = args;
		this.fire(id,true);
	},
	fire: function(id,withArguments){
		if (
			this.lookup[id] &&	// This id exists AND
			!this.lookup[id].fired && // It hasn't been fired yet AND
			this.docReady() && // The document is ready AND
			( !withArguments || (this.lookup[id].args && this.lookup[id].args.length > 0) ) // In case it's being called with arguments, there are arguments
		){
			this.lookup[id].fired = true;
			if (withArguments){
				return this.lookup[id].callback(...this.lookup[id].args);
			} else {
				return this.lookup[id].callback;
			}
		} else {
			if (!this.lookup[id])
				console.warn("No such ID:",id);
			return (withArguments ? null : ()=>{return null});
		}
	},
	runAll: function(){
		for (id in this.lookup){
			if (!this.lookup[id].fired){
				this.lookup[id].fired = true;
				this.lookup[id].callback();
			}
		}
	},
	docReady: function(){
		return (document.readyState === "interactive" || document.readyState === "complete");
	}
}

var socket = io({
	transports: ["websocket"]
});
var net = {
	tickrate: 10, // Cannot be 0
	ticksToLerp: 2, // Cannot be 0
	
	// Initialize, do not configure these values.
	marblePositions: new Float32Array(0),
	marbleRotations: new Float32Array(0),
	lastUpdate: 0,
	ready: 0,
	requestsSkipped: 0 // Helps detect network issues
};
var game = {
	audio: {
		start: new Audio("resources/audio/start.mp3"),
		end: new Audio("resources/audio/end.mp3")
	},
	start: function(){
		game.audio.start.play();
		document.getElementById("state").innerHTML = "Race started!";
		document.getElementById("timer").style.display = "none";
	},
	end: function(){
		game.audio.end.play();
		for (let mesh of marbleMeshes){
			for (i = mesh.children.length; i >= 0; i--) {
				scene.remove(mesh.children[i]);
			}
			scene.remove(mesh);
			document.getElementById("marbleList").innerHTML = document.getElementById("marbleListTemplate").outerHTML;
		}
		document.getElementById("entries").innerHTML = "0";
		marbleMeshes = [];
		document.getElementById("state").innerHTML = "Enter marbles now!";
		document.getElementById("timer").style.display = "block";
		game.startTimerInterval(10000); // This has to be the server value... :thinking;
	},
	startTimerInterval: function(ms){
		let s = ms/1000;
		let timerElement = document.getElementById("timer");
		timerElement.innerHTML = Math.ceil(s);
		setTimeout(function(){
			let timeLeft = Math.ceil(s);
			console.log(s,timeLeft);
			let timerInterval = setInterval(function(){
				timeLeft--;
				if (timeLeft === 0){
					clearInterval(timerInterval);
				} else {
					timerElement.innerHTML = timeLeft;
				}
			},1000);
			timerElement.innerHTML = timeLeft;
			timeLeft--;
		}, ms - Math.floor(s)*1000); // milliseconds only, i.e. 23941 becomes 941
	}
}
var marbleData;
var renderInitFired = false;

whenDocReady.add(function(entries){
	document.getElementById("entries").innerHTML = entries;
},"initialMarbles");

// Once connected, client receives initial data
socket.on("initial data", function(obj){
	
	marbleData = obj;
	whenDocReady.args("initialMarbles",marbleData.length);
	
	/* Socket RPCs */
	
	// New marble
	socket.on("new marble", function(obj){
		console.log(obj);
		spawnMarble(obj);
	});
	
	// Start game
	socket.on("start", function(obj){
		game.start();
	});
	
	// End game, and start next round
	socket.on("clear", function(obj){
		game.end();
	});
	
	/* Physics syncing */

	// Once connection is acknowledged, start requesting physics updates
	net.getServerDataInterval = setInterval(function(){
		if (net.ready < net.tickrate){
			net.ready++;
			socket.emit("request physics", Date.now(), (data) => {
				net.marblePositions = new Float32Array(data.pos);
				net.marbleRotations = new Float64Array(data.rot);
				/* console.log(data.startGate); */
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

// Get gamestate
var gamestate = {
	timeToEnter: null
};

whenDocReady.add(function(response){
	gamestate = JSON.parse(response);
	console.log(gamestate);
	if (gamestate.gameState === "started"){
		document.getElementById("timer").style.display = "none";
		document.getElementById("state").innerHTML = "Race started!";
	} else {
		game.startTimerInterval(gamestate.timeToEnter);
		document.getElementById("timer").innerHTML = gamestate.timeToEnter.toString().substr(0,2);
	}
},"getGamestate");

getXMLDoc("/client?gamestate=true",(response)=>{
	whenDocReady.args("getGamestate",response);
});
	

let jwtValid = null;
let jwtDOMChanged = false;
whenDocReady.add(function(valid,result){
	console.log("it works!",valid,result);
	jwtValid = valid;
	if (valid){
		document.getElementById("welcomeMessage").innerHTML = "Welcome back "+result.preferred_username+"!";
		document.getElementById("welcomeMessage").style.display = "block";
	} else {
		document.getElementById("twitchConnect").style.display = "flex";
	}
},"jwtvalid");

if (localStorage.id_token){
	verifyAndParseJWT( localStorage.id_token, false, function(valid,result){
		whenDocReady.args("jwtvalid",valid,result);
	});
} else {
	whenDocReady.args("jwtvalid",false);
}

window.addEventListener("DOMContentLoaded", function(){
	
	// When document is ready
	whenDocReady.fire("jwtvalid",true);
	whenDocReady.fire("getGamestate",true);
	whenDocReady.fire("initialMarbles",true);
	
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
			getXMLDoc(str,(r)=>{console.log(r)});
		} else {
			console.log("No id_token found, login with Twitch first!");
		}
	},false);
	
	// !bot
	document.getElementById("bot").addEventListener("click", function(){
		let str = "/client?bot=true";
		getXMLDoc(str);
	},false);
	
	// !clear
	/* document.getElementById("clear").addEventListener("click", function(){
		getXMLDoc("/client?clear=true");
	},false); */
	
	/* // Start race
	document.getElementById("start").addEventListener("click", function(){
		getXMLDoc("/client?start=true");
	},false); */
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