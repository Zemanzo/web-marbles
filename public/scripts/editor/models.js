import * as THREE from "three";
import "three/examples/js/loaders/GLTFLoader";
import { editorLog } from "./log";

let models = {},
	editor;

let GLTFLoader = new THREE.GLTFLoader();

models.initialize = function(global) {
	editor = global;
	editor.models = this;

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
				models.loadModel(file.name, file.reader.result, true);
			};

			file.reader.onerror = function() {
				editorLog(`Unable to read model (${file.name}): ${file.reader.error.message}`, "error");
				file.reader.abort();
			};

			file.reader.readAsText(file, "utf-8");
		});
	}, false);

};

// Loads the model into the editor, adds it to the project if isNewModel is true
models.loadModel = function(modelName, fileContents, isNewModel) {
	try {
		GLTFLoader.parse(fileContents, null,
			function(model) {

				// Deep clone for editor
				let clone = document.getElementById("modelTemplate").cloneNode(true);

				// Add model to editor data
				model.userData.name = modelName;
				editor.models[modelName] = {
					scene: model.scene,
					name: modelName,
					editorNode: clone
				};
				let thisModel = editor.models[modelName];

				// Add to scene
				editor.groups.models.add(thisModel.scene);
				thisModel.scene.visible = false;

				// Add to model list
				clone.id = modelName;
				clone.getElementsByClassName("name")[0].innerHTML = modelName;
				clone.getElementsByClassName("name")[0].addEventListener("mousedown", function() {
					if (editor.selectedModel) {
						editor.models[editor.selectedModel].scene.visible = false;
						document.getElementById(editor.selectedModel).className = "model";
					}
					editor.selectedModel = this.parentNode.id;
					editor.models[editor.selectedModel].scene.visible = true;
					document.getElementById(editor.selectedModel).className = "model selected";
				}, false);

				// Delete model button
				clone.getElementsByClassName("delete")[0].addEventListener("click", function() {
					let id = this.parentNode.id;

					// TODO: Mention references from prefabs if there are any
					if( confirm(`Are you sure you want to delete model (${id})?`) ) {
						models.removeModel(id);
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
};

models.removeModel = function(name) {
	if(name in editor.models === false) {
		console.log(`Attempted to remove model ${name}, but no such model exists!`);
	}

	// Deselect
	if (editor.selectedModel === name) editor.selectedModel = null;

	// Remove from scene group
	editor.groups.models.remove(editor.models[name].scene);
	
	// Remove from select drop-down (prefabs)
	let select = document.getElementById("inspectorModelList");
	let index = Array.from(select.children).findIndex((el)=>{
		return el.value === name;
	}, false);
	select.remove(index);

	// TODO: Remove from all prefabs currently using this model
	// I'll do this once prefabs has been refactored far enough

	// Remove from editor
	editor.models[name].editorNode.parentNode.removeChild(editor.models[name].editorNode);
	delete editor.models[name];

	// Remove from project
	delete editor.project.models[name];

	editorLog(`Removed model: ${name}`, "info");
};

export { models };
