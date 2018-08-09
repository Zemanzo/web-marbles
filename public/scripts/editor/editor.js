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
	world: {},
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
			let type = this.dataset.type;
			insp.selected = this;
			
			let transformElements = editor.inspector.elements.transform;
			
			let entity = editor.prefabs[prefabUuid][type][uuid];
			let sceneObject = entity.sceneObject;
				
			transformElements.input.translate.x.value = sceneObject.position.x;
			transformElements.input.translate.y.value = sceneObject.position.y;
			transformElements.input.translate.z.value = sceneObject.position.z;
			
			transformElements.input.scale.x.value = sceneObject.scale.x;
			transformElements.input.scale.y.value = sceneObject.scale.y;
			transformElements.input.scale.z.value = sceneObject.scale.z;
			
			transformElements.input.rotate.x.value = (sceneObject.rotation.x * (180 / Math.PI)).toFixed(1);
			transformElements.input.rotate.y.value = (sceneObject.rotation.y * (180 / Math.PI)).toFixed(1);
			transformElements.input.rotate.z.value = (sceneObject.rotation.z * (180 / Math.PI)).toFixed(1);
			
			// Reset any disabled inputs. Will be disabled again when necessary.
			editor.inspector.enable.all();
			
			if (entity.model) document.getElementById("inspectorModel").value = entity.model;
			
			if (entity.shape){
				editor.inspector.elements.shape.value = entity.shape;
				editor.inspector.element.getElementsByClassName("shapeProperties")[0].className = 
					"shapeProperties colliderProperty "+entity.shape;
					
				editor.inspector.elements.shapeProperties.input.radius.value = sceneObject.userData.radius;
				editor.inspector.elements.shapeProperties.input.width.value  = sceneObject.userData.width;
				editor.inspector.elements.shapeProperties.input.height.value = sceneObject.userData.height;
				editor.inspector.elements.shapeProperties.input.depth.value  = sceneObject.userData.depth;	
			}
			
			// Set functionality if the object has it.
			if (sceneObject.userData.functionality){
				document.getElementById("inspectorFunction").value = sceneObject.userData.functionality;
				if (sceneObject.userData.functionality === "startarea"){ // Disable rotations for startarea
					editor.inspector.disable.rotation();
					editor.inspector.disable.shape();
				}
			}
			
			// Check if the root prefab contains a starting area, and disable the rotation based on that.
			if (type === "instances"){
				let containsStart = Object.keys( editor.prefabs[prefabUuid].entities ).some(
					(key)=>{
						let userData = editor.prefabs[prefabUuid].entities[key].sceneObject.userData;
						return (userData.functionality && userData.functionality === "startarea");
					}
				);
				if (containsStart) editor.inspector.disable.rotation();
			}
			
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
					el.value = el.defaultValue || "";
				} else {
					el.selectedIndex = "0"; 
				}
			}
		},
		disable: {
			position: function(){
				editor.inspector.elements.transform.input.translate.x.disabled = true;
				editor.inspector.elements.transform.input.translate.y.disabled = true;
				editor.inspector.elements.transform.input.translate.z.disabled = true;
			},
			rotation: function(){
				editor.inspector.elements.transform.input.rotate.x.disabled = true;
				editor.inspector.elements.transform.input.rotate.y.disabled = true;
				editor.inspector.elements.transform.input.rotate.z.disabled = true;
			},
			scale: function(){
				editor.inspector.elements.transform.input.scale.x.disabled = true;
				editor.inspector.elements.transform.input.scale.y.disabled = true;
				editor.inspector.elements.transform.input.scale.z.disabled = true;
			},
			shape: function(){
				editor.inspector.elements.shape.disabled = true;
			}
		},
		enable: {
			position: function(){
				editor.inspector.elements.transform.input.translate.x.disabled = false;
				editor.inspector.elements.transform.input.translate.y.disabled = false;
				editor.inspector.elements.transform.input.translate.z.disabled = false;
			},
			rotation: function(){
				editor.inspector.elements.transform.input.rotate.x.disabled = false;
				editor.inspector.elements.transform.input.rotate.y.disabled = false;
				editor.inspector.elements.transform.input.rotate.z.disabled = false;
			},
			scale: function(){
				editor.inspector.elements.transform.input.scale.x.disabled = false;
				editor.inspector.elements.transform.input.scale.y.disabled = false;
				editor.inspector.elements.transform.input.scale.z.disabled = false;
			},
			shape: function(){
				editor.inspector.elements.shape.disabled = false;
			},
			all: function(){
				editor.inspector.enable.position();
				editor.inspector.enable.rotation();
				editor.inspector.enable.scale();
				editor.inspector.enable.shape();
			}
		}
	},
	entityCount: 0
};
	
