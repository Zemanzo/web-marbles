import { BoxBufferGeometry, Mesh, Group, Vector3 } from "three";
import { generateTinyUUID } from "../generateTinyUUID";
import { hslToHex } from "../hslToHex";
import { inspector } from "./inspector";
import { physicsMaterial } from "./materials";
import { scene, defaultModel } from "./render";
import { editor } from "./editor";


let prefabsTab = function() {

	return {
		prefabs: {},
		group: undefined,

		initialize: function() {
			this.group = new Group();
			scene.add(this.group);
			this.group.visible = false;

			// Register new prefab event
			document.getElementById("newPrefab").addEventListener("click", function() {
				let uuid = generateTinyUUID();
				// TODO: Check for ID duplicates
				addPrefab(uuid);
			}, false);
		},

		onTabActive: function() {
			prefabsTab.group.visible = true;
		},

		onTabInactive: function() {
			prefabsTab.group.visible = false;

			// Update changed prefabs
			// TODO: Figure out what it actually does..?
			for (let uuid in prefabsTab.prefabs) {
				if (prefabsTab.prefabs[uuid].changed) {
					let containsStart = Object.keys( prefabsTab.prefabs[uuid].entities ).some(
						(key)=>{
							let userData = prefabsTab.prefabs[uuid].entities[key].sceneObject.userData;
							return (userData.functionality && userData.functionality === "startarea");
						}
					);

					for (let key in prefabsTab.prefabs[uuid].instances) {
						let instance = prefabsTab.prefabs[uuid].instances[key];
						let old = instance.sceneObject;

						let clone = prefabsTab.prefabs[uuid].group.clone();

						clone.position.copy(old.position);

						if (containsStart) {
							clone.rotation.setFromVector3( new Vector3(0, 0, 0) );
						} else {
							clone.rotation.copy(old.rotation);
						}

						old.parent.add(clone);

						old.parent.remove(old);

						instance.sceneObject = clone;
						instance.sceneObject.visible = true; // Do not copy visibility setting from prefab
					}

					// world instances are updated
					prefabsTab.prefabs[uuid].changed = false;
				}
			}
		}
	};
}();

// Collapse prefab
let collapse = function() {
	let parent = this.closest(".prefab");
	if ( parent.className.indexOf("collapsed") === -1 ) {
		this.children[0].className = "icofont-caret-right";
		parent.className = "prefab collapsed";
	} else {
		this.children[0].className = "icofont-caret-right rotated";
		parent.className = "prefab";
	}
};

// Delete entity
// TODO: Rename
let deleteEntity = function(event) {
	if (event) event.stopPropagation();
	let parent = this.closest(".objectList > div");
	let prefabUuid = parent.dataset.prefabUuid;
	let uuid = parent.dataset.uuid;
	let name = parent.getElementsByClassName("name")[0].innerHTML;
	if ( !event || confirm(`Are you sure you want to delete this entity? (${name}) (${uuid})`) ) {
		// Deselect inspector if it shows currently selected object
		if (inspector.selected === parent) inspector.deselect();

		// Remove element
		parent.parentNode.removeChild(parent);

		// Remove threejs object
		prefabsTab.prefabs[prefabUuid].group.remove(
			prefabsTab.prefabs[prefabUuid].entities[uuid].sceneObject
		);

		delete prefabsTab.prefabs[prefabUuid].entities[uuid];

	}
	prefabsTab.prefabs[prefabUuid].changed = true;
};

// Delete prefab
let deletePrefab = function() {
	let parent = this.closest(".prefab");
	let prefabUuid = parent.dataset.uuid;
	let name = parent.getElementsByClassName("prefabName")[0].value;
	if ( confirm(`Are you sure you want to delete this prefab? (${name}) (${parent.dataset.uuid})`) ) {
		// Deselect inspector
		// TODO: add deselect condition (only need to deselect when selected object is in prefab)
		inspector.deselect();

		let children = parent.getElementsByClassName("objectList")[0].children;
		for (let i = children.length; i > 0; i--) {
			let child = children[i - 1];
			deleteEntity.call(child);
		}

		// Remove world select option element
		editor.elements.worldPrefab.removeChild(prefabsTab.prefabs[prefabUuid].option);

		if (editor.elements.worldPrefab.children.length == 1) {
			editor.elements.worldPrefab.disabled = true;
		}

		// Remove world instances
		for (let key in prefabsTab.prefabs[prefabUuid].instances) {
			let instance = prefabsTab.prefabs[prefabUuid].instances[key];
			instance.element.parentNode.removeChild(instance.element);
			instance.sceneObject.parent.remove(instance.sceneObject);
		}

		// Remove element
		parent.parentNode.removeChild(parent);

		// Remove from group
		prefabsTab.group.remove(prefabsTab.prefabs[prefabUuid].group);

		delete prefabsTab.prefabs[prefabUuid];
	}
};

// Add template element to prefab
let addTemplateElement = function(type, parent) {
	let clone = document.getElementById(`prefab${  type  }Template`).cloneNode(true);
	let uuid = generateTinyUUID();

	clone.removeAttribute("id");
	clone.dataset.prefabUuid = parent.dataset.uuid;
	clone.dataset.uuid = uuid;
	clone.dataset.type = "entities";
	clone.getElementsByClassName("name")[0].innerHTML = type + prefabsTab.prefabs[parent.dataset.uuid].entityCount++;
	clone.getElementsByClassName("uuid")[0].innerHTML = uuid;
	clone.getElementsByClassName("delete")[0].addEventListener("click", deleteEntity, false);
	clone.addEventListener("click", inspector.select, false);
	clone = parent.getElementsByClassName("objectList")[0].appendChild(clone);
	prefabsTab.prefabs[parent.dataset.uuid].entities[uuid] = {
		element: clone
	};
	prefabsTab.prefabs[parent.dataset.uuid].changed = true;
	return uuid;
};

