import * as THREE from "three";
import { updateSun, water, sunParameters, scene } from "./render";
import { generateTinyUUID } from "../generate-tiny-uuid";
import { editor, EditorObject } from "./editor";
import { prefabsTab } from "./prefabs";
import { inspector } from "./inspector";


function WorldObject(uuid, prefab, project) {
	EditorObject.call(this, "WorldObject", uuid, project);
	this.prefab = prefab;

	this.element = document.getElementById("worldObjectTemplate").cloneNode(true); // deep clone
	this.element.removeAttribute("id");

	if(this.project.name) {
		this.setName(this.project.name);
	} else {
		this.setName(prefab.name); // Use the prefab name as worldObject name, if it wasn't set in the project object
	}
	this.element.getElementsByClassName("uuid")[0].innerHTML = uuid;
	this.updatePrefabInfo();

	// Add events
	let self = this;
	this.element.addEventListener("click", function() { inspector.select(self); }, false);
	this.element.getElementsByClassName("delete")[0].addEventListener("click", function(event) {
		event.stopPropagation(); // Don't fire the "select" event in parent node
		if( !confirm(`Are you sure you want to delete this object: ${self.name} (${self.uuid})?`)) return;
		worldTab.deleteWorldObject(self.uuid);
	}, false);

	// Add to DOM
	let hierarchy = document.getElementById("worldHierarchy");
	this.element = hierarchy.insertBefore(this.element, document.getElementById("worldObjectTemplate"));

	// Add the worldObject to prefab's instance list
	this.prefab.worldInstances[uuid] = this;

	// Add threejs group to scene
	this.sceneObject = prefab.group.clone();
	this.updateTransformFromProject();
	worldTab.group.add( this.sceneObject );
	this.sceneObject.visible = true;
}

WorldObject.prototype = Object.create(EditorObject.prototype);
Object.defineProperty(WorldObject.prototype, "constructor", {
	value: WorldObject,
	enumerable: false,
	writable: true
});

WorldObject.prototype.updatePrefabInfo = function() {
	this.element.getElementsByClassName("prefabName")[0].innerText = this.prefab.name;
	this.element.getElementsByClassName("prefabName")[0].title = this.prefab.uuid;
	this.element.getElementsByClassName("prefabName")[0].style.background = this.prefab.color;
};


let worldTab = function() {
	return {
		elements: {
			prefabList: null
		},
		worldObjects: {},
		worldParameters: null,
		group: null,

		initialize: function() {
			this.elements.prefabList = document.getElementById("worldPrefabList");
			this.group = new THREE.Group();
			scene.add(this.group);
			this.group.visible = false;

			this.worldParameters = editor.project.world;
			this.setWaterLevel(this.worldParameters.waterLevel);
			document.getElementById("envWaterHeight").value = this.worldParameters.waterLevel;
			this.setSunInclination(this.worldParameters.sunInclination);
			document.getElementById("envSunInclination").value = this.worldParameters.sunInclination;

			// Change water level
			document.getElementById("envWaterHeight").addEventListener("change", function() { worldTab.setWaterLevel( parseFloat(this.value) ); }, false);
			document.getElementById("envWaterHeight").addEventListener("input", function() { worldTab.setWaterLevel( parseFloat(this.value) ); }, false);

			// Change sun inclination
			document.getElementById("envSunInclination").addEventListener("change", function() { worldTab.setSunInclination( parseFloat(this.value) ); }, false);
			document.getElementById("envSunInclination").addEventListener("input", function() { worldTab.setSunInclination( parseFloat(this.value) ); }, false);

			// addWorldObject event
			let addWorldObject = function() {
				let prefabUuid = worldTab.elements.prefabList.value;

				if (worldTab.elements.prefabList.disabled
					|| prefabUuid === "null"
					|| prefabUuid === null
				) return;

				let uuid = generateTinyUUID();
				let projectWorldObject = editor.project.addWorldObject(uuid, prefabUuid);
				worldTab.addWorldObject(uuid, prefabsTab.prefabs[prefabUuid], projectWorldObject);
			};
			document.getElementById("worldAddPrefabButton").addEventListener("click", addWorldObject, false);
		},

		setWaterLevel: function(height) {
			this.worldParameters.waterLevel = height;
			//editor.project.world.waterLevel = height;
			water.position.y = height;
		},

		setSunInclination: function(inclination) {
			this.worldParameters.sunInclination = inclination;
			//editor.project.world.sunInclination = inclination;
			sunParameters.inclination = inclination;
			updateSun();
		},

		addWorldObject: function(uuid, prefab, project) {
			worldTab.worldObjects[uuid] = new WorldObject(uuid, prefab, project);
		},

		deleteWorldObject: function(uuid) {
			let thisObject = worldTab.worldObjects[uuid];
			if(!thisObject) return;

			// Deselect inspector if this is currently selected
			if(inspector.selected === thisObject) inspector.deselect();

			worldTab.group.remove(thisObject.sceneObject);
			thisObject.element.parentNode.removeChild(thisObject.element);

			delete thisObject.prefab.worldInstances[uuid];
			delete worldTab.worldObjects[uuid];
			delete editor.project.worldObjects[uuid];
		},

		onTabActive: function() {
			worldTab.group.visible = true;

			let previousSelection = worldTab.elements.prefabList.value;

			// Clear out the prefab list, except for "<Select Prefab>"
			while(worldTab.elements.prefabList.children.length > 1) {
				worldTab.elements.prefabList.removeChild(worldTab.elements.prefabList.children[1]);
			}
			worldTab.elements.prefabList.disabled = true;

			for(let key in prefabsTab.prefabs) {
				worldTab.elements.prefabList.disabled = false;

				// Update any instances using this prefab
				prefabsTab.prefabs[key].updateInstances();

				// Add an option for every existing prefab
				let option = document.createElement("option");
				option.value = key;
				option.text = `${prefabsTab.prefabs[key].name} (${key})`;
				worldTab.elements.prefabList.appendChild(option);

				// Restore previously selected prefab if it exists
				if(option.value === previousSelection) worldTab.elements.prefabList.value = previousSelection;
			}
		},

		onTabInactive: function() {
			worldTab.group.visible = false;
		}

	};
}();

export { worldTab };
