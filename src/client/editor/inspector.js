import * as THREE from "three";

let inspector = function() {
	return {
		selected: null,

		initialize: function() {
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
					inspector.selected.setName(this.value);
				}
			};

			inspector.elements.name.addEventListener("change", inspectorChangeName, false);
			inspector.elements.name.addEventListener("input", inspectorChangeName, false);

			// Change object model
			let inspectorChangeModel = function() {
				if (inspector.selected) {
					inspector.selected.setModel(this.value);
				}
			};
			inspector.elements.model.addEventListener("change", inspectorChangeModel, false);

			// TODO: Reconsider its use
			// Center object model's origin -- Useful for aligning terrain with its physics counterpart
			// let inspectorCenterModelOrigin = function() {
			// 	if (inspector.selected) {
			// 		let uuid = inspector.selected.dataset.uuid;
			// 		let prefabUuid = inspector.selected.dataset.prefabUuid;
			// 		let sceneObject = prefabsTab.prefabs[prefabUuid].entities[uuid].sceneObject;
			// 		console.log(sceneObject);

			// 		sceneObject.children[0].geometry.computeBoundingBox();
			// 		sceneObject.children[0].geometry.center();
			// 		prefabsTab.prefabs[prefabUuid].changed = true;
			// 	}
			// };
			// document.getElementById("inspectorCenterModelOrigin").addEventListener("click", inspectorCenterModelOrigin, false);

			// Change functionality
			let inspectorChangeFunction = function() {
				if (inspector.selected) {
					inspector.selected.setFunctionality(this.value);

					let rotationInputs = inspector.elements.transform.input.rotate;

					if(this.value === "startarea") {
						rotationInputs.x.value = 0;
						rotationInputs.y.value = 0;
						rotationInputs.z.value = 0;

						rotationInputs.x.disabled = true;
						rotationInputs.y.disabled = true;
						rotationInputs.z.disabled = true;

						inspector.elements.shape.value = "box";
						inspector.elements.shape.disabled = true;
						inspectorChangeShape();
					} else {
						rotationInputs.x.disabled = false;
						rotationInputs.y.disabled = false;
						rotationInputs.z.disabled = false;
						inspector.elements.shape.disabled = false;
					}
				}
			};
			document.getElementById("inspectorFunction").addEventListener("change", inspectorChangeFunction, false);

			// Change collider shape (except terrain)
			let inspectorChangeShape = function() {
				if (inspector.selected) {
					//if shape == this.value, return?

					let shape = inspector.elements.shape.value;
					inspector.selected.setShape(shape);

					// Reset values
					inspector.elements.shapeProperties.input.width.value = 1;
					inspector.elements.shapeProperties.input.height.value = 1;
					inspector.elements.shapeProperties.input.depth.value = 1;
					inspector.elements.shapeProperties.input.radius.value = 1;

					document.getElementById("shapeProperties").className = `shapeProperties colliderProperty ${shape}`;
				}
			};
			inspector.elements.shape.addEventListener("change", inspectorChangeShape, false);

			// TODO: Proper non-primitive collider support will be added later
			// Change collider shape to terrain
			// let inspectorShapeTerrain = function() {
			// 	if (inspector.selected) {
			// 		let uuid = inspector.selected.dataset.uuid;
			// 		let prefabUuid = inspector.selected.dataset.prefabUuid;

			// 		let file = this.files[0];
			// 		let reader = new FileReader();
			// 		let loader = new THREE.OBJLoader();

			// 		reader.onload = function() {
			// 			let result = reader.result;
			// 			let object3d = loader.parse( result );
			// 			object3d.children[0].geometry.computeBoundingBox();
			// 			object3d.children[0].geometry.center();

			// 			prefabsTab.prefabs[prefabUuid].entities[uuid].sceneObject.geometry =
			// 				prefabsTab.prefabs[prefabUuid].entities[uuid].terrainGeometry =
			// 				object3d.children[0].geometry;
			// 		};

			// 		reader.readAsText(file, "utf-8");
			// 	}
			// };
			// document.getElementById("terPhysics").addEventListener("change", inspectorShapeTerrain, false);

			//

			// Change transform
			let transformElements = inspector.elements.transform;
			let transformFunctions = {};

			// Translation
			transformFunctions.translate = function(axis, value) {
				let position = inspector.selected.getPosition();
				position[axis] = parseFloat(value);
				inspector.selected.setPosition(position);
			};

			// Scale
			transformFunctions.scale = function(axis, value) {
				let scale = inspector.selected.getScale();
				scale[axis] = parseFloat(value);
				inspector.selected.setScale(scale);
			};

			// Rotate
			transformFunctions.rotate = function() {
				let rotation = inspector.elements.transform.input.rotate;
				inspector.selected.setRotation(new THREE.Euler(
					parseFloat(rotation.x.value) * Math.PI / 180,
					parseFloat(rotation.y.value) * Math.PI / 180,
					parseFloat(rotation.z.value) * Math.PI / 180,
					"XYZ"));
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

			let shapeChangeFunctions = {};

			// Width
			shapeChangeFunctions.width = function() {
				inspector.selected.setWidth(parseFloat(inspector.elements.shapeProperties.input.width.value));
			};

			// Height
			shapeChangeFunctions.height = function() {
				inspector.selected.setHeight(parseFloat(inspector.elements.shapeProperties.input.height.value));
			};

			// Depth
			shapeChangeFunctions.depth = function() {
				inspector.selected.setDepth(parseFloat(inspector.elements.shapeProperties.input.depth.value));
			};

			// Radius
			shapeChangeFunctions.radius = function() {
				inspector.selected.setRadius(parseFloat(inspector.elements.shapeProperties.input.radius.value));
			};

			// Input
			for (let key in inspector.elements.shapeProperties.input) {
				let el = inspector.elements.shapeProperties.input[key];
				let func = shapeChangeFunctions[key];
				el.addEventListener("change", function() { func(); }, false);
				el.addEventListener("input", function() { func(); }, false);
			}

			// Label
			for (let key in inspector.elements.shapeProperties.label) {
				let el = inspector.elements.shapeProperties.label[key];
				let func = shapeChangeFunctions[key];
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
		},


		select: function(selected) {
			if (inspector.selected === null) { // Nothing selected so inspector is in disabled state
				for (let el of inspector.inputs) {
					el.disabled = false;
				}
			} else {
				inspector.selected.element.className = inspector.selected.element.className.split(" ")[0]; // ew
			}

			inspector.selected = selected;

			inspector.element.className = `${selected.element.className}Selection`;

			document.getElementById("inspectorName").value = selected.name;
			document.getElementById("inspectorUUID").value = selected.uuid;

			let transformElements = inspector.elements.transform;

			let sceneObject = selected.sceneObject;

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

			if (selected.type === "Object" && selected.model) document.getElementById("inspectorModelList").value = selected.model;

			// If a collider shape is selected, fill the inputs with the appropriate values
			if (selected.type === "Collider") {
				let colliderData = selected.colliderData;

				inspector.elements.shape.value = colliderData.shape;
				inspector.element.getElementsByClassName("shapeProperties")[0].className =
					`shapeProperties colliderProperty ${colliderData.shape}`;

				inspector.elements.shapeProperties.input.radius.value = 1;
				inspector.elements.shapeProperties.input.width.value  = 1;
				inspector.elements.shapeProperties.input.height.value = 1;
				inspector.elements.shapeProperties.input.depth.value  = 1;

				if("radius" in colliderData) inspector.elements.shapeProperties.input.radius.value = colliderData.radius;
				if("width" in colliderData) inspector.elements.shapeProperties.input.width.value = colliderData.width;
				if("height" in colliderData) inspector.elements.shapeProperties.input.height.value = colliderData.height;
				if("depth" in colliderData) inspector.elements.shapeProperties.input.depth.value = colliderData.depth;
			}

			document.getElementById("inspectorFunction").value = selected.functionality;
			// Disable rotations for startarea
			if (selected.functionality === "startarea") {
				inspector.disabled.rotation(true);
				inspector.disabled.shape(true);
			}

			// TODO: Possibly enable this once "functionality" functionality (mwaha) is clearly defined
			// Check if the root prefab contains a starting area, and disable the rotation based on that.
			// if (type === "instances") {
			// 	let containsStart = Object.keys( prefabsTab.prefabs[prefabUuid].entities ).some(
			// 		(key)=>{
			// 			let userData = prefabsTab.prefabs[prefabUuid].entities[key].sceneObject.userData;
			// 			return (userData.functionality && userData.functionality === "startarea");
			// 		}
			// 	);
			// 	if (containsStart) inspector.disabled.rotation(true);
			// }

			selected.element.className += " selected";
		},
		deselect: function() {
			if (inspector.selected) inspector.selected.element.className = inspector.selected.element.className.split(" ")[0]; // ew
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
		}
	};
}();

export { inspector };
