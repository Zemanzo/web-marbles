import * as THREE from "three";
import { editorLog } from "./log";
import { texturesTab } from "./textures";
import { modelsTab } from "./models";
import { projectTab } from "./project";
import { generateTinyUUID } from "../generate-tiny-uuid";

let _defaultMaterial = new THREE.MeshStandardMaterial({ color: 0xff00ff });

// Material object
function Material(uuid, projectData) {
	this.uuid = uuid;
	this.projectData = projectData; // Project reference for this material

	// Related DOM elements
	this.element = document.getElementById("materialTemplate").cloneNode(true); // deep clone
	this.element.removeAttribute("id");
	this.element.classList.remove("itemTemplate");

	this.elements = {};
	this.elements.textarea = this.element.getElementsByTagName("textarea")[0];
	this.elements.itemName = this.element.getElementsByClassName("itemName")[0];

	// Load material-related data if it exists in the project
	if (this.projectData.name) {
		this.elements.itemName.value = this.name = this.projectData.name;
	} else {
		this.elements.itemName.value = this.name = this.projectData.name = "";
	}

	if (this.projectData.script) {
		this.elements.textarea.value = this.script = this.projectData.script;
	} else {
		this.elements.textarea.value = this.script = this.projectData.script = null;
	}

	// Array of option elements that are part of the model material selection
	this.optionElements = [];

	// Set a default material
	this.compiledMaterial = _defaultMaterial.clone();

	// Add events
	let self = this;
	this.elements.itemName.addEventListener("input", function() { self.onNameChange(this.value); }, false);
	this.elements.itemName.addEventListener("change", function() { self.onNameChange(this.value); }, false);
	this.element.getElementsByClassName("collapse")[0].addEventListener("click", function() { self.toggleCollapse(); }, false);
	this.element.getElementsByClassName("delete")[0].addEventListener("click", function() { self.delete(); }, false);
	this.element.getElementsByClassName("parse")[0].addEventListener("click", function() { self.parse(); }, false);
	this.elements.textarea.addEventListener("keydown", function(event) {
		if (event.key === "s" && event.ctrlKey) {
			event.preventDefault();
			self.parse();
		}
	}, false);

	// Display UUID
	this.element.getElementsByClassName("itemDetailsId")[0].innerHTML = uuid;

	// Add custom material options to each model childMesh
	this.element = materialsTab.elements.materialList.insertBefore(this.element, document.getElementById("addMaterial"));

	for (let name in modelsTab.models) {
		let model = modelsTab.models[name];
		for (let uuid in model.childMeshes) {
			let childMesh = model.childMeshes[uuid];
			let optionElement = this.createOptionElement();
			let self = this;

			optionElement.addEventListener("click", function() {
				childMesh.setMaterial(self.uuid);
			}, false);

			childMesh.selectElement.add(optionElement);
		}
	}
}

Material.prototype.parse = function(shouldLog = true) {
	// To restart the CSS animation
	this.elements.textarea.style.animationName = "";
	void this.elements.textarea.offsetWidth;

	try {
		this.projectData.script = this.script = this.elements.textarea.value;
		let compiledMaterial = Function("textures", "THREE", this.script)(texturesTab.textures, THREE);
		if (compiledMaterial instanceof THREE.Material) {
			this.compiledMaterial.copy(compiledMaterial);
			this.compiledMaterial.needsUpdate = true;
			if (shouldLog) {
				editorLog(`Succesfully parsed material script! (${this.name})`, "success");
			}
			this.elements.textarea.style.animationName = "parseSuccess";
		} else {
			throw "return value is not a valid THREE Material";
		}
	} catch (error) {
		this.compiledMaterial.copy(_defaultMaterial.clone());
		this.compiledMaterial.needsUpdate = true;
		if (shouldLog) {
			editorLog(`Failed to parse script. ${error}`, "error");
		}
		this.elements.textarea.style.animationName = "parseFailure";
	}
};

Material.prototype.onNameChange = function(name) {
	for (let element of this.optionElements) {
		element.innerText = name;
	}
	this.name = name;
	this.projectData.name = name;
};

Material.prototype.toggleCollapse = function() {
	this.element.getElementsByClassName("collapse")[0].children[0].classList.toggle("rotated");
	this.element.classList.toggle("collapsed");
};

Material.prototype.createOptionElement = function() {
	let optionElement = document.createElement("option");
	optionElement.className = `option-${this.uuid}`;
	optionElement.innerText = this.name;

	this.optionElements.push(optionElement);

	return optionElement;
};

Material.prototype.delete = function() {
	// Remove from model selects
	for (let element of this.optionElements) {
		element.parentNode.removeChild(element);
	}

	// Model child meshes that use this material should revert to using their original material
	for (let name in modelsTab.models) {
		let model = modelsTab.models[name];
		for (let childMeshUuid in model.childMeshes) {
			let childMesh = model.childMeshes[childMeshUuid];
			if (childMesh.mesh.material === this.compiledMaterial) {
				childMesh.setMaterial(childMesh.originalMaterial);
			}
		}
	}

	// Remove from editor
	this.element.parentNode.removeChild(this.element);
	delete materialsTab.materials[this.uuid];

	// Remove from project
	delete projectTab.activeProject.materials[this.name];
};

let materialsTab = function() {
	return {
		elements: {
			materialList: null
		},

		materials: {},

		initialize: function() {
			// Add to DOM
			materialsTab.elements.materialList = document.getElementById("materialList");

			document.getElementById("newMaterial").addEventListener("click", function() {
				let uuid = generateTinyUUID();
				let project = projectTab.activeProject.addMaterial(uuid);
				materialsTab.addMaterial(uuid, project);

				// Focus to name input so user can start typing right away
				materialsTab.materials[uuid].element.getElementsByClassName("itemName")[0].focus();
			}, false);
		},

		// Add a material with the provided uuid and project-side object
		addMaterial: function(uuid, project) {
			materialsTab.materials[uuid] = new Material(uuid, project);
		},

		onTabActive: function() {
			modelsTab.group.visible = true;
		},

		onTabInactive: function() {
			modelsTab.group.visible = false;
		}
	};
}();

export { materialsTab };
