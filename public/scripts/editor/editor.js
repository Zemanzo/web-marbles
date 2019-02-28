import * as THREE from "three";
import "three/examples/js/loaders/GLTFLoader";
import { generateTinyUUID } from "../generateTinyUUID";
import * as inspector from "./inspector";
import { prefabs } from "./prefabs";
import { setEditorLogElement, editorLog } from "./log";
import { scene, init as renderInit, updateSun, water, sunParameters } from "./render";

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
	initialize: {},
	selectedModel: null,
	entityCount: 0
};

window.addEventListener("DOMContentLoaded", function() {
	editor.elements = {
		worldPrefab: document.getElementById("worldPrefab"),
		inspector: document.getElementById("inspector")
	};

	setEditorLogElement( document.getElementById("log") );

	inspector.initialize(editor);

	prefabs.initialize(editor);

	renderInit();

	// Editor groups
	for (let key in editor.groups) {
		editor.groups[key] = new THREE.Group();
		scene.add(editor.groups[key]);
		if (key !== "models") editor.groups[key].visible = false;
	}

	// Menu
	let childValue = 0;
	for (let child of document.getElementById("editorMode").children) {
		child.dataset.nthChild = childValue++;
		child.addEventListener("click", function() {
			let firstElement = document.getElementById("properties").firstElementChild;
			firstElement.style.marginLeft = `-${parseInt(this.dataset.nthChild) * 100 }%`;

			for (let c of this.parentNode.children) {
				c.className = "";
			}

			for (let key in editor.groups) {
				editor.groups[key].visible = false;
			}

			inspector.deselect();

			if (parseInt(this.dataset.nthChild) >= 2) {
				editor.elements.inspector.style.transform = "translateX(100%)";
				if (editor.menu.overflowTimeout) clearTimeout(editor.menu.overflowTimeout);
				document.getElementById("prefabs").style.overflow = "visible";
			} else {
				editor.elements.inspector.style.transform = "translateX(0%)";
				editor.menu.overflowTimeout = setTimeout(function() {
					document.getElementById("prefabs").style.overflow = "auto";
				}, 400);
			}

			if (parseInt(this.dataset.nthChild) === 2) { // World
				for (let uuid in editor.prefabs) {
					if (editor.prefabs[uuid].changed) {
						// update prefab

						let containsStart = Object.keys( editor.prefabs[uuid].entities ).some(
							(key)=>{
								let userData = editor.prefabs[uuid].entities[key].sceneObject.userData;
								return (userData.functionality && userData.functionality === "startarea");
							}
						);

						for (let key in editor.prefabs[uuid].instances) {
							let instance = editor.prefabs[uuid].instances[key];
							let old = instance.sceneObject;

							let clone = editor.prefabs[uuid].group.clone();

							clone.position.copy(old.position);

							if (containsStart) {
								clone.rotation.setFromVector3( new THREE.Vector3(0, 0, 0) );
							} else {
								clone.rotation.copy(old.rotation);
							}

							old.parent.add(clone);

							old.parent.remove(old);

							instance.sceneObject = clone;
							instance.sceneObject.visible = true; // Do not copy visibility setting from prefab
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

	// World

	// Change water level
	let changeWaterLevel = function() {
		water.position.y = this.value;
	};
	document.getElementById("envWaterHeight").addEventListener("change", changeWaterLevel, false);
	document.getElementById("envWaterHeight").addEventListener("input", changeWaterLevel, false);

	// Change sun inclination
	let changeSunInclination = function() {
		sunParameters.inclination = this.value;
		updateSun();
	};
	document.getElementById("envSunInclination").addEventListener("change", changeSunInclination, false);
	document.getElementById("envSunInclination").addEventListener("input", changeSunInclination, false);

	// Add world prefab
	let addWorldPrefab = function() {
		let prefabUuid = editor.elements.worldPrefab.value;
		if (
			!editor.elements.worldPrefab.disabled
			&& prefabUuid !== "null"
		) {
			let clone = document.getElementById("worldPrefabTemplate").cloneNode(true); // deep clone
			let uuid = generateTinyUUID();
			clone.removeAttribute("id");
			clone.dataset.uuid = uuid;
			clone.dataset.prefabUuid = prefabUuid;
			clone.dataset.type = "instances";

			// Add select event
			clone.addEventListener("click", inspector.select, false);

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
			let element = hierarchy.insertBefore(clone, document.getElementById("worldPrefabTemplate"));

			// Add instance reference to parent prefab
			editor.prefabs[prefabUuid].instances[uuid] = {
				uuid: uuid,
				sceneObject: groupClone,
				element: element
			};

		}
	};

	document.getElementById("worldAddPrefabButton").addEventListener("click", addWorldPrefab, false);

	let exportPublishBinary = function() {
		let serializationStart = new Date();
		editorLog(`Starting export! (${(new Date()) - serializationStart}ms)`);
		let payload = editor.serialization.preparePayload();
		editorLog(`- Payload perpared (${(new Date()) - serializationStart}ms)`);
		editor.serialization.worker.postMessage({
			type: "exportPublishBinary",
			payload: payload,
			serializationStart: serializationStart
		});
	};

	document.getElementById("exportPublishBinary").addEventListener("click", exportPublishBinary, false);

	let exportPublishPlain = function() {
		let serializationStart = new Date();
		editorLog(`Starting export! (${(new Date()) - serializationStart}ms)`);
		let payload = editor.serialization.preparePayload();
		editorLog(`- Payload perpared (${(new Date()) - serializationStart}ms)`);
		editor.serialization.worker.postMessage({
			type: "exportPublishPlain",
			payload: payload,
			serializationStart: serializationStart
		});
	};

	document.getElementById("exportPublishPlain").addEventListener("click", exportPublishPlain, false);
}, false);

// Spawn serialization worker
editor.serialization = {};
editor.serialization.worker = new Worker("scripts/editor/serialize_worker.js");
editor.serialization.preparePayload = function() {

	// Recreate necessary object structure so it can be "deep cloned"
	let prefabs = {};
	for (let key in editor.prefabs) {
		prefabs[key] = {
			group: editor.prefabs[key].group.toJSON(),
			uuid: key,
			entities: {}
		};

		for (let entity in editor.prefabs[key].entities) {
			prefabs[key].entities[entity] = {
				sceneObject: editor.prefabs[key].entities[entity].sceneObject.toJSON(),
				model: editor.prefabs[key].entities[entity].model,
				shape: editor.prefabs[key].entities[entity].shape
			};
		}

		for (let instance in prefabs[key].instances) {
			prefabs[key].instances[instance] = {
				sceneObject: editor.prefabs[key].instances[instance].sceneObject.toJSON(),
				uuid: instance
			};
		}
	}

	let models = {};
	for (let model in editor.models) {
		models[model] = {
			scene: editor.models[model].scene.toJSON(),
			userData: {}
		};

		for (let key in editor.models[model].userData) {
			models[model].userData[key] = editor.models[model].userData[key];
		}
	}

	console.log(editor.models, models);

	let payload = {
		params: {
			title: document.getElementById("paramMapName").value,
			author: document.getElementById("paramAuthorName").value,
			enterPeriod: document.getElementById("paramEnterPeriod").value,
			maxRoundLength: document.getElementById("paramMaxRoundLength").value,
			waitAfterFinish: document.getElementById("paramWaitAfterFinish").value
		},
		models: models,
		prefabs: prefabs
	};

	return payload;
};

editor.serialization.worker.onmessage = function(message) {
	let a;
	switch(message.data.type) {
	case "log":
		editorLog(message.data.payload.message, message.data.payload.type);
		break;
	case "publishSuccess":
		a = document.createElement("a");
		a.href = message.data.payload.url;
		a.download = message.data.payload.filename;
		a.click();
		break;
	default:
		console.log("Unknown worker message", message);
		break;
	}
};

window.onbeforeunload = function(e) {
	let dialogText = "Leave? You might lose unsaved changes!";
	e.returnValue = dialogText;
	return dialogText;
};