window.addEventListener("DOMContentLoaded", function(){
	editor.elements = {
		log: document.getElementById("log"),
		worldPrefab: document.getElementById("worldPrefab")
	};
	
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
		},
		shapeProperties: {
			input: {
				radius: null,
				width: null,
				height: null,
				depth: null
			},
			label: {
				radius: null,
				width: null,
				height: null,
				depth: null
			}
		}
	};
	
	// Transform input & label elements
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
	
	// Physics shape label & elements
	let physicsShapeElements, i;
	
	physicsShapeElements = document.getElementById("shapeProperties").getElementsByTagName("input");
	i = 0;
	for (key in editor.inspector.elements.shapeProperties.input){
		editor.inspector.elements.shapeProperties.input[key] = physicsShapeElements[i++];
	}
	
	physicsShapeElements = document.getElementById("shapeProperties").getElementsByTagName("span");
	i = 0;
	for (key in editor.inspector.elements.shapeProperties.label){
		editor.inspector.elements.shapeProperties.label[key] = physicsShapeElements[i++];
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
	
	// Change object model
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
			editor.prefabs[prefabUuid].entities[uuid].model = this.value;
			editor.prefabs[prefabUuid].entities[uuid].sceneObject = clone;
			editor.prefabs[prefabUuid].group.add(clone);
			editor.prefabs[prefabUuid].changed = true;
		}
	}
	editor.inspector.elements.model.addEventListener("change",inspectorChangeModel,false);
	
	// Change collider shape (except terrain)
	let inspectorChangeFunction = function(){
		if (editor.inspector.selected){
			let uuid = editor.inspector.selected.dataset.uuid;
			let prefabUuid = editor.inspector.selected.dataset.prefabUuid;
			
			let entity = editor.prefabs[prefabUuid].entities[uuid];
			let functionality = entity.sceneObject.userData.functionality = this.value;
			
			let rotationInputs = editor.inspector.elements.transform.input.rotate;
			
			rotationInputs.x.disabled = false;
			rotationInputs.y.disabled = false;
			rotationInputs.z.disabled = false;
			editor.inspector.elements.shape.disabled = false;
					
			switch(functionality){
				case "startarea":
					entity.sceneObject.material = editor.startMaterial;
					
					rotationInputs.x.value = entity.sceneObject.rotation.x = 0;
					rotationInputs.y.value = entity.sceneObject.rotation.y = 0;
					rotationInputs.z.value = entity.sceneObject.rotation.z = 0;
					
					rotationInputs.x.disabled = true;
					rotationInputs.y.disabled = true;
					rotationInputs.z.disabled = true;
					
					editor.inspector.elements.shape.value = "box";
					editor.inspector.elements.shape.disabled = true;
					inspectorChangeShape();
					
					break;
				case "endarea":
					entity.sceneObject.material = editor.endMaterial;
					break;
				case "collider":
				default:
					entity.sceneObject.material = editor.physicsMaterial;
					break;
			}
			
			editor.prefabs[prefabUuid].changed = true;
		}
	}
	document.getElementById("inspectorFunction").addEventListener("change",inspectorChangeFunction,false);
	
	// Change collider shape (except terrain)
	let inspectorChangeShape = function(){
		if (editor.inspector.selected){
			let uuid = editor.inspector.selected.dataset.uuid;
			let prefabUuid = editor.inspector.selected.dataset.prefabUuid;
			
			let shape = editor.inspector.elements.shape.value;
			let entity = editor.prefabs[prefabUuid].entities[uuid];
			let userData = entity.sceneObject.userData;
			let terrainGeometry = entity.terrainGeometry;
				
			let radius = userData.radius = parseFloat(editor.inspector.elements.shapeProperties.input.radius.value);
			let width  = userData.width  = parseFloat(editor.inspector.elements.shapeProperties.input.width.value);
			let height = userData.height = parseFloat(editor.inspector.elements.shapeProperties.input.height.value);
			let depth  = userData.depth  = parseFloat(editor.inspector.elements.shapeProperties.input.depth.value);
			
			let newGeometry;
			switch(shape){
				case "sphere":
					newGeometry = new THREE.SphereBufferGeometry( radius, 12, 10 );
					break;
				case "cylinder":
					newGeometry = new THREE.CylinderBufferGeometry( radius, radius, height, 12 );
					break;
				case "cone":
					newGeometry = new THREE.ConeBufferGeometry( radius, height, 12 );
					break;
				/* case "capsule":
					newGeometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
					break; */
				case "terrain":
					if (terrainGeometry){
						newGeometry = terrainGeometry;
					} else {
						newGeometry = new THREE.PlaneBufferGeometry( 1, 1 );
					}
					break;
				case "box":
				default:
					newGeometry = new THREE.BoxBufferGeometry( width, height, depth );
					break;
			}
			
			editor.prefabs[prefabUuid].entities[uuid].shape = shape;
			document.getElementById("shapeProperties").className = "shapeProperties colliderProperty "+shape;
			editor.prefabs[prefabUuid].entities[uuid].sceneObject.geometry = newGeometry;
			editor.prefabs[prefabUuid].changed = true;
		}
	}
	editor.inspector.elements.shape.addEventListener("change",inspectorChangeShape,false);
	
	// Change collider shape to terrain
	let inspectorShapeTerrain = function(){
		if (editor.inspector.selected){
			let uuid = editor.inspector.selected.dataset.uuid;
			let prefabUuid = editor.inspector.selected.dataset.prefabUuid;
			
			let file = this.files[0];
			let reader = new FileReader();
			let loader = new THREE.OBJLoader();
			
			reader.onload = function(e) {
				let result = reader.result;
				let object3d = loader.parse( result );
				object3d.children[0].geometry.computeBoundingBox();
				object3d.children[0].geometry.center();
				
				editor.prefabs[prefabUuid].entities[uuid].sceneObject.geometry =
					editor.prefabs[prefabUuid].entities[uuid].terrainGeometry = 
					object3d.children[0].geometry;
			}
			
			reader.readAsText(file, "utf-8");
		}
	}
	document.getElementById('terPhysics').addEventListener("change",inspectorShapeTerrain,false);

	//
	
	// Change transform
	let transformElements = editor.inspector.elements.transform;
	let transformFunctions = {};
	
	// Translation
	transformFunctions.translate = function(axis,value){
		let uuid = editor.inspector.selected.dataset.uuid;
		let prefabUuid = editor.inspector.selected.dataset.prefabUuid;
		let type = editor.inspector.selected.dataset.type;
		editor.prefabs[prefabUuid][type][uuid].sceneObject.position[axis] = parseFloat(value);
		editor.prefabs[prefabUuid].changed = true;
	}
	
	// Scale
	transformFunctions.scale = function(axis,value){
		let uuid = editor.inspector.selected.dataset.uuid;
		let prefabUuid = editor.inspector.selected.dataset.prefabUuid;
		let type = editor.inspector.selected.dataset.type;
		editor.prefabs[prefabUuid][type][uuid].sceneObject.scale[axis] = parseFloat(value);
		editor.prefabs[prefabUuid].changed = true;
	}
	
	// Rotate
	transformFunctions.rotate = function(axis,value){
		let uuid = editor.inspector.selected.dataset.uuid;
		let prefabUuid = editor.inspector.selected.dataset.prefabUuid;
		let type = editor.inspector.selected.dataset.type;
		editor.prefabs[prefabUuid][type][uuid].sceneObject.setRotationFromEuler(
			new THREE.Euler( 
				parseFloat(editor.inspector.elements.transform.input.rotate.x.value) * Math.PI / 180,
				parseFloat(editor.inspector.elements.transform.input.rotate.y.value) * Math.PI / 180,
				parseFloat(editor.inspector.elements.transform.input.rotate.z.value) * Math.PI / 180,
				'XYZ'
			)
		);
		editor.prefabs[prefabUuid].changed = true;
	}
	
	// Attach event listeners to inputs and labels
	
	// Transform
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
				if (!this.previousElementSibling.disabled){
					this.requestPointerLock();
					editor.inspector.dragValue = {
						x: e.clientX,
						y: e.clientY,
						value: parseFloat(this.previousElementSibling.value),
						element: this.previousElementSibling,
						func: func
					}
				}
			}, false);
		}
	}
	
	// Shape properties
	// Input
	for (key in editor.inspector.elements.shapeProperties.input){
		let el = editor.inspector.elements.shapeProperties.input[key];
		el.addEventListener("change", inspectorChangeShape, false);
		el.addEventListener("input", inspectorChangeShape, false);
	}
	
	// Label
	for (key in editor.inspector.elements.shapeProperties.label){
		let el = editor.inspector.elements.shapeProperties.label[key];
		el.addEventListener("mousedown",function(e){
			if (!this.previousElementSibling.disabled){
				this.requestPointerLock();
				editor.inspector.dragValue = {
					x: e.clientX,
					y: e.clientY,
					value: parseFloat(this.previousElementSibling.value),
					element: this.previousElementSibling,
					func: inspectorChangeShape
				}
			}
		}, false);
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
			
			editor.inspector.deselect();
			
			if (parseInt(this.dataset.nthChild) >= 2){
				editor.inspector.element.style.transform = "translateX(100%)";
				if (editor.menu.overflowTimeout) clearTimeout(editor.menu.overflowTimeout);
				document.getElementById("prefabs").style.overflow = "visible";
			} else {
				editor.inspector.element.style.transform = "translateX(0%)";
				editor.menu.overflowTimeout = setTimeout(function(){
					document.getElementById("prefabs").style.overflow = "auto";
				},400);
			}
			
			if (parseInt(this.dataset.nthChild) === 2){ // World
				for (uuid in editor.prefabs){
					if (editor.prefabs[uuid].changed){
						// update prefab
						
						for (key in editor.prefabs[uuid].instances){
							let instance = editor.prefabs[uuid].instances[key];
							let old = instance.sceneObject;
							
							let clone = editor.prefabs[uuid].group.clone();
							clone.position.copy(old.position);
							clone.rotation.copy(old.rotation);
							
							old.parent.add(clone);
							
							old.parent.remove(old);
							
							instance.sceneObject = clone;
						}
						
						// world instances are updated
						editor.prefabs[uuid].changed = false;
					}
				}
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
		editor.prefabs[prefabUuid].changed = true;
	}
	
	// Delete prefab
	let deletePrefab = function(){
		let parent = this.closest(".prefab");
		let prefabUuid = parent.dataset.uuid;
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
			
			// Remove world select option element
			editor.elements.worldPrefab.removeChild(editor.prefabs[prefabUuid].option);
			
			if (editor.elements.worldPrefab.children.length == 1){
				editor.elements.worldPrefab.disabled = true;
			}
			
			// Remove world instances
			for (key in editor.prefabs[prefabUuid].instances){
				let instance = editor.prefabs[prefabUuid].instances[key];
				instance.element.parentNode.removeChild(instance.element);
				instance.sceneObject.parent.remove(instance.sceneObject);
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
		clone.dataset.type = "entities";
		clone.getElementsByClassName("name")[0].innerHTML = type+editor.entityCount++;
		clone.getElementsByClassName("uuid")[0].innerHTML = uuid;
		clone.getElementsByClassName("delete")[0].addEventListener("click",deleteEntity,false);
		clone.addEventListener("click",editor.inspector.select,false);
		clone = parent.getElementsByClassName("objectList")[0].appendChild(clone);
		editor.prefabs[parent.dataset.uuid].entities[uuid] = {
			element: clone
		};
		editor.prefabs[parent.dataset.uuid].changed = true;
		return uuid;
	}
	
	// Add object to prefab
	let addObject = function(){
		let parent = this.closest(".prefab");
		let uuid = addTemplateElement.call(this,"Object",parent);
		
		let clone = editor.defaultModel.clone();
		editor.prefabs[parent.dataset.uuid].entities[uuid].model = "null";
		editor.prefabs[parent.dataset.uuid].entities[uuid].sceneObject = clone;
		editor.prefabs[parent.dataset.uuid].group.add(clone);
	}
	
	// Add collider to prefab
	let addCollider = function(){
		let parent = this.closest(".prefab");
		let uuid = addTemplateElement.call(this,"Collider",parent);
		
		let geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
		let box = new THREE.Mesh( geometry, editor.physicsMaterial );
		editor.prefabs[parent.dataset.uuid].entities[uuid].shape = "box";
		let sceneObject = editor.prefabs[parent.dataset.uuid].entities[uuid].sceneObject = box;
		sceneObject.userData.radius = 1;
		sceneObject.userData.width = 1;
		sceneObject.userData.height = 1;
		sceneObject.userData.depth = 1;
		sceneObject.userData.functionality = "collider";
		editor.prefabs[parent.dataset.uuid].group.add(box);
	}
	
	// Toggle prefab visibility
	let showPrefab = function(){
		let parent = this.closest(".prefab");
		let prefabUuid = parent.dataset.uuid;
		let prefabGroup = editor.prefabs[prefabUuid].group;
		let icon = this.getElementsByTagName("i")[0];
		
		if (prefabGroup.visible){
			prefabGroup.visible = false;
			icon.className = "icofont-eye-blocked";
		} else {
			prefabGroup.visible = true;
			icon.className = "icofont-eye";
		}
	}
	
	// Change prefab name
	let namePrefab = function(){
		let parent = this.closest(".prefab");
		let prefabUuid = parent.dataset.uuid;
		editor.prefabs[prefabUuid].option.text = this.value+" ("+prefabUuid+")";
		for ( key of Object.keys(editor.prefabs[prefabUuid].instances) ){
			let instance = editor.prefabs[prefabUuid].instances[key];
			instance.element.getElementsByClassName("prefabName")[0].innerText = this.value;
		}
	}
	
	// Change prefab color
	let colorPrefab = function(){
		let parent = this.closest(".prefab");
		let prefabUuid = parent.dataset.uuid;
		for ( key of Object.keys(editor.prefabs[prefabUuid].instances) ){
			let instance = editor.prefabs[prefabUuid].instances[key];
			instance.element.getElementsByClassName("prefabName")[0].style.background = this.value;
		}
	}
	
	// Actually add the prefab
	document.getElementById("addPrefab").addEventListener("click",function(){
		let clone = document.getElementById("prefabTemplate").cloneNode(true); // deep clone
		let uuid = generateTinyUUID();
		clone.removeAttribute("id");
		clone.dataset.uuid = uuid;
		
		// Add events
		clone.getElementsByClassName("showPrefab")[0].addEventListener("click",showPrefab,false);
		clone.getElementsByClassName("prefabName")[0].addEventListener("input",namePrefab,false);
		clone.getElementsByClassName("prefabName")[0].addEventListener("change",namePrefab,false);
		clone.getElementsByClassName("prefabColor")[0].addEventListener("change",colorPrefab,false);
		clone.getElementsByClassName("collapse")[0].addEventListener("click",collapse,false);
		clone.getElementsByClassName("delete")[0].addEventListener("click",deletePrefab,false);
		clone.getElementsByClassName("addObject")[0].addEventListener("click",addObject,false);
		clone.getElementsByClassName("addCollider")[0].addEventListener("click",addCollider,false);
		
		// Set random color
		clone.getElementsByClassName("prefabColor")[0].value = hslToHex(
			Math.random()*360,
			100,
			Math.random()*20 + 20
		);
		
		// Remove entity templates from clone
		clone.getElementsByClassName("objectList")[0].innerHTML = "";
		
		// Display UUID
		clone.getElementsByClassName("detailsID")[0].innerHTML = uuid;
		
		// Add to editor object
		editor.prefabs[uuid] = {
			uuid: uuid,
			group: new THREE.Group(),
			entities: {},
			instances: {}
		};
		
		// Add option to prefab world list
		let select = editor.elements.worldPrefab;
		let option = document.createElement("option");
		option.text = "("+uuid+")";
		option.value = uuid;
		editor.prefabs[uuid].option = select.appendChild(option);
		
		if (select.disabled) select.disabled = false;
		
		// Add threejs group to scene
		editor.groups.prefabs.add(editor.prefabs[uuid].group);
		
		// Add to DOM
		let prefabList = document.getElementById("prefabsList");
		editor.prefabs[uuid].element = clone = prefabList.insertBefore(clone,document.getElementById("addPrefab"));
		
		// Focus to name input so user can start typing right away
		clone.getElementsByClassName("prefabName")[0].focus();
	}, false);
	
	
	// World
	
	// Change water level
	let changeWaterLevel = function(e){
		water.position.y = this.value;
	}
	document.getElementById("envWaterHeight").addEventListener("change",changeWaterLevel,false);
	document.getElementById("envWaterHeight").addEventListener("input",changeWaterLevel,false);
	
	// Change sun inclination
	let changeSunInclination = function(e){
		parameters.inclination = this.value;
		updateSun();
	}
	document.getElementById("envSunInclination").addEventListener("change",changeSunInclination,false);
	document.getElementById("envSunInclination").addEventListener("input",changeSunInclination,false);
	
	// Add world prefab
	let addWorldPrefab = function(){
		let prefabUuid = editor.elements.worldPrefab.value;
		if (
			!editor.elements.worldPrefab.disabled &&
			prefabUuid !== "null"
		) {
			let clone = document.getElementById("worldPrefabTemplate").cloneNode(true); // deep clone
			let uuid = generateTinyUUID();
			clone.removeAttribute("id");
			clone.dataset.uuid = uuid;
			clone.dataset.prefabUuid = prefabUuid;
			clone.dataset.type = "instances";
			
			// Add select event
			clone.addEventListener("click",editor.inspector.select,false);
			
			// Add name & prefab name
			clone.getElementsByClassName("name")[0].innerText = 
			clone.getElementsByClassName("prefabName")[0].innerText = 
				editor.prefabs[prefabUuid].element.getElementsByClassName("prefabName")[0].value;
			
			clone.getElementsByClassName("prefabName")[0].style.background = 
				editor.prefabs[prefabUuid].element.getElementsByClassName("prefabColor")[0].value;
			
			// Add uuid
			clone.getElementsByClassName("uuid")[0].innerHTML = uuid;
			
			// Add prefab uuid
			clone.getElementsByClassName("prefabName")[0].title = prefabUuid;
		
			// Add threejs group to scene
			let groupClone = editor.prefabs[prefabUuid].group.clone();
			editor.groups.world.add( groupClone );
			groupClone.visible = true;
			
			// Add to DOM
			let hierarchy = document.getElementById("worldHierarchy");
			let element = hierarchy.insertBefore(clone,document.getElementById("worldPrefabTemplate"));
			
			// Add instance reference to parent prefab
			editor.prefabs[prefabUuid].instances[uuid] = {
				uuid: uuid,
				sceneObject: groupClone,
				element: element
			};
			
		}
	}
	document.getElementById("worldAddPrefabButton").addEventListener("click",addWorldPrefab,false);
	
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
	editor.elements.log.insertAdjacentHTML(
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

// hslToHex courtesy of icl7126 and Abel Rodríguez at
// https://stackoverflow.com/questions/36721830/convert-hsl-to-rgb-and-hex
function hslToHex(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = x => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

window.onbeforeunload = function(e) {
	var dialogText = "Leave? You might lose unsaved changes!";
	e.returnValue = dialogText;
	return dialogText;
};