var socket = io({
	transports: ['websocket']
});
var net = {
	tickrate: 20, // Cannot be 0
	ticksToLerp: 2, // Cannot be 0
	
	// Initialize, do not configure these values.
	marblePositions: [],
	lastUpdate: 0,
	ready: 0,
	requestsSkipped: 0 // Helps detect network issues
};

/* socket.on('physics step', function(obj){
	
}); */

net.getServerDataInterval = setInterval(function(){
	if (net.ready < net.tickrate){
		net.ready++;
		socket.emit('request physics', Date.now(), (data) => {
			net.marblePositions = new Float32Array(data);
			net.lastUpdate = 0;
			net.ready--;
		});
	} else {
		net.requestsSkipped++;
	}
}, 1000 / net.tickrate);

window.addEventListener("DOMContentLoaded", function(){
	document.getElementById("marble").addEventListener("click", function(){
		getXMLDoc("/client?marble=true");
	},false);
},false);

function getXMLDoc(doc){
	var xmlhttp;
	xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4 && xmlhttp.status != 200) {
			console.log("rip", xmlhttp.response);
  		}
	}
	xmlhttp.open("GET", doc, true);
	xmlhttp.send();
}

