import * as THREE from "three";
import "three/examples/js/loaders/GLTFLoader";
import { editorLog } from "./log";
import { projectTab } from "./project";
import { levelManager } from "../level-manager";
import { materialsTab } from "./materials";
import "three/examples/js/math/ConvexHull";
import "three/examples/js/geometries/ConvexGeometry";

// model object
function Model(name, sceneObject, projectData) {
	this.name = name;
	this.sceneObject = sceneObject;
	this.projectData = projectData; // Project reference for this model
	this.sceneObject.rotation.order = "YXZ";
	this.convexHull = null; // For colliders. null - not generated, false - invalid
	this.concaveGeo = null; // For colliders. null - not generated, false - invalid
	this.element = null;
	this.prefabEntities = {};
	this.childMeshes = [];
	this.changed = false;

	// Add to scene
	modelsTab.group.add(this.sceneObject);
	this.sceneObject.visible = false;

	// Deep clone for editor
	this.element = document.getElementById("modelTemplate").cloneNode(true);
	this.element.classList.remove("itemTemplate");

	// Add to model list
	this.element.id = name;
	this.element.getElementsByClassName("itemName")[0].innerHTML = name;
	this.element.getElementsByClassName("showItem")[0].addEventListener("mousedown", function() {
		modelsTab.select(name);
	}, false);

	// List model children
	let childMeshes = _getChildMeshes(this.sceneObject);
	for (let i = 0; i < childMeshes.length; i++) {
		if (!this.projectData.childMeshes[i]) {
			this.projectData.childMeshes[i] = { material: null };
		}
		this.childMeshes.push(
			new ChildMesh(childMeshes[i], this, this.projectData.childMeshes[i])
		);
	}

	// Add collapse functionality
	let self = this;
	this.element.getElementsByClassName("collapse")[0].addEventListener("click", function() { self.toggleCollapse(); }, false);

	// Delete model button
	this.element.getElementsByClassName("delete")[0].addEventListener("click", function() {
		let prefabText = "";
		if(Object.keys(self.prefabEntities).length > 0) {
			// This is quite a silly unique prefab counter isn't it?
			let uniquePrefabs = {};
			for (let key in self.prefabEntities) {
				uniquePrefabs[self.prefabEntities[key].parent.uuid] = {};
			}
			let entityCount = Object.keys(self.prefabEntities).length;
			let prefabCount = Object.keys(uniquePrefabs).length;
			prefabText = `\nThis will alter ${entityCount} object${entityCount === 1 ? "" : "s"} in ${prefabCount} prefab${prefabCount === 1 ? "" : "s"}!`;
		}

		if( confirm(`Are you sure you want to delete model ${name}?${prefabText}`) ) {
			self.delete();
		}
	}, false);

	// Add to DOM
	this.element = document.getElementById("models").appendChild(this.element);
}

Model.prototype.show = function() {
	this.sceneObject.visible = true;
	this.element.classList.add("selected");
	this.element.getElementsByClassName("showItem")[0].children[0].className = "icon-eye";
};

Model.prototype.hide = function() {
	this.sceneObject.visible = false;
	this.element.classList.remove("selected");
	this.element.getElementsByClassName("showItem")[0].children[0].className = "icon-eye-off";
};

Model.prototype.toggleCollapse = function() {
	this.element.getElementsByClassName("collapse")[0].children[0].classList.toggle("rotated");
	this.element.classList.toggle("collapsed");
};

Model.prototype.delete = function() {
	// Deselect
	this.hide();

	// Remove from scene group
	modelsTab.group.remove(this.sceneObject);

	// Remove from all prefab objects currently using this model
	while (Object.keys(this.prefabEntities).length > 0) {
		this.prefabEntities[Object.keys(this.prefabEntities)[0]].setModel(null);
	}

	// Remove from editor
	this.element.parentNode.removeChild(this.element);
	delete modelsTab.models[this.name];

	// Remove from project
	delete projectTab.activeProject.models[this.name];

	editorLog(`Removed model: ${this.name}`, "info");
};

// Recursive function: Returns an array of all vertices of this 3D object and any child objects.
// Vertices are in world space.
function _getVertices(obj) {
	let vertexArray = [];

	// obj.matrix isn't guaranteed to be up-to-date
	let matrix = new THREE.Matrix4();
	matrix = matrix.compose(obj.position, obj.quaternion, obj.scale);

	// Add own vertices if they exist
	if(obj.type === "Mesh") {
		let vertexData = obj.geometry.attributes.position;
		for(let i = 0; i < vertexData.count; i++) {
			let point = new THREE.Vector3(
				vertexData.array[i * 3],
				vertexData.array[i * 3 + 1],
				vertexData.array[i * 3 + 2]);
			point.applyMatrix4(matrix);
			vertexArray.push(point);
		}
	}

	// Add any vertices of child objects
	for(let c = 0; c < obj.children.length; c++) {
		let childVertices = _getVertices(obj.children[c]);

		// Multiply by this object's local matrix to get it in parent's space
		for(let i = 0; i < childVertices.length; i++) {
			vertexArray.push( childVertices[i].applyMatrix4(matrix) );
		}
	}
	return vertexArray;
}

