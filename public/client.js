var socket = io();
var positions = [];

socket.on('physics step', function(obj){
	positions = new Float32Array(obj);
});

window.addEventListener("DOMContentLoaded",function(){
	document.getElementById("marble").addEventListener("click",function(){
		getXMLDoc("/client?marble=true");
	},false);
},false);

function getXMLDoc(doc){
	var xmlhttp;
	xmlhttp=new XMLHttpRequest();
	xmlhttp.onreadystatechange=function() {
		if (xmlhttp.readyState==4 && xmlhttp.status!=200) {
			console.log("rip",xmlhttp.response);
  		}
	}
	xmlhttp.open("GET",doc,true);
	xmlhttp.send();
}