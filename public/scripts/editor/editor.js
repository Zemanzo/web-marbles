whenDocReady.add(
	function(){renderInit()},
	"renderInit",
	{
		type:1,
		readyState:"complete"
	}
);

let editor = {
	log: undefined,
	groups: {
		models: undefined,
		prefabs: undefined,
		world: undefined
	},
	models: {},
	prefabs: {},
	selectedModel: null,
	inspector: {
		selected: null,
		select: function(){
			let insp = editor.inspector;
			if (insp.selected === null){ // Nothing selected so inspector is in disabled state
				for (let el of editor.inspector.inputs){
					el.disabled = false;
				}
			} else {
				insp.selected.className = insp.selected.className.split(" ")[0]; // ew
			}
			insp.element.className = this.className+"Selection";
			document.getElementById("inspectorName").value = this.getElementsByClassName("name")[0].innerHTML;
			insp.selected = this;
			this.className += " selected";
		},
		deselect: function(){
			editor.inspector.selected = null;
			editor.inspector.element.className = "noSelection";
			for (let el of editor.inspector.inputs){
				el.disabled = true;
			}
		}
	},
	objectCount: 0
};
	
window.addEventListener("DOMContentLoaded", function(){
	editor.log = document.getElementById("log");
	
	// Inspector
	editor.inspector.element = document.getElementById("inspector");
	editor.inspector.inputs = [
		...editor.inspector.element.getElementsByTagName("input"),
		...editor.inspector.element.getElementsByTagName("select")
	];
	editor.inspector.deselect();
	let inspectorChangeName = function(){
		if (editor.inspector.selected){
			editor.inspector.selected.getElementsByClassName("name")[0].innerHTML = this.value;
		}
	}
	document.getElementById("inspectorName").addEventListener("change",inspectorChangeName,false);
	document.getElementById("inspectorName").addEventListener("input",inspectorChangeName,false);
	
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
			for (let key in editor.groups){
				editor.groups[key].visible = false;
			}
			if (this.dataset.sceneGroup) editor.groups[this.dataset.sceneGroup].visible = true;
			this.className = "selected";
		},false);
	}
	
	// Fix camera
	document.getElementById("fixCam").addEventListener("click", function(event){
		controls.getObject().position.x = -2.3;
		controls.getObject().position.y = 12;
		controls.getObject().position.z = 19.7;
		controls.getObject().rotation.z = 0;
		controls.getObject().rotation.x = 0;
		controls.getObject().rotation.y = 0;
		camera.parent.rotation.x = -.3;
		velocity.z = 0;
		velocity.x = 0;
		velocity.y = 0;
		moveForward = false;
		moveBackward = false;
		moveLeft = false;
		moveRight = false;
	},false);
	
	// Change water level
	let changeWaterLevel = function(e){
		water.position.y = this.value;
	}
	document.getElementById("envWaterHeight").addEventListener("change",changeWaterLevel,false);
	document.getElementById("envWaterHeight").addEventListener("input",changeWaterLevel,false);
	
	// Import map
    document.getElementById('terPhysics').addEventListener('change', function(e) {
		let file = this.files[0];
		let reader = new FileReader();
		let loader = new THREE.OBJLoader();
		reader.onload = function(e) {
			let result = reader.result;
			// parse using your corresponding loader
			let object3d = loader.parse( result );
			let wireframeMaterial = new THREE.MeshStandardMaterial( {
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
	
	// Add models
	let GLTFLoader = new THREE.GLTFLoader();
    document.getElementById("addModelFile").addEventListener("change", function(e) {
		Array.from(this.files).forEach(function(file){
			file.reader = new FileReader();
			file.reader.onload = function(e) {
				let result = file.reader.result;
				// parse using your corresponding loader
				GLTFLoader.parse(
					result,	null,
					function(model){
						model.userData.name = file.name;
						if (!Object.keys(editor.models).some((key)=>{ // Check if model is already loaded
							return key === file.name;
						})){
							// Add to model list
							let clone = document.getElementById("modelTemplate").cloneNode(true); // deep clone
							clone.id = file.name;
							clone.getElementsByClassName("name")[0].innerHTML = file.name;
							clone.getElementsByClassName("name")[0].addEventListener("mousedown",function(){
								if (editor.selectedModel){
									editor.models[editor.selectedModel].scene.visible = false;
									document.getElementById(editor.selectedModel).className = "model";
								}
								editor.selectedModel = this.parentNode.id;
								editor.models[editor.selectedModel].scene.visible = true;
								document.getElementById(editor.selectedModel).className = "model selected";
							},false);
							
							// Delete model
							clone.getElementsByClassName("delete")[0].addEventListener("click",function(){
								let parent = this.parentNode;
								let id = parent.id;
								if ( confirm("Are you sure you want to delete this model? ("+id+")") ) {
									if (editor.selectedModel === id) editor.selectedModel = null;
									editor.groups.models.remove(editor.models[id].scene);
									delete editor.models[id];
									let select = document.getElementById("inspectorModel");
									let index = Array.from(select.children).findIndex((el)=>{
										return el.value === id;
									},false);
									select.remove(index);
									parent.parentNode.removeChild(parent); // oofies
									editorLog("Removed model ("+id+")","warn");
								}					
							},false);
							
							// Add to select drop-down
							let select = document.getElementById("inspectorModel");
							let option = document.createElement("option");
							option.text = file.name;
							option.value = file.name;
							select.add(option);
							
							// Add to DOM
							let modelList = document.getElementById("models");
							clone = modelList.appendChild(clone);
							
							// Add to scene
							editor.groups.models.add(model.scene);
							model.scene.visible = false;
							
							editor.models[file.name] = model;
							editorLog("Loaded model: "+file.name,"info");
						} else {
							editorLog("Model already loaded. ("+file.name+")","error");
						}						
					}, function(error){
						console.log(error);
					}
				);
			}
			file.reader.readAsText(file, "utf-8");
		});
    },false);
	
	// New prefab:
	// Collapse prefab
	let collapse = function(){
		let parent = this.closest(".prefab");
		if ( parent.className.indexOf("collapsed") === -1 ){
			this.children[0].className = "icofont-caret-right"
			parent.className = "prefab collapsed";
		} else {
			this.children[0].className = "icofont-caret-right rotated"
			parent.className = "prefab";
		}
	}
	
	// Delete prefab
	let deletePrefab = function(){
		let parent = this.closest(".prefab");
		let name = parent.getElementsByClassName("prefabName")[0].value;
		if ( confirm("Are you sure you want to delete this prefab? ("+name+") ("+parent.dataset.uuid+")") ) {
			parent.parentNode.removeChild(parent);
		}
	}
	
	// Add template element to prefab
	let addTemplateElement = function(type,parent){
		let clone = document.getElementById("prefab"+type+"Template").cloneNode(true);
		let uuid = generateTinyUUID();
		clone.removeAttribute("id");
		clone.dataset.uuid = uuid;
		clone.getElementsByClassName("name")[0].innerHTML = type+editor.objectCount++;
		clone.getElementsByClassName("uuid")[0].innerHTML = uuid;
		clone.addEventListener("click",editor.inspector.select,false);
		parent.getElementsByClassName("objectList")[0].appendChild(clone);
	}
	
	// Add object to prefab
	let addObject = function(){
		let parent = this.closest(".prefab");
		addTemplateElement.call(this,"Object",parent);
		editor.prefabs[parent.dataset.uuid].group.add(editor.defaultModel.clone());
	}
	
	// Add collider to prefab
	let addCollider = function(){
		let parent = this.closest(".prefab");
		addTemplateElement.call(this,"Collider",parent);
	}
	
	document.getElementById("addPrefab").addEventListener("click",function(){
		let clone = document.getElementById("prefabTemplate").cloneNode(true); // deep clone
		let uuid = generateTinyUUID();
		clone.removeAttribute("id");
		clone.dataset.uuid = uuid;
		clone.getElementsByClassName("collapse")[0].addEventListener("click",collapse,false);
		clone.getElementsByClassName("delete")[0].addEventListener("click",deletePrefab,false);
		clone.getElementsByClassName("objectList")[0].innerHTML = ""; // Remove templates from clone
		clone.getElementsByClassName("addObject")[0].addEventListener("click",addObject,false);
		clone.getElementsByClassName("addCollider")[0].addEventListener("click",addCollider,false);
		clone.getElementsByClassName("detailsID")[0].innerHTML = uuid;

		
		// Add to editor object
		editor.prefabs[uuid] = {
			uuid: uuid,
			group: new THREE.Group()
		};
		
		// Add threejs group to scene
		editor.groups.prefabs.add(editor.prefabs[uuid].group);
		
		// Add to DOM
		let prefabList = document.getElementById("prefabsList");
		editor.prefabs[uuid].element = clone = prefabList.insertBefore(clone,document.getElementById("addPrefab"));
		
		// Focus to name input so user can start typing right away
		clone.getElementsByClassName("prefabName")[0].focus();
	},false);
	
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
function editorLog(message,type){
	let date = new Date();
	let hrs = date.getHours();
	let min = date.getMinutes();
	let sec = date.getSeconds();
	if (hrs < 10){
		hrs = "0"+hrs;
	}
	if (min < 10){
		min = "0"+min;
	}
	if (sec < 10){
		sec = "0"+sec;
	}
	editor.log.insertAdjacentHTML(
		"beforeend",
		"<div class='"+type+"'>["+hrs+":"+min+":"+sec+"] "+message+"</div>"
	);
}

let TUUIDs = [];
let charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function generateTinyUUID(){
	let l = 4;
	let possibilities = Math.pow(charset.length,l);
	let timeString = (new Date()).getTime().toString();
	let decimal = parseInt(timeString.substr(timeString.length - possibilities.toString().length)) % possibilities;
	while(TUUIDs.indexOf(decimal) !== -1){
		decimal++;
	}
	TUUIDs.push(decimal);
	let tUUID = "";
	for (let i = 0; i < l; i++){
		let remain = decimal % charset.length;
		decimal = (decimal - remain) / charset.length;
		tUUID += charset.substr(remain,1);
	}
	return tUUID.split("").reverse().join("");
}

window.onbeforeunload = function(e) {
	var dialogText = "Leave? You might lose unsaved changes!";
	e.returnValue = dialogText;
	return dialogText;
};