// Returns a convex hull of the model as Geometry. Generates one if it does not yet exist.
// Returns false on failure.
Model.prototype.getConvexHull = function() {
	if(this.convexHull === null) {
		try {
			let vertexArray = _getVertices(this.sceneObject);
			this.convexHull = new THREE.ConvexGeometry(vertexArray); // Could throw an error if input is not valid
			if(this.convexHull) {
				this.projectData.convexData = [];
				for(let i = 0; i < this.convexHull.vertices.length; i++) {
					this.projectData.convexData.push(this.convexHull.vertices[i].x);
					this.projectData.convexData.push(this.convexHull.vertices[i].y);
					this.projectData.convexData.push(this.convexHull.vertices[i].z);
				}
				this.convexHull = new THREE.BufferGeometry().fromGeometry(this.convexHull);
			} else {
				this.convexHull = false;
			}
		} catch(error) {
			editorLog(`Failed to generate convex hull for ${this.name}: ${error}`);
			this.convexHull = false;
		}
	}
	return this.convexHull;
};

// Recursive function: Returns one Geometry object of all combined geometries within the passed object
function _combineGeometry(obj) {
	let geo = new THREE.Geometry();

	// obj.matrix isn't guaranteed to be up-to-date
	let matrix = new THREE.Matrix4().identity();
	matrix = matrix.compose(obj.position, obj.quaternion, obj.scale);

	if(obj.type === "Mesh") {
		let objGeo = obj.geometry;
		// BufferGeometry needs to be converted before merging
		if(objGeo.type === "BufferGeometry") {
			objGeo = new THREE.Geometry().fromBufferGeometry(objGeo);
		}
		objGeo.mergeVertices(); // Never hurts, right?
		geo.merge(objGeo, matrix);
	}

	for(let c = 0; c < obj.children.length; c++) {
		let childGeo = _combineGeometry(obj.children[c]);
		geo.merge(childGeo, matrix);
	}

	return geo;
}

// Returns the model as one piece of geometry, to be used for colliders. Generates one if it does not yet exist.
// Returns false on failure. (Or does it? Dun dun duuuuun)
Model.prototype.getConcaveGeometry = function() {
	if(this.concaveGeo === null) {
		this.concaveGeo = _combineGeometry(this.sceneObject);
		if(this.concaveGeo) {
			this.projectData.concaveData = {
				vertices: [],
				indices: []
			};
			for(let i = 0; i < this.concaveGeo.vertices.length; i++) {
				this.projectData.concaveData.vertices.push(this.concaveGeo.vertices[i].x);
				this.projectData.concaveData.vertices.push(this.concaveGeo.vertices[i].y);
				this.projectData.concaveData.vertices.push(this.concaveGeo.vertices[i].z);
			}
			for(let i = 0; i < this.concaveGeo.faces.length; i++) {
				this.projectData.concaveData.indices.push(this.concaveGeo.faces[i].a);
				this.projectData.concaveData.indices.push(this.concaveGeo.faces[i].b);
				this.projectData.concaveData.indices.push(this.concaveGeo.faces[i].c);
			}
			this.concaveGeo = new THREE.BufferGeometry().fromGeometry(this.concaveGeo);
		} else {
			this.concaveGeo = false;
		}
	}
	return this.concaveGeo;
};

function ChildMesh(mesh, parent, projectData) {
	this.mesh = mesh;
	this.parent = parent;
	this.projectData = projectData;

	this.element = document.createElement("div");
	let self = this;

	// Element that has information about the child mesh
	this.element.className = "childMesh";

	// Element for the child mesh name
	let childElementName = document.createElement("div");
	childElementName.innerText = mesh.name;

	// Element that allows selecting a custom material;
	this.selectElement = document.createElement("select");

	// Store the original material in case we'd want to switch back
	this.originalMaterial = mesh.material.clone();

	// Add options, starting with default
	let optionElement = document.createElement("option");
	optionElement.innerText = "Original";
	optionElement.style.fontStyle = "italic";
	optionElement.selected = true;
	optionElement.addEventListener("click", function() { self.setMaterial(); }, false);
	this.selectElement.add(optionElement);

	for (let materialUuid in materialsTab.materials) {
		let material = materialsTab.materials[materialUuid];
		optionElement = material.createOptionElement();
		if (this.projectData.material === materialUuid) {
			optionElement.selected = true;
		}
		optionElement.addEventListener("click", function() { self.setMaterial(materialUuid); }, false);
		this.selectElement.add(optionElement);
	}

	// Slap it all together
	this.element.appendChild(childElementName);
	this.element.appendChild(this.selectElement);
	this.parent.element.getElementsByClassName("itemDetails")[0].appendChild(this.element);
}

