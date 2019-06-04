import * as THREE from "three";
import domReady from "../dom-ready";
import { inspector } from "./inspector";
import { texturesTab } from "./textures";
import { materialsTab } from "./materials";
import { modelsTab } from "./models";
import { prefabsTab } from "./prefabs";
import { worldTab } from "./world";
import { projectTab } from "./project";
import * as levelIO from "../../level/level-io";
import { setEditorLogElement } from "./log";
import { renderCore } from "../render/render-core";
import { levelManager } from "../level-manager";
import { marbleManager } from "../marble-manager";


// Object template used by prefabObject, prefabCollider, and worldObject
function EditorObject(type, uuid, projectData) {
	this.type = type;
	this.uuid = uuid;
	this.name = null;
	this.sceneObject = null;
	this.element = null;
	this.projectData = projectData; // Refers to the project-side object
}

// Updates the sceneObject's transform based on the loaded project, if it exists
// This should be called after a sceneObject has been created
EditorObject.prototype.updateTransformFromProject = function() {
	if(this.projectData.position) {
		this.setPosition( new THREE.Vector3(
			typeof this.projectData.position.x === "number" ? this.projectData.position.x : 0,
			typeof this.projectData.position.y === "number" ? this.projectData.position.y : 0,
			typeof this.projectData.position.z === "number" ? this.projectData.position.z : 0) );
	} else {
		this.projectData.position = {x: 0, y: 0, z: 0};
	}
	if(this.projectData.rotation
		&& typeof this.projectData.rotation.x === "number"
		&& typeof this.projectData.rotation.y === "number"
		&& typeof this.projectData.rotation.z === "number"
		&& typeof this.projectData.rotation.w === "number") {
		this.sceneObject.quaternion.copy(new THREE.Quaternion(this.projectData.rotation.x, this.projectData.rotation.y, this.projectData.rotation.z, this.projectData.rotation.w));
	} else {
		this.projectData.rotation = {x: 0, y: 0, z: 0, w: 1};
	}
	if(this.projectData.scale) {
		this.setScale( new THREE.Vector3(
			typeof this.projectData.scale.x === "number" ? this.projectData.scale.x : 1,
			typeof this.projectData.scale.y === "number" ? this.projectData.scale.y : 1,
			typeof this.projectData.scale.z === "number" ? this.projectData.scale.z : 1) );
	} else {
		this.projectData.scale = {x: 1, y: 1, z: 1};
	}
};

EditorObject.prototype.getPosition = function() {
	return this.sceneObject.position.clone();
};

EditorObject.prototype.setPosition = function(position) {
	this.sceneObject.position.copy(position);
	this.projectData.position = {
		x: position.x,
		y: position.y,
		z: position.z
	};
};

// Returns rotation in euler angles (rad)
EditorObject.prototype.getRotation = function() {
	return this.sceneObject.rotation.clone();
};

// Sets rotation in euler angles (rad)
EditorObject.prototype.setRotation = function(rotation) {
	this.sceneObject.rotation.copy(rotation);
	this.projectData.rotation = {
		x: this.sceneObject.quaternion.x,
		y: this.sceneObject.quaternion.y,
		z: this.sceneObject.quaternion.z,
		w: this.sceneObject.quaternion.w
	};
};

EditorObject.prototype.getScale = function() {
	return this.sceneObject.scale.clone();
};

EditorObject.prototype.setScale = function(scale) {
	this.sceneObject.scale.copy(scale);
	this.projectData.scale = {
		x: scale.x,
		y: scale.y,
		z: scale.z
	};
};

EditorObject.prototype.setName = function(name) {
	this.name = name;
	this.projectData.name = name;
	this.element.getElementsByClassName("name")[0].innerText = name;
};


let editor = function() {
	let _activeTab = 2;

	return {
		elements: {
			inspector: null
		},
		menu: {
			overflowTimeout: null
		},

		initialize: function() {
			this.elements.inspector = document.getElementById("inspector");

			setEditorLogElement( document.getElementById("log") );

			projectTab.initialize();
			inspector.initialize();
			texturesTab.initialize();
			materialsTab.initialize();
			modelsTab.initialize();
			prefabsTab.initialize();
			worldTab.initialize();

			renderCore.updateCallback = this.update;

			// Update version number
			document.getElementById("editorVersion").innerHTML = `v${levelIO.getCurrentVersion()}`;

			// Menu
			let childValue = 0;
			for (let child of document.getElementById("menuOptions").children) {
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

					if (parseInt(this.dataset.nthChild) >= 4) {
						editor.elements.inspector.style.transform = "translateX(100%)";
						editor.elements.inspector.style.minHeight = "120px";
						if (editor.menu.overflowTimeout) clearTimeout(editor.menu.overflowTimeout);
						document.getElementById("prefabs").style.overflow = "visible";
					} else {
						editor.elements.inspector.style.transform = "translateX(0%)";
						editor.elements.inspector.style.minHeight = "210px";
						editor.menu.overflowTimeout = setTimeout(function() {
							document.getElementById("prefabs").style.overflow = "auto";
						}, 400);
					}

					inspector.deselect();

					switch (_activeTab) {
					case 0:
						texturesTab.onTabInactive();
						break;
					case 1:
						materialsTab.onTabInactive();
						break;
					case 2:
						modelsTab.onTabInactive();
						break;
					case 3:
						prefabsTab.onTabInactive();
						break;
					case 4:
						worldTab.onTabInactive();
						break;
					case 5:
						projectTab.onTabInactive();
						break;
					case 6:
						// Editor settings tab
						break;
					default:
						console.error(`Attempted to deactive unknown tab with id ${_activeTab}`);
					}

					switch (parseInt(this.dataset.nthChild)) {
					case 0:
						texturesTab.onTabActive();
						break;
					case 1:
						materialsTab.onTabActive();
						break;
					case 2:
						modelsTab.onTabActive();
						break;
					case 3:
						prefabsTab.onTabActive();
						break;
					case 4:
						worldTab.onTabActive();
						break;
					case 5:
						projectTab.onTabActive();
						break;
					case 6:
						// Editor settings tab
						break;
					default:
						console.error(`Attempted to switch to unknown tab ${parseInt(this.dataset.nthChild)}`);
					}

					_activeTab = parseInt(this.dataset.nthChild);
				}, false);
			}

			// Models tab is the active tab on load
			document.getElementById("properties").firstElementChild.style.marginLeft = "-200%";
			modelsTab.onTabActive();
		},

		update: function(deltaTime) {
			levelManager.activeLevel.update(deltaTime);
		}
	};
}();


// Editor core initialization
renderCore.initialize();
levelManager.initialize();
marbleManager.initialize();

// Add visual helpers to level
let gridHelper = new THREE.GridHelper(20, 20);
levelManager.activeLevel.scene.add(gridHelper);
gridHelper.position.y = -.01;
let axesHelper = new THREE.AxesHelper(3);
levelManager.activeLevel.scene.add(axesHelper);

// Initialize DOM elements and tabs
domReady.then( () => {editor.initialize();} );

window.addEventListener("beforeunload", function(e) {
	e.returnValue = "Leave? You might lose unsaved changes!";
	return e.returnValue;
});

export { editor, EditorObject };
