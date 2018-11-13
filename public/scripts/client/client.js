let socket = io({
	transports: ["websocket"]
});

let net = {
	tickrate: 10, // Cannot be 0
	ticksToLerp: 2, // Cannot be 0

	// Initialize, do not configure these values.
	marblePositions: new Float32Array(0),
	marbleRotations: new Float32Array(0),
	lastUpdate: 0,
	ready: 0,
	requestsSkipped: 0 // Helps detect network issues
};

let game = {
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
		game.startTimerInterval(this.state.enterPeriod * 1000);
	},
	startTimerInterval: function(ms){
		let s = ms/1000;
		let timerElement = document.getElementById("timer");
		timerElement.innerHTML = Math.ceil(s);
		setTimeout(function(){
			let timeLeft = Math.floor(s);
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
		console.log(ms - Math.floor(s)*1000);
	}
}
let marbleData;

whenDocReady.add(function(entries){
	document.getElementById("entries").innerHTML = entries;
},"initialMarbles");

let domReady = new Promise((resolve, reject) => {
	if (document.readyState === "interactive" || document.readyState === "complete"){
		resolve(true);
	} else {
		window.addEventListener("DOMContentLoaded", () => resolve(true), false);
	}
});

let netReady = new Promise((resolve, reject) => {
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
			resolve(true);
		});
	});
});

Promise.all([domReady, netReady]).then(function(){
	renderInit();
});

whenDocReady.add(function(response,requestStart,requestComplete){
	game.state = JSON.parse(response);
	console.log(
		game.state,
		(requestComplete - requestStart) + (requestComplete - whenDocReady.timestamp.interactive)
	);
	if (game.state.gameState === "started"){
		document.getElementById("timer").style.display = "none";
		document.getElementById("state").innerHTML = "Race started!";
	} else {
		// Remove document load time & request time
		game.state.timeToEnter -=
			(requestComplete - requestStart) +
			(requestComplete - whenDocReady.timestamp.interactive);

		// Start timer interval
		game.startTimerInterval(game.state.timeToEnter);

		// Show the timer
		document.getElementById("timer").innerHTML = game.state.timeToEnter.toString().substr(0,2);
	}
},"getGamestate");

let requestStart = (new Date()).getTime();
getXMLDoc("/client?gamestate=true",(response)=>{
	whenDocReady.args("getGamestate",response,requestStart,(new Date()).getTime());
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
	let xmlhttp;
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