ChildMesh.prototype.setMaterial = function(materialUuid) {
	// If no material is provided, fall back to the original material.
	if (!materialUuid) {
		this.mesh.material = this.originalMaterial;
		this.projectData.material = null;
	} else {
		this.mesh.material = materialsTab.materials[materialUuid].compiledMaterial;
		this.projectData.material = materialUuid;
	}

	// Update prefabs
	for (let prefabEntity in this.parent.prefabEntities) {
		if (this.parent.prefabEntities[prefabEntity].type === "object") {
			this.parent.prefabEntities[prefabEntity].setModel(this.parent.name);
		}
	}
};

// Recursive function: Returns an array of all (child) meshes this 3D object has.
function _getChildMeshes(obj) {
	let children = [];

	// Add all objects that are of type Mesh
	if (obj.type === "Mesh") {
		children.push(obj);
	}

	// Add any child objects
	for (let c = 0; c < obj.children.length; c++) {
		children = children.concat(_getChildMeshes(obj.children[c]));
	}
	return children;
}


let modelsTab = function() {
	let _GLTFLoader = null;
	let _selectedModel = null;

	return {
		models: {},
		group: null,

		initialize: function() {
			_GLTFLoader = new THREE.GLTFLoader();
			this.group = new THREE.Group();
			levelManager.activeLevel.levelObjects.add(this.group);
			this.group.visible = false;

			// Add models button
			document.getElementById("addModel").addEventListener("click", function() {document.getElementById("addModelFile").click();}, false);
			document.getElementById("addModelFile").addEventListener("change", function() {
				Array.from(this.files).forEach(function(file) {
					// If a model with this file name already exists, don't load it
					if(file.name in projectTab.activeProject.models) {
						editorLog(`Model ${file.name} already loaded.`, "warn");
						return;
					}

					// Getting this message is a success, because you really did try. And you would've succeeded in breaking things!
					// Though chances are that you did not get this message in your log and found this code instead.
					// But not to worry! This nugget of pointless commentary is its own rewards. Congratulations!
					if(file.name === "null") {
						editorLog("Nice try.", "success");
						return;
					}

					file.reader = new FileReader();
					file.reader.onload = function() {
						// Attempt to load model and add it to the project
						let projectData = projectTab.activeProject.addModel(file.name, file.reader.result);
						modelsTab.loadModel(file.name, file.reader.result, projectData);
					};

					file.reader.onerror = function() {
						editorLog(`Unable to read model (${file.name}): ${file.reader.error.message}`, "error");
						file.reader.abort();
					};

					file.reader.readAsText(file, "utf-8");
				});
			}, false);
		},

		select: function(name) {
			// Deselect previously selected model, if applicable
			if (_selectedModel) {
				_selectedModel.hide();
			}

			// If it was the same model as before, set selectedModel to null
			if (_selectedModel === modelsTab.models[name]) {
				_selectedModel = null;
			} else {
				_selectedModel = modelsTab.models[name];
				_selectedModel.show();
			}
		},

		// Loads the model into the editor, adds it to the project if isNewModel is true
		loadModel: function(modelName, fileContents, project) {
			let promise = new Promise( (resolve, reject) => {
				try {
					_GLTFLoader.parse(fileContents, null,
						function(model) {
							modelsTab.models[modelName] = new Model(modelName, model.scene, project);
							modelsTab.select(modelName);
							editorLog(`Loaded model: ${modelName}`, "info");
							resolve("success");
						}, function(error) {
							editorLog(`Unable to load model (${modelName}): ${error}`, "error");
							console.log(error);
							delete projectTab.activeProject.models[modelName]; // Delete from project if not loadable
							reject("error");
						}
					);
				}
				catch(error) {
					// Invalid JSON/GLTF files may end up here
					editorLog(`Unable to load model (${name}): ${error}`, "error");
					console.log(error);
					delete projectTab.activeProject.models[modelName]; // Delete from project if not loadable
					reject("error");
				}
			} );

			return promise;
		},

		onTabActive: function() {
			modelsTab.group.visible = true;
		},

		onTabInactive: function() {
			modelsTab.group.visible = false;
		}

	};
}();

export { modelsTab };
