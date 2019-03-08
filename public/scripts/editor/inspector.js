import * as THREE from "three";
import * as materials from "./materials";

let editor;
let inspector = {
	selected: null,
	selectedEntity: null,
	select: function() {
		let insp = inspector;
		if (insp.selected === null) { // Nothing selected so inspector is in disabled state
			for (let el of inspector.inputs) {
				el.disabled = false;
			}
		} else {
			insp.selected.className = insp.selected.className.split(" ")[0]; // ew
		}

		insp.element.className = `${this.className}Selection`;

		document.getElementById("inspectorName").value = this.getElementsByClassName("name")[0].innerHTML;
		let uuid = document.getElementById("inspectorUUID").value = this.dataset.uuid;
		let prefabUuid = this.dataset.prefabUuid;
		let type = this.dataset.type;
		insp.selected = this;

		let transformElements = inspector.elements.transform;

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
		inspector.disabled.all(false);

		if (entity.model) document.getElementById("inspectorModelList").value = entity.model;

		// If a collider shape is selected, fill the inputs with the appropriate values
		if (entity.shape) {
			inspector.elements.shape.value = entity.shape;
			inspector.element.getElementsByClassName("shapeProperties")[0].className =
				`shapeProperties colliderProperty ${  entity.shape}`;

			inspector.elements.shapeProperties.input.radius.value = sceneObject.userData.radius;
			inspector.elements.shapeProperties.input.width.value  = sceneObject.userData.width;
			inspector.elements.shapeProperties.input.height.value = sceneObject.userData.height;
			inspector.elements.shapeProperties.input.depth.value  = sceneObject.userData.depth;
		}

		// Set functionality if the object has it.
		if (sceneObject.userData.functionality) {
			document.getElementById("inspectorFunction").value = sceneObject.userData.functionality;
			if (sceneObject.userData.functionality === "startarea") { // Disable rotations for startarea
				inspector.disabled.rotation(true);
				inspector.disabled.shape(true);
			}
		}

		// Check if the root prefab contains a starting area, and disable the rotation based on that.
		if (type === "instances") {
			let containsStart = Object.keys( editor.prefabs[prefabUuid].entities ).some(
				(key)=>{
					let userData = editor.prefabs[prefabUuid].entities[key].sceneObject.userData;
					return (userData.functionality && userData.functionality === "startarea");
				}
			);
			if (containsStart) inspector.disabled.rotation(true);
		}

		this.className += " selected";
	},
	deselect: function() {
		let selected = inspector.selected;
		if (selected) selected.className = selected.className.split(" ")[0]; // ew
		inspector.selected = null;
		inspector.element.className = "noSelection";
		for (let el of inspector.inputs) {
			el.disabled = true;
			if (el.tagName === "INPUT") {
				el.value = el.defaultValue || "";
			} else {
				el.selectedIndex = "0";
			}
		}
	},
	disabled: {
		position: function(bool = true) {
			inspector.elements.transform.input.translate.x.disabled = bool;
			inspector.elements.transform.input.translate.y.disabled = bool;
			inspector.elements.transform.input.translate.z.disabled = bool;
		},
		rotation: function(bool = true) {
			inspector.elements.transform.input.rotate.x.disabled = bool;
			inspector.elements.transform.input.rotate.y.disabled = bool;
			inspector.elements.transform.input.rotate.z.disabled = bool;
		},
		scale: function(bool = true) {
			inspector.elements.transform.input.scale.x.disabled = bool;
			inspector.elements.transform.input.scale.y.disabled = bool;
			inspector.elements.transform.input.scale.z.disabled = bool;
		},
		shape: function(bool = true) {
			inspector.elements.shape.disabled = bool;
		},
		all: function(bool = true) {
			inspector.disabled.position(bool);
			inspector.disabled.rotation(bool);
			inspector.disabled.scale(bool);
			inspector.disabled.shape(bool);
		}
	},
	initialize: function(global) {
		editor = global;
		editor.inspector = this;

		// Inspector
		inspector.element = document.getElementById("inspector");
		inspector.inputs = [
			...inspector.element.getElementsByTagName("input"),
			...inspector.element.getElementsByTagName("select")
		];
		inspector.deselect();

		// Inspector elements
		inspector.elements = {
			name: document.getElementById("inspectorName"),
			model: document.getElementById("inspectorModelList"),
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
		for (let key in inspector.elements.transform.input) {
			let elements = document.getElementsByClassName(key)[0].getElementsByTagName("input");
			inspector.elements.transform.input[key].x = elements[0];
			inspector.elements.transform.input[key].y = elements[1];
			inspector.elements.transform.input[key].z = elements[2];
		}

		for (let key in inspector.elements.transform.label) {
			let elements = document.getElementsByClassName(key)[0].getElementsByTagName("span");
			inspector.elements.transform.label[key].x = elements[0];
			inspector.elements.transform.label[key].y = elements[1];
			inspector.elements.transform.label[key].z = elements[2];
		}

		// Physics shape label & elements
		let physicsShapeElements, i;

		physicsShapeElements = document.getElementById("shapeProperties").getElementsByTagName("input");
		i = 0;
		for (let key in inspector.elements.shapeProperties.input) {
			inspector.elements.shapeProperties.input[key] = physicsShapeElements[i++];
		}

		physicsShapeElements = document.getElementById("shapeProperties").getElementsByTagName("span");
		i = 0;
		for (let key in inspector.elements.shapeProperties.label) {
			inspector.elements.shapeProperties.label[key] = physicsShapeElements[i++];
		}

		// Inspector event listeners & functions
		// Change name
		let inspectorChangeName = function() {
			if (inspector.selected) {
				inspector.selected.getElementsByClassName("name")[0].innerText = this.value;
			}
		};

		inspector.elements.name.addEventListener("change", inspectorChangeName, false);
		inspector.elements.name.addEventListener("input", inspectorChangeName, false);

		// Change object model
		let inspectorChangeModel = function() {
			if (inspector.selected) {
				let uuid = inspector.selected.dataset.uuid;
				let prefabUuid = inspector.selected.dataset.prefabUuid;
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
		};
		inspector.elements.model.addEventListener("change", inspectorChangeModel, false);

		// Center object model's origin -- Useful for aligning terrain with its physics counterpart
		let inspectorCenterModelOrigin = function() {
			if (inspector.selected) {
				let uuid = inspector.selected.dataset.uuid;
				let prefabUuid = inspector.selected.dataset.prefabUuid;
				let sceneObject = editor.prefabs[prefabUuid].entities[uuid].sceneObject;
				console.log(sceneObject);

				sceneObject.children[0].geometry.computeBoundingBox();
				sceneObject.children[0].geometry.center();
				editor.prefabs[prefabUuid].changed = true;
			}
		};
		document.getElementById("inspectorCenterModelOrigin").addEventListener("click", inspectorCenterModelOrigin, false);

		// Change functionality
		let inspectorChangeFunction = function() {
			if (inspector.selected) {
				let uuid = inspector.selected.dataset.uuid;
				let prefabUuid = inspector.selected.dataset.prefabUuid;

				let entity = editor.prefabs[prefabUuid].entities[uuid];
				let functionality = entity.sceneObject.userData.functionality = this.value;

				let rotationInputs = inspector.elements.transform.input.rotate;

				rotationInputs.x.disabled = false;
				rotationInputs.y.disabled = false;
				rotationInputs.z.disabled = false;
				inspector.elements.shape.disabled = false;

				switch(functionality) {
				case "startarea":
					entity.sceneObject.material = materials.startMaterial;

					rotationInputs.x.value = entity.sceneObject.rotation.x = 0;
					rotationInputs.y.value = entity.sceneObject.rotation.y = 0;
					rotationInputs.z.value = entity.sceneObject.rotation.z = 0;

					rotationInputs.x.disabled = true;
					rotationInputs.y.disabled = true;
					rotationInputs.z.disabled = true;

					inspector.elements.shape.value = "box";
					inspector.elements.shape.disabled = true;
					inspectorChangeShape();

					break;
				case "startgate":
					entity.sceneObject.material = materials.gateMaterial;
					break;
				case "endarea":
					entity.sceneObject.material = materials.endMaterial;
					break;
				case "static":
				default:
					entity.sceneObject.material = materials.physicsMaterial;
					break;
				}

				editor.prefabs[prefabUuid].changed = true;
			}
		};
		document.getElementById("inspectorFunction").addEventListener("change", inspectorChangeFunction, false);

		// Change collider shape (except terrain)
		let inspectorChangeShape = function() {
			if (inspector.selected) {
				let uuid = inspector.selected.dataset.uuid;
				let prefabUuid = inspector.selected.dataset.prefabUuid;

				let shape = inspector.elements.shape.value;
				let entity = editor.prefabs[prefabUuid].entities[uuid];
				let userData = entity.sceneObject.userData;
				let terrainGeometry = entity.terrainGeometry;

				let radius = userData.radius = parseFloat(inspector.elements.shapeProperties.input.radius.value);
				let width  = userData.width  = parseFloat(inspector.elements.shapeProperties.input.width.value);
				let height = userData.height = parseFloat(inspector.elements.shapeProperties.input.height.value);
				let depth  = userData.depth  = parseFloat(inspector.elements.shapeProperties.input.depth.value);

				let newGeometry;
				switch(shape) {
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
					if (terrainGeometry) {
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
				document.getElementById("shapeProperties").className = `shapeProperties colliderProperty ${shape}`;
				editor.prefabs[prefabUuid].entities[uuid].sceneObject.geometry = newGeometry;
				editor.prefabs[prefabUuid].changed = true;
			}
		};
		inspector.elements.shape.addEventListener("change", inspectorChangeShape, false);

		// Change collider shape to terrain
		let inspectorShapeTerrain = function() {
			if (inspector.selected) {
				let uuid = inspector.selected.dataset.uuid;
				let prefabUuid = inspector.selected.dataset.prefabUuid;

				let file = this.files[0];
				let reader = new FileReader();
				let loader = new THREE.OBJLoader();

				reader.onload = function() {
					let result = reader.result;
					let object3d = loader.parse( result );
					object3d.children[0].geometry.computeBoundingBox();
					object3d.children[0].geometry.center();

					editor.prefabs[prefabUuid].entities[uuid].sceneObject.geometry =
						editor.prefabs[prefabUuid].entities[uuid].terrainGeometry =
						object3d.children[0].geometry;
				};

				reader.readAsText(file, "utf-8");
			}
		};
		document.getElementById("terPhysics").addEventListener("change", inspectorShapeTerrain, false);

		//

		// Change transform
		let transformElements = inspector.elements.transform;
		let transformFunctions = {};

		// Translation
		transformFunctions.translate = function(axis, value) {
			let uuid = inspector.selected.dataset.uuid;
			let prefabUuid = inspector.selected.dataset.prefabUuid;
			let type = inspector.selected.dataset.type;
			editor.prefabs[prefabUuid][type][uuid].sceneObject.position[axis] = parseFloat(value);
			editor.prefabs[prefabUuid].changed = true;
		};

		// Scale
		transformFunctions.scale = function(axis, value) {
			let uuid = inspector.selected.dataset.uuid;
			let prefabUuid = inspector.selected.dataset.prefabUuid;
			let type = inspector.selected.dataset.type;
			editor.prefabs[prefabUuid][type][uuid].sceneObject.scale[axis] = parseFloat(value);
			editor.prefabs[prefabUuid].changed = true;
		};

		// Rotate
		transformFunctions.rotate = function() {
			let uuid = inspector.selected.dataset.uuid;
			let prefabUuid = inspector.selected.dataset.prefabUuid;
			let type = inspector.selected.dataset.type;
			editor.prefabs[prefabUuid][type][uuid].sceneObject.setRotationFromEuler(
				new THREE.Euler(
					parseFloat(inspector.elements.transform.input.rotate.x.value) * Math.PI / 180,
					parseFloat(inspector.elements.transform.input.rotate.y.value) * Math.PI / 180,
					parseFloat(inspector.elements.transform.input.rotate.z.value) * Math.PI / 180,
					"XYZ"
				)
			);
			editor.prefabs[prefabUuid].changed = true;
		};

		// Attach event listeners to inputs and labels

		// Transform
		// Input
		for (let transform in transformElements.input) {
			for (let key in transformElements.input[transform]) {
				let el = transformElements.input[transform][key];
				let func = transformFunctions[transform];
				el.addEventListener("change", function() { func(this.dataset.axis, this.value); }, false);
				el.addEventListener("input", function() { func(this.dataset.axis, this.value); }, false);
			}
		}
		// Label
		for (let transform in transformElements.label) {
			for (let key in transformElements.label[transform]) {
				let el = transformElements.label[transform][key];
				let func = transformFunctions[transform];
				el.addEventListener("mousedown", function(e) {
					if (!this.previousElementSibling.disabled) {
						this.requestPointerLock();
						inspector.dragValue = {
							x: e.clientX,
							y: e.clientY,
							value: parseFloat(this.previousElementSibling.value),
							element: this.previousElementSibling,
							func: func
						};
					}
				}, false);
			}
		}

		// Shape properties
		// Input
		for (let key in inspector.elements.shapeProperties.input) {
			let el = inspector.elements.shapeProperties.input[key];
			el.addEventListener("change", inspectorChangeShape, false);
			el.addEventListener("input", inspectorChangeShape, false);
		}

		// Label
		for (let key in inspector.elements.shapeProperties.label) {
			let el = inspector.elements.shapeProperties.label[key];
			el.addEventListener("mousedown", function(e) {
				if (!this.previousElementSibling.disabled) {
					this.requestPointerLock();
					inspector.dragValue = {
						x: e.clientX,
						y: e.clientY,
						value: parseFloat(this.previousElementSibling.value),
						element: this.previousElementSibling,
						func: inspectorChangeShape
					};
				}
			}, false);
		}

		//

		// Inspector drag events
		document.body.addEventListener("mousemove", function(event) {
			let dragValue = inspector.dragValue;
			if (dragValue) {
				let x = event.movementX;
				let y = event.movementY;
				let newValue = dragValue.value += x * .1 ;
				dragValue.element.value = newValue.toFixed(2);
				inspector.dragValue.x = x;
				inspector.dragValue.y = y;
				dragValue.func(dragValue.element.dataset.axis, dragValue.element.value);
			}
		}, false);
		document.body.addEventListener("mouseup", function() {
			inspector.dragValue = null;
		}, false);
	}
};

export let initialize = inspector.initialize,
	select = inspector.select,
	deselect = inspector.deselect,
	selected = inspector.selected,
	selectedEntity = inspector.selectedEntity;
