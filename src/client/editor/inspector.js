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

			// Change functionality
			let inspectorChangeFunction = function() {
				if (inspector.selected) {
					inspector.selected.setFunctionality(this.value);

					if(this.value === "startarea") {
						inspector.elements.shape.disabled = true;
						if(inspector.selected.colliderData.shape !== "box") {
							inspector.elements.shape.value = "box";
							inspectorChangeShape();
						}
					} else {
						inspector.elements.shape.disabled = false;
					}
				}
			};
			document.getElementById("inspectorFunction").addEventListener("change", inspectorChangeFunction, false);

			// Change collider shape (except terrain)
			let inspectorChangeShape = function() {
				if (inspector.selected) {
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

			// Change transform
			let transformElements = inspector.elements.transform;
			let transformFunctions = {};

			// Translation
			transformFunctions.translate = function(axis, value) {
				let position = inspector.selected.getPosition();
				position[axis] = value;
				inspector.selected.setPosition(position);
			};

			// Scale
			transformFunctions.scale = function(axis, value) {
				let scale = inspector.selected.getScale();
				scale[axis] = value;
				inspector.selected.setScale(scale);
			};

			// Rotate
			transformFunctions.rotate = function(axis, value) {
				let rotation = inspector.selected.getRotation();
				rotation[axis] = value * Math.PI / 180;
				inspector.selected.setRotation(rotation);
			};

			// Attach event listeners to inputs and labels

			// Transform
			// Input
			for (let transform in transformElements.input) {
				for (let key in transformElements.input[transform]) {
					let el = transformElements.input[transform][key];
					let func = function() {
						let value = 0;
						if(el.checkValidity()) value = el.valueAsNumber;
						transformFunctions[transform](el.dataset.axis, value);
					};

					el.addEventListener("change", func, false);
					el.addEventListener("input", func, false);
				}
			}
			// Label
			for (let transform in transformElements.label) {
				for (let key in transformElements.label[transform]) {
					let el = transformElements.label[transform][key];
					let func = function() {
						let value = 0;
						if(el.previousElementSibling.checkValidity()) value = el.previousElementSibling.valueAsNumber;
						transformFunctions[transform](el.previousElementSibling.dataset.axis, value);
					};
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
			shapeChangeFunctions.width = function(value) {
				inspector.selected.setWidth(value);
			};

			// Height
			shapeChangeFunctions.height = function(value) {
				inspector.selected.setHeight(value);
			};

			// Depth
			shapeChangeFunctions.depth = function(value) {
				inspector.selected.setDepth(value);
			};

			// Radius
			shapeChangeFunctions.radius = function(value) {
				inspector.selected.setRadius(value);
			};

			// Input
			for (let key in inspector.elements.shapeProperties.input) {
				let el = inspector.elements.shapeProperties.input[key];

				let func = function() {
					let value = parseFloat(el.min);
					if(el.checkValidity()) value = el.valueAsNumber;
					shapeChangeFunctions[key](value);
				};

				el.addEventListener("change", func, false);
				el.addEventListener("input", func, false);
			}

			// Label
			for (let key in inspector.elements.shapeProperties.label) {
				let el = inspector.elements.shapeProperties.label[key];
				let func = function() {
					let value = parseFloat(el.previousElementSibling.min);
					if(el.previousElementSibling.checkValidity()) value = el.previousElementSibling.valueAsNumber;
					shapeChangeFunctions[key](value);
				};
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

			if (selected.type === "object" && selected.model) document.getElementById("inspectorModelList").value = selected.model;

			// If a collider shape is selected, fill the inputs with the appropriate values
			if (selected.type === "collider") {
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
			// Disable shape setting for startarea
			if (selected.functionality === "startarea") {
				inspector.disabled.shape(true);
			}

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
