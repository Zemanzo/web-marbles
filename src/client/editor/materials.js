import * as THREE from "three";
import "three/examples/js/nodes/THREE.Nodes";
import { CustomMaterial } from "../render/custom-material";
import { texturesTab } from "./textures";
import { modelsTab } from "./models";
import { projectTab } from "./project";
import { generateTinyUUID } from "../generate-tiny-uuid";

function DefaultMaterial() {
	let material = new THREE.StandardNodeMaterial();
	material.color = new THREE.ColorNode(0xff00ff);
	material.build();
	return material;
}

// Material object
function Material(uuid, projectData) {
	this.uuid = uuid;
	this.projectData = projectData; // Project reference for this material
	this.compiledMaterial = new DefaultMaterial();

	let self = this;

	// Related DOM elements
	this.element = document.getElementById("materialTemplate").cloneNode(true); // deep clone
	this.element.removeAttribute("id");
	this.element.classList.remove("itemTemplate");

	this.elements = {};
	this.elements.itemName = this.element.getElementsByClassName("itemName")[0];
	this.elements.textureSelects = this.element.getElementsByClassName("textureSelect");
	this.elements.textureUVs = this.element.getElementsByClassName("textureUV");

	// UV button for every texture input
	for (let uvButton of this.elements.textureUVs) {
		let materialProperty = uvButton.dataset.textureMapType;

		// Add property inputs
		let clone = document.getElementById("textureUVTransformTemplate").cloneNode(true);
		clone.removeAttribute("id");
		clone.className = "textureUVTransform";
		for (let input of clone.getElementsByTagName("input")) {
			let uvProperty = input.dataset.uvProperty;

			if (self.projectData[materialProperty][uvProperty]) {
				input.value = self.projectData[materialProperty][uvProperty];
			} else {
				self.projectData[materialProperty][uvProperty] = input.valueAsNumber;
			}

			let setUvProperty = function() {
				self.projectData[materialProperty][uvProperty] = this.valueAsNumber;
			};

			input.addEventListener("input", setUvProperty, false);
			input.addEventListener("change", setUvProperty, false);
		}

		uvButton.appendChild(clone);

		// Add event to UV button
		uvButton.addEventListener("click", function(event) {
			if (event.target !== uvButton) {
				return;
			}

			this.classList.toggle("visible");
			this.getElementsByClassName("textureUVTransform")[0].classList.toggle("visible");
		}, false);
	}

	// Load material-related data if it exists in the project
	if (this.projectData.name) {
		this.elements.itemName.value = this.name = this.projectData.name;
	} else {
		this.elements.itemName.value = this.name = this.projectData.name = "";
	}

	// Array of option elements that are part of the model material selection
	this.optionElements = [];

	// Set a default material
	this.compiledMaterial = new DefaultMaterial();

	// Add events
	this.elements.itemName.addEventListener("input", function() { self.onNameChange(this.value); }, false);
	this.elements.itemName.addEventListener("change", function() { self.onNameChange(this.value); }, false);
	this.element.getElementsByClassName("collapse")[0].addEventListener("click", function() { self.toggleCollapse(); }, false);
	this.element.getElementsByClassName("delete")[0].addEventListener("click", function() { self.delete(); }, false);
	this.element.getElementsByClassName("parse")[0].addEventListener("click", function() { self.parse(); }, false);

	// Display UUID
	this.element.getElementsByClassName("itemDetailsId")[0].innerHTML = uuid;

	// Add texture option elements
	for (let selectElement of this.elements.textureSelects) {
		for (let textureUuid in texturesTab.textures) {
			let texture = texturesTab.textures[textureUuid];
			let optionElement = texture.createOptionElement();
			if (this.projectData[selectElement.dataset.textureMapType] === textureUuid) {
				optionElement.selected = true;
			}
			selectElement.add(optionElement);
		}

		// Add property events
		let property = selectElement.dataset.textureMapType;

		selectElement.addEventListener("change", function() {
			self.projectData[property].textureUuid = this.value;
		}, false);

		if (typeof this.projectData[property].textureUuid !== "undefined") selectElement.value = this.projectData[property].textureUuid;
	}

	let setSide = function() { self.projectData.side = this.value; };
	this.element.getElementsByClassName("side")[0].addEventListener("change", setSide, false);
	if (typeof this.projectData.side !== "undefined") this.element.getElementsByClassName("side")[0].value = this.projectData.side;

	let setRoughness = function() { self.projectData.roughness = this.valueAsNumber; };
	this.element.getElementsByClassName("roughness")[0].addEventListener("input", setRoughness, false);
	this.element.getElementsByClassName("roughness")[0].addEventListener("change", setRoughness, false);
	if (typeof this.projectData.roughness !== "undefined") this.element.getElementsByClassName("roughness")[0].value = this.projectData.roughness;

	let setMetalness = function() { self.projectData.metalness = this.valueAsNumber; };
	this.element.getElementsByClassName("metalness")[0].addEventListener("input", setMetalness, false);
	this.element.getElementsByClassName("metalness")[0].addEventListener("change", setMetalness, false);
	if (typeof this.projectData.metalness !== "undefined") this.element.getElementsByClassName("metalness")[0].value = this.projectData.metalness;

	// Add custom material options to each model childMesh
	this.element = materialsTab.elements.materialList.insertBefore(this.element, document.getElementById("addMaterial"));

	for (let name in modelsTab.models) {
		let model = modelsTab.models[name];
		for (let childMesh of model.childMeshes) {
			let optionElement = this.createOptionElement();
			let self = this;

			optionElement.addEventListener("click", function() {
				childMesh.setMaterial(self.uuid);
			}, false);

			childMesh.selectElement.add(optionElement);
		}
	}
}

Material.prototype.parse = function() {
	function toTextureProperty(textureData) {
		if (textureData.textureUuid && texturesTab.textures[textureData.textureUuid]) {
			let textureProperty = {};
			Object.assign(textureProperty, textureData); // We shouldn't modify textureData, so we copy the data to a temporary object instead
			textureProperty.texture = texturesTab.textures[textureData.textureUuid].map;
			return textureProperty;
		} else {
			return null;
		}
	}

	let properties = {
		side: this.projectData.side,
		roughness: this.projectData.roughness,
		metalness: this.projectData.metalness,
		diffuseA: toTextureProperty(this.projectData["diffuse-a"]),
		diffuseB: toTextureProperty(this.projectData["diffuse-b"]),
		mask:	  toTextureProperty(this.projectData["mask"]),
		normalA:  toTextureProperty(this.projectData["normal-a"]),
		normalB:  toTextureProperty(this.projectData["normal-b"])
	};

	try {
		let customMaterial = new CustomMaterial(properties);
		this.compiledMaterial.copy(customMaterial.material);
		this.compiledMaterial.build();
		this.compiledMaterial.needsUpdate = true;
	} catch (error) {
		console.warn(error);
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
				childMesh.setMaterial();
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
			// Get DOM
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
