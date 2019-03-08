import * as THREE from "three";
import * as inspector from "./inspector";
import { models } from "./models";
import { prefabs } from "./prefabs";
import { world } from "./world";
import { Project } from "./project";
import { setEditorLogElement, editorLog } from "./log";
import { scene, init as renderInit } from "./render";

let editor = {
	project: undefined,
	menu: {},
	groups: {
		models: undefined,
		prefabs: undefined,
		world: undefined
	},
	models: undefined,
	prefabs: {},
	world: undefined,
	inspector: undefined,
	selectedModel: null,
	entityCount: 0
};

window.addEventListener("DOMContentLoaded", function() {
	editor.elements = {
		worldPrefab: document.getElementById("worldPrefab"),
		inspector: document.getElementById("inspector")
	};

	setEditorLogElement( document.getElementById("log") );

	editor.project = new Project();

	inspector.initialize(editor);

	renderInit();
	
	models.initialize(editor);

	prefabs.initialize(editor);

	world.initialize(editor);

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

	// Serialisation
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
		if(typeof editor.models[model] === "function") continue; // Hotfix for something that's going to be replaced anyway!
		models[model] = {
			scene: editor.models[model].scene.toJSON(),
			userData: {}
		};

		for (let key in editor.models[model].userData) {
			models[model].userData[key] = editor.models[model].userData[key];
		}
	}

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
