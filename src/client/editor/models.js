import * as THREE from "three";
import "three/examples/js/loaders/GLTFLoader";
import { editorLog } from "./log";
import { projectTab } from "./project";
import { scene } from "./render";

// model object
function Model(name, sceneObject) {
	this.name = name;
	this.sceneObject = sceneObject;
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
					if(file.name in projectTab.project.models) {
						editorLog(`Model ${file.name} already loaded.`, "warn");
						return;
					}

					file.reader = new FileReader();
					file.reader.onload = function() {
						// Attempt to load model and add it to the project
						modelsTab.loadModel(file.name, file.reader.result, true);
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
		loadModel: function(modelName, fileContents, isNewModel) {
			let promise = new Promise( (resolve, reject) => {
				try {
					_GLTFLoader.parse(fileContents, null,
						function(model) {
							modelsTab.models[modelName] = new Model(modelName, model.scene);

							editorLog(`Loaded model: ${modelName}`, "info");

							if(isNewModel) {
								projectTab.project.addModel(modelName, fileContents);
							}
							resolve("success");
						}, function(error) {
							editorLog(`Unable to load model (${modelName}): ${error}`, "error");
							console.log(error);
							reject("error");
						}
					);
				}
				catch(error) {
					// Invalid JSON/GLTF files may end up here
					editorLog(`Unable to load model (${name}): ${error}`, "error");
					console.log(error);
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
			delete projectTab.project.models[name];

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
