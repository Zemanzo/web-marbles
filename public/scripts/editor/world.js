import * as THREE from "three";
import { updateSun, water, sunParameters, scene } from "./render";
import { generateTinyUUID } from "../generateTinyUUID";
import { editor } from "./editor";
import { prefabsTab } from "./prefabs";
import { inspector } from "./inspector";

let worldTab = function() {
	//
	return {
		// No container for world objects exist yet. They're in the prefab's instances right now.
		group: undefined,

		initialize: function() {
			this.group = new THREE.Group();
			scene.add(this.group);

			// Change water level
			let changeWaterLevel = function() {
				water.position.y = this.value;
			};
			document.getElementById("envWaterHeight").addEventListener("change", changeWaterLevel, false);
			document.getElementById("envWaterHeight").addEventListener("input", changeWaterLevel, false);

			// Change sun inclination
			let changeSunInclination = function() {
				sunParameters.inclination = this.value;
				updateSun();
			};
			document.getElementById("envSunInclination").addEventListener("change", changeSunInclination, false);
			document.getElementById("envSunInclination").addEventListener("input", changeSunInclination, false);


			// Add world prefab
			let addWorldPrefab = function() {
				let prefabUuid = editor.elements.worldPrefab.value;
				if (
					!editor.elements.worldPrefab.disabled
					&& prefabUuid !== "null"
				) {
					let clone = document.getElementById("worldPrefabTemplate").cloneNode(true); // deep clone
					let uuid = generateTinyUUID();
					clone.removeAttribute("id");
					clone.dataset.uuid = uuid;
					clone.dataset.prefabUuid = prefabUuid;
					clone.dataset.type = "instances";

					// Add select event
					clone.addEventListener("click", inspector.select, false);

					// Add name & prefab name
					clone.getElementsByClassName("name")[0].innerText =
					clone.getElementsByClassName("prefabName")[0].innerText =
						prefabsTab.prefabs[prefabUuid].element.getElementsByClassName("prefabName")[0].value;

					clone.getElementsByClassName("prefabName")[0].style.background =
						prefabsTab.prefabs[prefabUuid].element.getElementsByClassName("prefabColor")[0].value;

					// Add uuid
					clone.getElementsByClassName("uuid")[0].innerHTML = uuid;

					// Add prefab uuid
					clone.getElementsByClassName("prefabName")[0].title = prefabUuid;

					// Add threejs group to scene
					let groupClone = prefabsTab.prefabs[prefabUuid].group.clone();
					worldTab.group.add( groupClone );
					groupClone.visible = true;

					// Add to DOM
					let hierarchy = document.getElementById("worldHierarchy");
					let element = hierarchy.insertBefore(clone, document.getElementById("worldPrefabTemplate"));

					// Add instance reference to parent prefab
					prefabsTab.prefabs[prefabUuid].instances[uuid] = {
						uuid: uuid,
						sceneObject: groupClone,
						element: element
					};

				}
			};

			document.getElementById("worldAddPrefabButton").addEventListener("click", addWorldPrefab, false);
		},

		onTabActive: function() {
			worldTab.group.visible = true;
		},

		onTabInactive: function() {
			worldTab.group.visible = false;
		}

	};
}();

export { worldTab };
