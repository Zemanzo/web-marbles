import * as THREE from "three";
import "three/examples/js/loaders/GLTFLoader";
import { editorLog } from "./log";
import { projectTab } from "./project";
import { scene } from "./render";
import "three/examples/js/QuickHull";
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

	// Add to scene
	modelsTab.group.add(this.sceneObject);
	this.sceneObject.visible = false;

	// Deep clone for editor
	this.element = document.getElementById("modelTemplate").cloneNode(true);

	// Add to model list
	this.element.id = name;
	this.element.getElementsByClassName("name")[0].innerHTML = name;
	this.element.getElementsByClassName("name")[0].addEventListener("mousedown", function() {
		modelsTab.select(name);
	}, false);

	// Delete model button
	this.element.getElementsByClassName("delete")[0].addEventListener("click", () => {
		let prefabText = "";
		if(Object.keys(this.prefabEntities).length > 0) {
			// This is quite a silly unique prefab counter isn't it?
			let uniquePrefabs = {};
			for(let key in this.prefabEntities) {
				uniquePrefabs[this.prefabEntities[key].parent.uuid] = {};
			}
			let entityCount = Object.keys(this.prefabEntities).length;
			let prefabCount = Object.keys(uniquePrefabs).length;
			prefabText = `\nThis will alter ${entityCount} object${entityCount === 1 ? "" : "s"} in ${prefabCount} prefab${prefabCount === 1 ? "" : "s"}!`;
		}

		if( confirm(`Are you sure you want to delete model ${name}?${prefabText}`) ) {
			modelsTab.removeModel(name);
		}
	}, false);

	// Add to DOM
	this.element = document.getElementById("models").appendChild(this.element);
}

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
		}
	}
	return this.concaveGeo;
};


let modelsTab = function() {
	let _GLTFLoader = null;
	let _selectedModel = null;

	return {
		models: {},
		group: null,

		initialize: function() {
			_GLTFLoader = new THREE.GLTFLoader();
			this.group = new THREE.Group();
			scene.add(this.group);
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
						let project = projectTab.activeProject.addModel(file.name, file.reader.result);
						modelsTab.loadModel(file.name, file.reader.result, project);
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
			if (_selectedModel) {
				_selectedModel.sceneObject.visible = false;
				_selectedModel.element.className = "model";
			}
			_selectedModel = modelsTab.models[name];
			_selectedModel.sceneObject.visible = true;
			_selectedModel.element.className = "model selected";
		},

		deselect: function() {
			if(_selectedModel) {
				_selectedModel.sceneObject.visible = false;
				_selectedModel.element.className = "model";
			}
			_selectedModel = null;
		},

		// Loads the model into the editor, adds it to the project if isNewModel is true
		loadModel: function(modelName, fileContents, project) {
			let promise = new Promise( (resolve, reject) => {
				try {
					_GLTFLoader.parse(fileContents, null,
						function(model) {
							modelsTab.models[modelName] = new Model(modelName, model.scene, project);
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

		removeModel: function(name) {
			if(name in this.models === false) {
				console.log(`Attempted to remove model ${name}, but no such model exists!`);
			}

			// Deselect
			if (_selectedModel === name) this.deselect();

			let thisModel = this.models[name];

			// Remove from scene group
			modelsTab.group.remove(thisModel.sceneObject);

			// Remove from all prefab objects currently using this model
			while(Object.keys(thisModel.prefabEntities).length > 0) {
				thisModel.prefabEntities[Object.keys(thisModel.prefabEntities)[0]].setModel(null);
			}

			// Remove from editor
			thisModel.element.parentNode.removeChild(thisModel.element);
			delete this.models[name];

			// Remove from project
			delete projectTab.activeProject.models[name];

			editorLog(`Removed model: ${name}`, "info");
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
