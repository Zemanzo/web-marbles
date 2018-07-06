whenDocReady.add(
	function(){renderInit()},
	"renderInit",
	{
		type:1,
		readyState:"complete"
	}
);
	
window.addEventListener("DOMContentLoaded", function(){
	
	// Menu
	let childValue = 0;
	for (let child of document.getElementById("editorMode").children){
		child.dataset.nthChild = childValue++;
		child.addEventListener("click",function(){
			document.getElementById("properties").firstElementChild.style.marginLeft =
				"-"+parseInt(this.dataset.nthChild) * 100 +"%";
			for (let c of this.parentNode.children){
				c.className = "";
			}
			this.className = "selected";
		},false);
	}
	
	// Fix camera
	document.getElementById("fixCam").addEventListener("click", function(event){
		controls.getObject().position.x = -2.3;
		controls.getObject().position.y = 12;
		controls.getObject().position.z = 19.7;

		camera.parent.rotation.x = -.3;
		velocity.z = 0;
		velocity.x = 0;
		velocity.y = 0;
		moveForward = false;
		moveBackward = false;
		moveLeft = false;
		moveRight = false;
		controls.getObject().rotation.z = 0;
		controls.getObject().rotation.x = 0;
		controls.getObject().rotation.y = 0;
	},false);
	
	// Change water level
	let changeWaterLevel = function(e){
		water.position.y = this.value;
	}
	document.getElementById("envWaterHeight").addEventListener("change",changeWaterLevel,false);
	document.getElementById("envWaterHeight").addEventListener("input",changeWaterLevel,false);
	
	// Import map
    document.getElementById('terPhysics').addEventListener('change', function(e) {
		var file = this.files[0];
		var reader = new FileReader();
		var loader = new THREE.OBJLoader();
		reader.onload = function(e) {
			var result = reader.result;
			// parse using your corresponding loader
			var object3d = loader.parse( result );
			var wireframeMaterial = new THREE.MeshStandardMaterial( {
				color: 0x000000,
				emissive: 0xff00ff,
				roughness: 1,
				wireframe:true
			} );
			object3d.children[0].geometry.computeBoundingBox();
			object3d.children[0].geometry.center();
			object3d.children[0].material = wireframeMaterial;
			object3d.children[0].setRotationFromEuler( new THREE.Euler( -Math.PI*.5, 0, Math.PI*.5, 'XYZ' ) );
			scene.add( object3d );
		}
		reader.readAsText(file, "utf-8");

    },false);
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