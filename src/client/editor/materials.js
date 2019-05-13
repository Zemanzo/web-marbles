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

	// Load material-related data if it exists in the project
	if (this.projectData.name) {
		this.name = this.projectData.name;
	} else {
		this.name = this.projectData.name = "";
	}

	// Array of option elements that are part of the model material selection
	this.optionElements = [];

	// Set a default material
	this.compiledMaterial = _defaultMaterial.clone();

	this.element = document.getElementById("materialTemplate").cloneNode(true); // deep clone
	this.element.removeAttribute("id");
	this.element.classList.remove("itemTemplate");
	this.element.getElementsByClassName("itemName")[0].value = this.name;

	// Add events
	let self = this;
	this.element.getElementsByClassName("itemName")[0].addEventListener("input", function() { self.onNameChange(this.value); }, false);
	this.element.getElementsByClassName("itemName")[0].addEventListener("change", function() { self.onNameChange(this.value); }, false);
	this.element.getElementsByClassName("collapse")[0].addEventListener("click", function() { self.toggleCollapse(); }, false);
	this.element.getElementsByClassName("delete")[0].addEventListener("click", function() { self.delete(); }, false);
	this.element.getElementsByClassName("parse")[0].addEventListener("click", function() { self.parse(); }, false);
	this.element.getElementsByTagName("textarea")[0].addEventListener("keydown", function(event) {
		if (event.key === "s" && event.ctrlKey) {
			event.preventDefault();
			self.parse();
		}
	}, false);

	// Display UUID
	this.element.getElementsByClassName("itemDetailsId")[0].innerHTML = uuid;

	// Add to DOM
	let materialList = document.getElementById("materialList");
	this.element = materialList.insertBefore(this.element, document.getElementById("addMaterial"));

	for (let name in modelsTab.models) {
		let model = modelsTab.models[name];
		for (let i = 0; i < model.childMeshes.length; i++) {
			let optionElement = this.createOptionElement();
			let self = this;

			optionElement.addEventListener("click", function() {
				model.childMeshes[i].setMaterial(self.compiledMaterial);
			}, false);

			model.element.getElementsByTagName("select")[i].add(optionElement);
		}
	}
}

Material.prototype.parse = function(shouldLog = true) {
	let textarea = this.element.getElementsByTagName("textarea")[0];

	// To restart the CSS animation
	textarea.style.animationName = "";
	void textarea.offsetWidth;

	try {
		this.script = textarea.value;
		let compiledMaterial = Function("textures", "THREE", this.script)(texturesTab.textures, THREE);
		if (compiledMaterial instanceof THREE.Material) {
			this.compiledMaterial.copy(compiledMaterial);
			this.compiledMaterial.needsUpdate = true;
			if (shouldLog) {
				editorLog(`Succesfully parsed material script! (${this.name})`, "success");
			}
			textarea.style.animationName = "parseSuccess";
		} else {
			throw "return value is not a valid THREE Material";
		}
	} catch (error) {
		this.compiledMaterial.copy(_defaultMaterial.clone());
		this.compiledMaterial.needsUpdate = true;
		if (shouldLog) {
			editorLog(`Failed to parse script. ${error}`, "error");
		}
		textarea.style.animationName = "parseFailure";
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
		for (let childMesh of model.childMeshes) {
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
			document.getElementById("newMaterial").addEventListener("click", function() {
				let uuid = generateTinyUUID();
				let projectMaterial = projectTab.activeProject.addMaterial(uuid);
				materialsTab.addMaterial(uuid, projectMaterial);

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
