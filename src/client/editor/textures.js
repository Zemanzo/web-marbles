import * as THREE from "three";
import { materialsTab } from "./materials";
import { modelsTab } from "./models";
import { projectTab } from "./project";
import { editorLog } from "./log";

// texture object
function Texture(name, texture, projectData) {
	this.name = name;
	this.map = new THREE.TextureLoader().load(texture);
	this.projectData = projectData; // Project reference for this texture
	this.element = null;
	this.prefabEntities = {};

	// Deep clone for editor
	this.element = document.getElementById("textureTemplate").cloneNode(true);

	// Add to texture list
	this.element.id = name;
	this.element.getElementsByClassName("image")[0].src = texture;
	this.element.getElementsByClassName("name")[0].innerText = name;

	// Delete texture button
	this.element.getElementsByClassName("delete")[0].addEventListener("click", () => {
		if (confirm(`Are you sure you want to delete texture ${name}?`)) {
			texturesTab.removeTexture(name);
		}
	}, false);

	// Add to DOM
	this.element = document.getElementById("textures").appendChild(this.element);
}

let texturesTab = function() {
	return {
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
						let project = projectTab.activeProject.addTexture(file.name, file.reader.result);
						texturesTab.addTexture(file.name, file.reader.result, project);
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

		addTexture: function(name, texture, project) {
			texturesTab.textures[name] = new Texture(name, texture, project);
		},

		removeTexture: function(name) {
			if (name in this.textures === false) {
				console.log(`Attempted to remove texture ${name}, but no such texture exists!`);
				return;
			}

			let thisTexture = this.textures[name];

			// Remove from editor
			thisTexture.element.parentNode.removeChild(thisTexture.element);
			delete this.textures[name];

			// Remove from project
			delete projectTab.activeProject.textures[name];

			// Re-parse all custom materials
			for (let uuid in materialsTab.materials) {
				materialsTab.materials[uuid].parse(false); // false means without logging
			}

			editorLog(`Removed texture: ${name}`, "info");
		}
	};
}();

export { texturesTab };
