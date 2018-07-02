whenDocReady.add(
	function(){renderInit()},
	"renderInit",
	{
		type:1,
		readyState:"complete"
	}
);
	
window.addEventListener("DOMContentLoaded", function(){
	
	// Fix camera
	document.getElementById("fixCam").addEventListener("click", function(){
		controls.getObject().position.x = -2.3;
		controls.getObject().position.y = 12;
		controls.getObject().position.z = 19.7;

		camera.parent.rotation.x = -.3;
		controls.getObject().rotation.z = 0;
		controls.getObject().rotation.x = 0;
		controls.getObject().rotation.y = 0;
	},false);
	
	let changeWaterLevel = function(e){
		water.position.y = this.value;
	}
	document.getElementById("envWaterHeight").addEventListener("change",changeWaterLevel,false);
	document.getElementById("envWaterHeight").addEventListener("input",changeWaterLevel,false);
	
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