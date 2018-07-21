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
	menu: {},
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
		selectedEntity: null,
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
			let name = document.getElementById("inspectorName").value = this.getElementsByClassName("name")[0].innerHTML;
			let uuid = document.getElementById("inspectorUUID").value = this.dataset.uuid;
			let prefabUuid = this.dataset.prefabUuid;
			insp.selected = this;
			
			let transformElements = editor.inspector.elements.transform;
			let sceneObject = editor.prefabs[prefabUuid].entities[uuid].sceneObject;
			
			transformElements.input.translate.x.value = sceneObject.position.x;
			transformElements.input.translate.y.value = sceneObject.position.y;
			transformElements.input.translate.z.value = sceneObject.position.z;
			
			transformElements.input.scale.x.value = sceneObject.scale.x;
			transformElements.input.scale.y.value = sceneObject.scale.y;
			transformElements.input.scale.z.value = sceneObject.scale.z;
			
			transformElements.input.rotate.x.value = (sceneObject.rotation.x * (180 / Math.PI)).toFixed(1);
			transformElements.input.rotate.y.value = (sceneObject.rotation.y * (180 / Math.PI)).toFixed(1);
			transformElements.input.rotate.z.value = (sceneObject.rotation.z * (180 / Math.PI)).toFixed(1);
			
			// let euler = (new THREE.Euler()).setFromQuaternion(
			// 	editor.prefabs[prefabUuid].entities[uuid].sceneObject.rotation, "XYZ"
			// );
			// transformElements.input.rotate.x.value = euler.x;
			// transformElements.input.rotate.y.value = euler.y;
			// transformElements.input.rotate.z.value = euler.z;
			
			this.className += " selected";
		},
		deselect: function(){
			let selected = editor.inspector.selected;
			if (selected) selected.className = selected.className.split(" ")[0]; // ew
			editor.inspector.selected = null;
			editor.inspector.element.className = "noSelection";
			for (let el of editor.inspector.inputs){
				el.disabled = true;
				if (el.tagName === "INPUT"){
					el.value = el.defaultValue;
				} else {
					el.selectedIndex = "0"; 
				}
			}
		}
	},
	entityCount: 0
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
	
	// Inspector elements
	editor.inspector.elements = {
		name: document.getElementById("inspectorName"),
		model: document.getElementById("inspectorModel"),
		shape: document.getElementById("inspectorShape"),
		transform: {
			input: {
				translate: {},
				rotate: {},
				scale: {}
			},
			label: {
				translate: {},
				rotate: {},
				scale: {}
			}
		}
	};
	
	for (key in editor.inspector.elements.transform.input){
		let elements = document.getElementsByClassName(key)[0].getElementsByTagName("input");
		editor.inspector.elements.transform.input[key].x = elements[0];
		editor.inspector.elements.transform.input[key].y = elements[1];
		editor.inspector.elements.transform.input[key].z = elements[2];
	}
	for (key in editor.inspector.elements.transform.label){
		let elements = document.getElementsByClassName(key)[0].getElementsByTagName("span");
		editor.inspector.elements.transform.label[key].x = elements[0];
		editor.inspector.elements.transform.label[key].y = elements[1];
		editor.inspector.elements.transform.label[key].z = elements[2];
	}
	
	// Inspector event listeners & functions
	// Change name
	let inspectorChangeName = function(){
		if (editor.inspector.selected){
			editor.inspector.selected.getElementsByClassName("name")[0].innerText = this.value;
		}
	}
	editor.inspector.elements.name.addEventListener("change",inspectorChangeName,false);
	editor.inspector.elements.name.addEventListener("input",inspectorChangeName,false);
	
	// Change model (OBJECT)
	let inspectorChangeModel = function(){
		if (editor.inspector.selected){
			let uuid = editor.inspector.selected.dataset.uuid;
			let prefabUuid = editor.inspector.selected.dataset.prefabUuid;
			let old = editor.prefabs[prefabUuid].entities[uuid].sceneObject;
			// remove old model
			editor.prefabs[prefabUuid].group.remove(old);
			
			// add new model
			let clone = editor.models[this.value].scene.clone();
			clone.visible = true;
			clone.position.copy(old.position);
			clone.rotation.copy(old.rotation);
			clone.scale.copy(old.scale);
			editor.prefabs[prefabUuid].entities[uuid].sceneObject = clone;
			editor.prefabs[prefabUuid].group.add(clone);
		}
	}
	editor.inspector.elements.model.addEventListener("change",inspectorChangeModel,false);
	
	// Change shape (COLLIDER)
	let inspectorChangeShape = function(){
		if (editor.inspector.selected){
			let uuid = editor.inspector.selected.dataset.uuid;
			let prefabUuid = editor.inspector.selected.dataset.prefabUuid;
			let newGeometry;
			switch(this.value){
				case "sphere":
					newGeometry = new THREE.SphereBufferGeometry( 1, 12, 10 );
					break;
				case "cylinder":
					newGeometry = new THREE.CylinderBufferGeometry( 1, 1, 4, 12 );
					break;
				case "cone":
					newGeometry = new THREE.ConeBufferGeometry( 1, 4, 12 );
					break;
				/* case "capsule":
					newGeometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
					break; */
				case "box":
				default:
					newGeometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
					break;
			}
			editor.prefabs[prefabUuid].entities[uuid].sceneObject.geometry = newGeometry;
		}
	}
	editor.inspector.elements.shape.addEventListener("change",inspectorChangeShape,false);
	
	//
	
	// Change transform
	let transformElements = editor.inspector.elements.transform;
	let transformFunctions = {};
	
	// Translation
	transformFunctions.translate = function(axis,value){
		let uuid = editor.inspector.selected.dataset.uuid;
		let prefabUuid = editor.inspector.selected.dataset.prefabUuid;
		editor.prefabs[prefabUuid].entities[uuid].sceneObject.position[axis] = parseFloat(value);
	}
	
	// Scale
	transformFunctions.scale = function(axis,value){
		let uuid = editor.inspector.selected.dataset.uuid;
		let prefabUuid = editor.inspector.selected.dataset.prefabUuid;
		editor.prefabs[prefabUuid].entities[uuid].sceneObject.scale[axis] = parseFloat(value);
	}
	
	// Rotate
	transformFunctions.rotate = function(axis,value){
		let uuid = editor.inspector.selected.dataset.uuid;
		let prefabUuid = editor.inspector.selected.dataset.prefabUuid;
		editor.prefabs[prefabUuid].entities[uuid].sceneObject.setRotationFromEuler(
			new THREE.Euler( 
				parseFloat(editor.inspector.elements.transform.input.rotate.x.value) * Math.PI / 180,
				parseFloat(editor.inspector.elements.transform.input.rotate.y.value) * Math.PI / 180,
				parseFloat(editor.inspector.elements.transform.input.rotate.z.value) * Math.PI / 180,
				'XYZ'
			)
		);
	}
	
	// Attach event listeners to inputs and labels
	// Input
	for (transform in transformElements.input){
		for (key in transformElements.input[transform]){
			let el = transformElements.input[transform][key];
			let func = transformFunctions[transform];
			el.addEventListener("change",function(){func(this.dataset.axis,this.value)}, false);
			el.addEventListener("input",function(){func(this.dataset.axis,this.value)}, false);
		}
	}
	// Label
	for (transform in transformElements.label){
		for (key in transformElements.label[transform]){ 
			let el = transformElements.label[transform][key];
			let func = transformFunctions[transform];
			el.addEventListener("mousedown",function(e){
				this.requestPointerLock();
				editor.inspector.dragValue = {
					x: e.clientX,
					y: e.clientY,
					value: parseFloat(this.nextElementSibling.value),
					element: this.nextElementSibling,
					func: func
				}
			}, false);
		}
	}
	
	//
	
	// Inspector drag events
	document.body.addEventListener('mousemove', function(event) {
		let dragValue = editor.inspector.dragValue;
		if (dragValue){
			let x = event.movementX;
			let y = event.movementY;
			let newValue = dragValue.value += x * .1 ;
			dragValue.element.value = newValue.toFixed(2);
			editor.inspector.dragValue.x = x;
			editor.inspector.dragValue.y = y;
			dragValue.func(dragValue.element.dataset.axis,dragValue.element.value);
		}
	}, false);
	document.body.addEventListener('mouseup', function(event) {
		editor.inspector.dragValue = null;
	}, false);
	
	//
	
	// Menu
	let childValue = 0;
	for (let child of document.getElementById("editorMode").children){
		child.dataset.nthChild = childValue++;
		child.addEventListener("click",function(){
			let firstElement = document.getElementById("properties").firstElementChild;
			firstElement.style.marginLeft = "-"+parseInt(this.dataset.nthChild) * 100 +"%";
			
			for (let c of this.parentNode.children){
				c.className = "";
			}
			
			for (let key in editor.groups){
				editor.groups[key].visible = false;
			}
			
			if (parseInt(this.dataset.nthChild) >= 2){
				editor.inspector.deselect();
				editor.inspector.element.style.transform = "translateX(100%)";
				if (editor.menu.overflowTimeout) clearTimeout(editor.menu.overflowTimeout);
				document.getElementById("prefabs").style.overflow = "visible";
			} else {
				editor.inspector.element.style.transform = "translateX(0%)";
				editor.menu.overflowTimeout = setTimeout(function(){
					document.getElementById("prefabs").style.overflow = "auto";
				},400);
			}
			
			if (this.dataset.sceneGroup) editor.groups[this.dataset.sceneGroup].visible = true;
			
			this.className = "selected";
			
		}, false);
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
	}, false);
	
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
			object3d.children[0].geometry.computeBoundingBox();
			object3d.children[0].geometry.center();
			object3d.children[0].material = editor.physicsMaterial;
			object3d.children[0].setRotationFromEuler( new THREE.Euler( -Math.PI*.5, 0, Math.PI*.5, 'XYZ' ) );
			scene.add( object3d );
		}
		reader.readAsText(file, "utf-8");
    }, false);
	
	//
	
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
							}, false);
							
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
									}, false);
									select.remove(index);
									parent.parentNode.removeChild(parent); // oofies
									editorLog("Removed model ("+id+")","warn");
								}					
							}, false);
							
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
    }, false);
	
	//
	
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
	
	// Delete entity
	let deleteEntity = function(event){
		if (event) event.stopPropagation();		
		let parent = this.closest(".objectList > div");
		let prefabUuid = parent.dataset.prefabUuid;
		let uuid = parent.dataset.uuid;
		let name = parent.getElementsByClassName("name")[0].innerHTML;
		if ( !event || confirm("Are you sure you want to delete this entity? ("+name+") ("+uuid+")") ) {
			// Deselect inspector if it shows currently selected object
			if (editor.inspector.selected === parent)
				editor.inspector.deselect();
			
			// Remove element
			parent.parentNode.removeChild(parent);
			
			// Remove threejs object
			editor.prefabs[prefabUuid].group.remove(
				editor.prefabs[prefabUuid].entities[uuid].sceneObject
			);
			
			delete editor.prefabs[prefabUuid].entities[uuid];
			
		}
	}
	
	// Delete prefab
	let deletePrefab = function(){
		let parent = this.closest(".prefab");
		let prefabUuid = parent.dataset.prefabUuid;
		let name = parent.getElementsByClassName("prefabName")[0].value;
		if ( confirm("Are you sure you want to delete this prefab? ("+name+") ("+parent.dataset.uuid+")") ) {
			// Deselect inspector
			// TODO: add deselect condition (only need to deselect when selected object is in prefab)
			editor.inspector.deselect();
			
			let children = parent.getElementsByClassName("objectList")[0].children;
			for (let i = children.length; i > 0; i--){
				let child = children[i - 1];
				deleteEntity.call(child);
			}
			
			// Remove element
			parent.parentNode.removeChild(parent);
			
			delete editor.prefabs[prefabUuid];
		}
	}
	
	// Add template element to prefab
	let addTemplateElement = function(type,parent){
		let clone = document.getElementById("prefab"+type+"Template").cloneNode(true);
		let uuid = generateTinyUUID();
		
		clone.removeAttribute("id");
		clone.dataset.prefabUuid = parent.dataset.uuid;
		clone.dataset.uuid = uuid;
		clone.getElementsByClassName("name")[0].innerHTML = type+editor.entityCount++;
		clone.getElementsByClassName("uuid")[0].innerHTML = uuid;
		clone.getElementsByClassName("delete")[0].addEventListener("click",deleteEntity,false);
		clone.addEventListener("click",editor.inspector.select,false);
		clone = parent.getElementsByClassName("objectList")[0].appendChild(clone);
		editor.prefabs[parent.dataset.uuid].entities[uuid] = {
			element: clone
		};
		return uuid;
	}
	
	// Add object to prefab
	let addObject = function(){
		let parent = this.closest(".prefab");
		let uuid = addTemplateElement.call(this,"Object",parent);
		
		let clone = editor.defaultModel.clone();
		editor.prefabs[parent.dataset.uuid].entities[uuid].sceneObject = clone;
		editor.prefabs[parent.dataset.uuid].group.add(clone);
	}
	
	// Add collider to prefab
	let addCollider = function(){
		let parent = this.closest(".prefab");
		let uuid = addTemplateElement.call(this,"Collider",parent);
		
		let geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
		let box = new THREE.Mesh( geometry, editor.physicsMaterial );
		editor.prefabs[parent.dataset.uuid].entities[uuid].sceneObject = box;
		editor.prefabs[parent.dataset.uuid].group.add(box);
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
			group: new THREE.Group(),
			entities: {}
		};
		
		// Add threejs group to scene
		editor.groups.prefabs.add(editor.prefabs[uuid].group);
		
		// Add to DOM
		let prefabList = document.getElementById("prefabsList");
		editor.prefabs[uuid].element = clone = prefabList.insertBefore(clone,document.getElementById("addPrefab"));
		
		// Focus to name input so user can start typing right away
		clone.getElementsByClassName("prefabName")[0].focus();
	}, false);
	
}, false);

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