// Add object to prefab
let addObject = function() {
	let parent = this.closest(".prefab");
	let uuid = addTemplateElement.call(this, "Object", parent);

	let clone = defaultModel.clone();
	prefabsTab.prefabs[parent.dataset.uuid].entities[uuid].model = "null";
	prefabsTab.prefabs[parent.dataset.uuid].entities[uuid].sceneObject = clone;
	prefabsTab.prefabs[parent.dataset.uuid].entities[uuid].sceneObject.userData.functionality = "static";
	prefabsTab.prefabs[parent.dataset.uuid].group.add(clone);
};

// Add collider to prefab
let addCollider = function() {
	let parent = this.closest(".prefab");
	let uuid = addTemplateElement.call(this, "Collider", parent);

	let geometry = new BoxBufferGeometry( 1, 1, 1 );
	let box = new Mesh(geometry, physicsMaterial );
	prefabsTab.prefabs[parent.dataset.uuid].entities[uuid].shape = "box";
	let sceneObject = prefabsTab.prefabs[parent.dataset.uuid].entities[uuid].sceneObject = box;
	sceneObject.userData.radius = 1;
	sceneObject.userData.width = 1;
	sceneObject.userData.height = 1;
	sceneObject.userData.depth = 1;
	sceneObject.userData.functionality = "static";
	prefabsTab.prefabs[parent.dataset.uuid].group.add(box);
};

// Toggle prefab visibility
let showPrefab = function() {
	let parent = this.closest(".prefab");
	let prefabUuid = parent.dataset.uuid;
	let prefabGroup = prefabsTab.prefabs[prefabUuid].group;
	let icon = this.getElementsByTagName("i")[0];

	if (prefabGroup.visible) {
		prefabGroup.visible = false;
		icon.className = "icofont-eye-blocked";
	} else {
		prefabGroup.visible = true;
		icon.className = "icofont-eye";
	}
};

// Change prefab name
let namePrefab = function() {
	let parent = this.closest(".prefab");
	let prefabUuid = parent.dataset.uuid;
	prefabsTab.prefabs[prefabUuid].option.text = `${this.value  } (${  prefabUuid  })`;
	for (let key of Object.keys(prefabsTab.prefabs[prefabUuid].instances) ) {
		let instance = prefabsTab.prefabs[prefabUuid].instances[key];
		instance.element.getElementsByClassName("prefabName")[0].innerText = this.value;
	}
};

// Change prefab color
let colorPrefab = function() {
	let parent = this.closest(".prefab");
	let prefabUuid = parent.dataset.uuid;
	for (let key of Object.keys(prefabsTab.prefabs[prefabUuid].instances) ) {
		let instance = prefabsTab.prefabs[prefabUuid].instances[key];
		instance.element.getElementsByClassName("prefabName")[0].style.background = this.value;
	}
};

// Add a prefab with the provided uuid
let addPrefab = function(uuid) {
	let clone = document.getElementById("prefabTemplate").cloneNode(true); // deep clone
	clone.removeAttribute("id");
	clone.dataset.uuid = uuid;

	// Add events
	clone.getElementsByClassName("showPrefab")[0].addEventListener("click", showPrefab, false);
	clone.getElementsByClassName("prefabName")[0].addEventListener("input", namePrefab, false);
	clone.getElementsByClassName("prefabName")[0].addEventListener("change", namePrefab, false);
	clone.getElementsByClassName("prefabColor")[0].addEventListener("change", colorPrefab, false);
	clone.getElementsByClassName("collapse")[0].addEventListener("click", collapse, false);
	clone.getElementsByClassName("delete")[0].addEventListener("click", deletePrefab, false);
	clone.getElementsByClassName("addObject")[0].addEventListener("click", addObject, false);
	clone.getElementsByClassName("addCollider")[0].addEventListener("click", addCollider, false);

	// Set random color
	clone.getElementsByClassName("prefabColor")[0].value = hslToHex(
		Math.random() * 360,
		100,
		Math.random() * 20 + 20
	);

	// Remove entity templates from clone
	clone.getElementsByClassName("objectList")[0].innerHTML = "";

	// Display UUID
	clone.getElementsByClassName("detailsID")[0].innerHTML = uuid;

	// Add to editor object
	prefabsTab.prefabs[uuid] = {
		uuid: uuid,
		group: new Group(),
		entities: {},
		instances: {},
		entityCount: 0 // This is definitely changing, but at least it's out of the editor object! :D
	};

	// Add option to prefab world list
	let select = editor.elements.worldPrefab;
	let option = document.createElement("option");
	option.text = `(${  uuid  })`;
	option.value = uuid;
	prefabsTab.prefabs[uuid].option = select.appendChild(option);

	if (select.disabled) select.disabled = false;

	// Add threejs group to scene
	prefabsTab.group.add(prefabsTab.prefabs[uuid].group);

	// Add to DOM
	let prefabList = document.getElementById("prefabsList");
	prefabsTab.prefabs[uuid].element = clone = prefabList.insertBefore(clone, document.getElementById("addPrefab"));

	// Focus to name input so user can start typing right away
	clone.getElementsByClassName("prefabName")[0].focus();

	
};

export { prefabsTab };
