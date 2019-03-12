import * as THREE from "three";
import "three/examples/js/loaders/GLTFLoader";
import { editorLog } from "./log";
import { editor } from "./editor";
import { scene } from "./render";


let modelsTab = function() {
	let _GLTFLoader = undefined;
	let _selectedModel = null;

	return {
		models: {},
		group: undefined,

		initialize: function() {
			_GLTFLoader = new THREE.GLTFLoader();
			this.group = new THREE.Group();
			scene.add(this.group);
			this.group.visible = false;

			// Add models button
			document.getElementById("addModelFile").addEventListener("change", function() {
				Array.from(this.files).forEach(function(file) {
					// If a model with this file name already exists, don't load it
					if(file.name in editor.project.models) {
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

		// Loads the model into the editor, adds it to the project if isNewModel is true
		loadModel: function(modelName, fileContents, isNewModel) {
			try {
				_GLTFLoader.parse(fileContents, null,
					function(model) {

						// Deep clone for editor
						let clone = document.getElementById("modelTemplate").cloneNode(true);

						// Add model to editor data
						model.userData.name = modelName;
						modelsTab.models[modelName] = {
							scene: model.scene,
							name: modelName,
							editorNode: clone
						};
						let thisModel = modelsTab.models[modelName];

						// Add to scene
						modelsTab.group.add(thisModel.scene);
						thisModel.scene.visible = false;

						// Add to model list
						clone.id = modelName;
						clone.getElementsByClassName("name")[0].innerHTML = modelName;
						clone.getElementsByClassName("name")[0].addEventListener("mousedown", function() {
							if (_selectedModel) {
								modelsTab.models[_selectedModel].scene.visible = false;
								document.getElementById(_selectedModel).className = "model";
							}
							_selectedModel = this.parentNode.id;
							modelsTab.models[_selectedModel].scene.visible = true;
							document.getElementById(_selectedModel).className = "model selected";
						}, false);

						// Delete model button
						clone.getElementsByClassName("delete")[0].addEventListener("click", function() {
							let id = this.parentNode.id;

							// TODO: Mention references from prefabs if there are any
							if( confirm(`Are you sure you want to delete model (${id})?`) ) {
								modelsTab.removeModel(id);
								delete editor.project.models[id];
							}
						}, false);

						// Add to select drop-down
						let select = document.getElementById("inspectorModelList");
						let option = document.createElement("option");
						option.text = modelName;
						option.value = modelName;
						select.add(option);

						// Add to DOM
						let modelList = document.getElementById("models");
						clone = modelList.appendChild(clone);

						editorLog(`Loaded model: ${modelName}`, "info");
						
						if(isNewModel) {
							editor.project.addModel(modelName, fileContents);
						}

					}, function(error) {
						editorLog(`Unable to load model (${modelName}): ${error}`, "error");
						console.log(error);
					}
				);
			}
			catch(error) {
				// Invalid JSON/GLTF files may end up here
				editorLog(`Unable to load model (${name}): ${error}`, "error");
				console.log(error);
			}
		},

		removeModel: function(name) {
			if(name in this.models === false) {
				console.log(`Attempted to remove model ${name}, but no such model exists!`);
			}
		
			// Deselect
			if (_selectedModel === name) _selectedModel = null;
		
			// Remove from scene group
			modelsTab.group.remove(this.models[name].scene);
			
			// Remove from select drop-down (prefabs)
			let select = document.getElementById("inspectorModelList");
			let index = Array.from(select.children).findIndex((el)=>{
				return el.value === name;
			}, false);
			select.remove(index);
		
			// TODO: Remove from all prefabs currently using this model
			// I'll do this once prefabs has been refactored far enough
		
			// Remove from editor
			this.models[name].editorNode.parentNode.removeChild(this.models[name].editorNode);
			delete this.models[name];
		
			// Remove from project
			delete editor.project.models[name];
		
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
