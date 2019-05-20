import * as THREE from "three";
import "three/examples/js/nodes/THREE.Nodes";
import { editorLog } from "./log";
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

	// Related DOM elements
	this.element = document.getElementById("materialTemplate").cloneNode(true); // deep clone
	this.element.removeAttribute("id");
	this.element.classList.remove("itemTemplate");

	this.elements = {};
	this.elements.itemName = this.element.getElementsByClassName("itemName")[0];
	this.elements.textureSelects = this.element.getElementsByClassName("textureSelect");

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
	let self = this;
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
	}

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

Material.prototype.parse = function() {
	let diffuseA = this.projectData["diffuse-a"] = this.element.querySelector("[data-texture-map-type=diffuse-a]").value;
	let diffuseB = this.projectData["diffuse-b"] = this.element.querySelector("[data-texture-map-type=diffuse-b]").value;
	let mask	 = this.projectData["mask"]		 = this.element.querySelector("[data-texture-map-type=mask]").value;
	let normalA  = this.projectData["normal-a"]  = this.element.querySelector("[data-texture-map-type=normal-a]").value;
	let normalB  = this.projectData["normal-b"]  = this.element.querySelector("[data-texture-map-type=normal-b]").value;

	function getTexture(uuid) {
		if (uuid && texturesTab.textures[uuid]) {
			return texturesTab.textures[uuid].map;
		} else {
			return false;
		}
	}

	if ( !(getTexture(diffuseA) && getTexture(diffuseB) && getTexture(mask)) ) {
		editorLog(`Unable to parse custom material ${this.name}, missing textures`, "warning");
		return;
	}

	let material;
	material = new THREE.StandardNodeMaterial();
	material.roughness = new THREE.FloatNode(.9);
	material.metalness = new THREE.FloatNode(0);

	function createUv(scale = 1, offset = 0) {
		let uvOffset = new THREE.FloatNode(offset);
		let uvScale = new THREE.FloatNode(scale);

		let uvNode = new THREE.UVNode();
		let offsetNode = new THREE.OperatorNode(
			uvOffset,
			uvNode,
			THREE.OperatorNode.ADD
		);
		let scaleNode = new THREE.OperatorNode(
			offsetNode,
			uvScale,
			THREE.OperatorNode.MUL
		);

		return scaleNode;
	}


	// Diffuse maps (optional)
	let diffuseNodeA = new THREE.TextureNode(getTexture(diffuseA), createUv(35));
	let diffuseNodeB = new THREE.TextureNode(getTexture(diffuseB), createUv(35));
	let maskNode = new THREE.TextureNode(getTexture(mask), createUv());
	let maskAlphaChannel = new THREE.SwitchNode(maskNode, "w");
	let diffuseBlend = new THREE.Math3Node(
		diffuseNodeA,
		diffuseNodeB,
		maskAlphaChannel,
		THREE.Math3Node.MIX
	);
	material.color = diffuseBlend;

	// Normals (optional)
	if (getTexture(normalA) && getTexture(normalB)) {
		let normalNodeA = new THREE.TextureNode(getTexture(normalA), createUv(35));
		let normalNodeB = new THREE.TextureNode(getTexture(normalB), createUv(35));
		let normalBlend = new THREE.Math3Node(
			normalNodeA,
			normalNodeB,
			maskAlphaChannel,
			THREE.Math3Node.MIX
		);

		material.normal = new THREE.NormalMapNode(normalBlend);

		let normalScaleNode = new THREE.OperatorNode(
			new THREE.TextureNode(getTexture("mask"), createUv()),
			new THREE.FloatNode(1),
			THREE.OperatorNode.MUL
		);

		material.normalScale = normalScaleNode;
	}

	// build shader
	material.build();

	// set material
	this.compiledMaterial.copy(material);
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
