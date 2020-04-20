import {
	TextureLoader
} from "three";
import * as THREE_CONSTANTS from "three/src/constants.js";
import { materialsTab } from "./materials";
import { modelsTab } from "./models";
import { projectTab } from "./project";
import { editorLog } from "./log";
import { generateTinyUUID } from "../generate-tiny-uuid";

// texture object
function Texture(uuid, projectData) {
	let self = this;
	this.uuid = uuid;
	this.name = projectData.name;
	this.map = new TextureLoader().load(
		projectData.file,
		function() { // success
			editorLog(`Loaded texture: ${self.name}`, "info");
		},
		undefined,
		function(error) { // error
			editorLog(`Unable to load texture (${self.name}): ${error}`, "error");
			console.error(error);
			self.delete();
		}
	);
	this.map.wrapS = this.map.wrapT = THREE_CONSTANTS.RepeatWrapping;
	this.projectData = projectData; // Project reference for this texture
	this.element = null;
	this.optionElements = [];

	// Deep clone for editor
	this.element = document.getElementById("textureTemplate").cloneNode(true);

	// Add to texture list
	this.element.id = projectData.name;
	this.element.getElementsByClassName("image")[0].src = projectData.file;
	this.element.getElementsByClassName("name")[0].innerText = this.name;

	// Delete texture button
	this.element.getElementsByClassName("delete")[0].addEventListener("click", () => {
		if (confirm(`Are you sure you want to delete texture ${self.name}?`)) {
			texturesTab.removeTexture(uuid);
		}
	}, false);

	// Add to DOM
	this.element = document.getElementById("textures").appendChild(this.element);

	// Add texture option to each material selection
	for (let uuid in materialsTab.materials) {
		let material = materialsTab.materials[uuid];
		for (let textureSelect of material.element.getElementsByClassName("textureSelect")) {
			let optionElement = this.createOptionElement();
			textureSelect.add(optionElement);
		}
	}
}

Texture.prototype.createOptionElement = function() {
	let optionElement = document.createElement("option");
	optionElement.className = `option-${this.uuid}`;
	optionElement.innerText = this.name;
	optionElement.value = this.uuid;

	this.optionElements.push(optionElement);

	return optionElement;
};

Texture.prototype.delete = function() {
	// Remove from texture selects
	for (let element of this.optionElements) {
		element.parentNode.removeChild(element);
	}

	// Re-parse all materials
	for (let uuid in materialsTab.materials) {
		let material = materialsTab.materials[uuid];
		material.parse();
	}

	// Remove from editor
	this.element.parentNode.removeChild(this.element);
	delete texturesTab.textures[this.uuid];

	// Remove from project
	delete projectTab.activeProject.textures[this.uuid];
};

let texturesTab = function() {
	return {
		elements: {
			materialList: null
		},
		textures: {},

		initialize: function() {
			// Add textures button
			document.getElementById("addTexture").addEventListener("click", function() { document.getElementById("addTextureFile").click(); }, false);
			document.getElementById("addTextureFile").addEventListener("change", function() {
				Array.from(this.files).forEach(function(file) {
					if (file.name in projectTab.activeProject.textures) {
						editorLog(`Texture ${file.name} already loaded.`, "warn");
						return;
					}

					if (file.name === "null") {
						editorLog("Nice try.", "success");
						return;
					}

					file.reader = new FileReader();
					file.reader.onload = function() {
						// Attempt to load texture and add it to the project
						let uuid = generateTinyUUID();
						let project = projectTab.activeProject.addTexture(uuid, file.name, file.reader.result);
						texturesTab.addTexture(uuid, project);
					};

					file.reader.onerror = function() {
						editorLog(`Unable to load texture (${file.name}): ${file.reader.error.message}`, "error");
						file.reader.abort();
					};

					file.reader.readAsDataURL(file);
				});
			}, false);
		},

		onTabActive: function() {
			modelsTab.group.visible = true;
		},

		onTabInactive: function() {
			modelsTab.group.visible = false;
		},

		addTexture: function(uuid, project) {
			texturesTab.textures[uuid] = new Texture(uuid, project);
		},

		removeTexture: function(uuid) {
			if (uuid in this.textures === false) {
				console.log(`Attempted to remove texture ${uuid}, but no such texture exists!`);
				return;
			}

			let name = this.textures[uuid].name;
			this.textures[uuid].delete();

			editorLog(`Removed texture: ${name}`, "info");
		}
	};
}();

export { texturesTab };
