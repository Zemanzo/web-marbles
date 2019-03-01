import * as THREE from "three";
import "three/examples/js/loaders/GLTFLoader";
import { editorLog } from "./log";

let models = {},
	editor;

models.initialize = function(global) {
	editor = global;
	editor.models = this;

	
	// Add models
	let GLTFLoader = new THREE.GLTFLoader();
	document.getElementById("addModelFile").addEventListener("change", function() {
		Array.from(this.files).forEach(function(file) {
			file.reader = new FileReader();
			file.reader.onload = function() {
				let result = file.reader.result;

				// parse using your corresponding loader
				try {
					GLTFLoader.parse(
						result,	null,
						function(model) {
							model.userData.name = file.name;
							// Check if model is already loaded
							if (!Object
								.keys(editor.models)
								.some( (key) => {
									return key === file.name;
								} )
							) {
								// Add to model list
								let clone = document.getElementById("modelTemplate").cloneNode(true); // deep clone
								clone.id = file.name;
								clone.getElementsByClassName("name")[0].innerHTML = file.name;
								clone.getElementsByClassName("name")[0].addEventListener("mousedown", function() {
									if (editor.selectedModel) {
										editor.models[editor.selectedModel].scene.visible = false;
										document.getElementById(editor.selectedModel).className = "model";
									}
									editor.selectedModel = this.parentNode.id;
									editor.models[editor.selectedModel].scene.visible = true;
									document.getElementById(editor.selectedModel).className = "model selected";
								}, false);

								// Delete model
								clone.getElementsByClassName("delete")[0].addEventListener("click", function() {
									let parent = this.parentNode;
									let id = parent.id;
									if ( confirm(`Are you sure you want to delete this model? (${id})`) ) {
										if (editor.selectedModel === id) editor.selectedModel = null;
										editor.groups.models.remove(editor.models[id].scene);
										delete editor.models[id];
										let select = document.getElementById("inspectorModel");
										let index = Array.from(select.children).findIndex((el)=>{
											return el.value === id;
										}, false);
										select.remove(index);
										parent.parentNode.removeChild(parent); // oofies
										editorLog(`Removed model (${id})`, "warn");
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
								editorLog(`Loaded model: ${file.name}`, "info");
							} else {
								editorLog(`Model already loaded. (${file.name})`, "error");
							}
						}, function(error) {
							editorLog(`Unable to load model (${file.name}): ${error}`, "error");
							console.log(error);
						}
					);
				}
				catch(error) {
					// Invalid JSON/GLTF files may end up here
					editorLog(`Unable to load model (${file.name}): ${error}`, "error");
					console.log(error);
				}
			};
			file.reader.readAsText(file, "utf-8");
		});
	}, false);

};

export { models };
