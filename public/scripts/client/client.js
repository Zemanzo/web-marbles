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
	state: {
		timeToEnter: null
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
		game.startTimerInterval(this.state.enterPeriod*1000); // This has to be the server value... :thinking;
	},
	startTimerInterval: function(ms){
		let s = ms/1000;
		let timerElement = document.getElementById("timer");
		timerElement.innerHTML = Math.ceil(s);
		setTimeout(function(){
			let timeLeft = Math.ceil(s);
			console.log(s,timeLeft);
			let timerInterval = setInterval(function(){
				if (timeLeft < 0){
					clearInterval(timerInterval);
				} else {
					timerElement.innerHTML = timeLeft;
				}
				timeLeft--;
			},1000);
			timerElement.innerHTML = timeLeft;
			timeLeft--;
		}, ms - Math.floor(s)*1000); // milliseconds only, i.e. 23941 becomes 941
	}
}
var marbleData;

whenDocReady.add(function(entries){
	document.getElementById("entries").innerHTML = entries;
},"initialMarbles");

whenDocReady.add(
	function(){renderInit()},
	"renderInit",
	{
		type:1,
		readyState:"complete"
	}
);

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
		whenDocReady.fire("renderInit");
	});
});

whenDocReady.add(function(response){
	game.state = JSON.parse(response);
	console.log(game.state);
	if (game.state.gameState === "started"){
		document.getElementById("timer").style.display = "none";
		document.getElementById("state").innerHTML = "Race started!";
	} else {
		game.startTimerInterval(game.state.timeToEnter);
		document.getElementById("timer").innerHTML = game.state.timeToEnter.toString().substr(0,2);
	}
},"getGamestate");

getXMLDoc("/client?gamestate=true",(response)=>{
	whenDocReady.args("getGamestate",response);
});

window.addEventListener("DOMContentLoaded", function(){
	
	// Fix camera
	/* document.getElementById("fixCam").addEventListener("click", function(){
		controls.getObject().position.x = 0;
		controls.getObject().position.y = 0;
		controls.getObject().position.z = 0;
	},false); */
	
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