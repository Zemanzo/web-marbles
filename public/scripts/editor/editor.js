import { inspector } from "./inspector";
import { modelsTab } from "./models";
import { prefabsTab } from "./prefabs";
import { worldTab } from "./world";
import { Project } from "./project";
import { setEditorLogElement, editorLog } from "./log";
import { initializeRenderer } from "./render";


// Object template used by prefabObject, prefabCollider, and worldObject
function EditorObject(type, uuid) {
	this.type = type;
	this.uuid = uuid;
	this.name = null;
	this.sceneObject = null;
	this.element = null;
}

EditorObject.prototype.getPosition = function() {
	return this.sceneObject.position.clone();
};

EditorObject.prototype.setPosition = function(position) {
	this.sceneObject.position.copy(position);
};

// Returns rotation in euler angles (rad)
EditorObject.prototype.getRotation = function() {
	return this.sceneObject.rotation.clone();
};

// Sets rotation in euler angles (rad)
EditorObject.prototype.setRotation = function(rotation) {
	this.sceneObject.rotation.copy(rotation);
};

EditorObject.prototype.getScale = function() {
	return this.sceneObject.scale.clone();
};

EditorObject.prototype.setScale = function(scale) {
	this.sceneObject.scale.copy(scale);
};

EditorObject.prototype.setName = function(name) {
	this.name = name;
	this.element.getElementsByClassName("name")[0].innerText = name;
};



let editor = function() {
	let _activeTab = 0;

	return {
		elements: {
			inspector: undefined
		},
		project: undefined,
		menu: {
			overflowTimeout: undefined
		},

		initialize: function() {
			this.elements.inspector = document.getElementById("inspector");

			setEditorLogElement( document.getElementById("log") );

			this.project = new Project();
			inspector.initialize();
			initializeRenderer();
			modelsTab.initialize();
			prefabsTab.initialize();
			worldTab.initialize();

			// Models tab is the active tab on load
			modelsTab.onTabActive();


			// Menu
			let childValue = 0;
			for (let child of document.getElementById("editorMode").children) {
				child.dataset.nthChild = childValue++;

				// Add click event for every tab
				child.addEventListener("click", function() {
					// Nothing changes if the active tab is clicked
					if(this.dataset.nthChild === _activeTab) {
						return;
					}

					// Update element class
					this.parentNode.children[_activeTab].className = "";
					this.className = "selected";


					// Transition effect
					let firstElement = document.getElementById("properties").firstElementChild;
					firstElement.style.marginLeft = `-${parseInt(this.dataset.nthChild) * 100 }%`;

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

					inspector.deselect();

					switch(_activeTab) {
					case 0:
						modelsTab.onTabInactive();
						break;
					case 1:
						prefabsTab.onTabInactive();
						break;
					case 2:
						worldTab.onTabInactive();
						break;
					case 3:
						// Project tab
						break;
					case 4:
						// Editor settings tab
						break;
					default:
						console.error(`Attempted to deactive unknown tab with id ${_activeTab}`);
					}
					
					switch(parseInt(this.dataset.nthChild)) {
					case 0:
						modelsTab.onTabActive();
						break;
					case 1:
						prefabsTab.onTabActive();
						break;
					case 2:
						worldTab.onTabActive();
						break;
					case 3:
						// Project tab
						break;
					case 4:
						// Editor settings tab
						break;
					default:
						console.error(`Attempted to switch to unknown tab ${parseInt(this.dataset.nthChild)}`);
					}

					_activeTab = parseInt(this.dataset.nthChild);
				}, false);
			}
		}
	};
}();

window.addEventListener("DOMContentLoaded", function() {

	editor.initialize();

	// TODO: Move this out to the project script?
	// Serialisation
	let exportPublishBinary = function() {
		let serializationStart = new Date();
		editorLog(`Starting export! (${(new Date()) - serializationStart}ms)`);
		let payload = editor.serialization.preparePayload();
		editorLog(`- Payload prepared (${(new Date()) - serializationStart}ms)`);
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
	for (let key in prefabsTab.prefabs) {
		prefabs[key] = {
			group: prefabsTab.prefabs[key].group.toJSON(),
			uuid: key,
			entities: {}
		};

		for (let entity in prefabsTab.prefabs[key].entities) {
			prefabs[key].entities[entity] = {
				sceneObject: prefabsTab.prefabs[key].entities[entity].sceneObject.toJSON(),
				model: prefabsTab.prefabs[key].entities[entity].model,
				shape: prefabsTab.prefabs[key].entities[entity].shape
			};
		}

		for (let instance in prefabs[key].instances) {
			prefabs[key].instances[instance] = {
				sceneObject: prefabsTab.prefabs[key].instances[instance].sceneObject.toJSON(),
				uuid: instance
			};
		}
	}

	let models = {};
	for (let model in modelsTab.models) {
		if(typeof modelsTab.models[model] === "function") continue; // Hotfix for something that's going to be replaced anyway!
		models[model] = {
			scene: modelsTab.models[model].scene.toJSON(),
			userData: {}
		};

		for (let key in modelsTab.models[model].userData) {
			models[model].userData[key] = modelsTab.models[model].userData[key];
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

export { editor, EditorObject };
