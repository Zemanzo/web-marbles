import * as THREE from "three";
import { generateTinyUUID } from "../generateTinyUUID";
import { hslToHex } from "../hslToHex";
import { inspector } from "./inspector";
import * as materials from "./materials";
import { scene, defaultModel } from "./render";
import { EditorObject } from "./editor";
import { modelsTab } from "./models";
import { worldTab } from "./world";

// Prefab object
function Prefab(uuid, color) {
	this.uuid = uuid;
	this.name = "";
	this.color = color;
	this.group = new THREE.Group();
	this.entities = {};
	this.worldInstances = {};
	this.changed = false;

	prefabsTab.group.add(this.group);

	this.element = document.getElementById("prefabTemplate").cloneNode(true); // deep clone;
	this.element.removeAttribute("id");
	this.element.getElementsByClassName("prefabColor")[0].value = color;

	// Add events
	let self = this;
	this.element.getElementsByClassName("showPrefab")[0].addEventListener("click", function() { self.toggleVisibility(); }, false);
	this.element.getElementsByClassName("prefabName")[0].addEventListener("input", function() { self.onNameChange(this.value); }, false);
	this.element.getElementsByClassName("prefabName")[0].addEventListener("change", function() { self.onNameChange(this.value); }, false);
	this.element.getElementsByClassName("prefabColor")[0].addEventListener("change", function() { self.onColorChange(this.value); }, false);
	this.element.getElementsByClassName("collapse")[0].addEventListener("click", function() { self.toggleCollapse(); }, false);
	this.element.getElementsByClassName("addObject")[0].addEventListener("click", function() { 
		let uuid = generateTinyUUID();
		self.addObject(uuid);
	}, false);
	this.element.getElementsByClassName("addCollider")[0].addEventListener("click", function() {
		let uuid = generateTinyUUID();
		self.addCollider(uuid);
	}, false);
	this.element.getElementsByClassName("delete")[0].addEventListener("click", function() {
		if( !confirm(`Are you sure you want to delete prefab ${self.name} (${self.uuid})?`)) return;
		prefabsTab.deletePrefab(self.uuid);
	}, false);

	// Remove entity templates from clone
	this.element.getElementsByClassName("objectList")[0].innerHTML = "";

	// Display UUID
	this.element.getElementsByClassName("detailsID")[0].innerHTML = uuid;

	// Add to DOM
	let prefabList = document.getElementById("prefabsList");
	this.element = prefabList.insertBefore(this.element, document.getElementById("addPrefab"));
}

Prefab.prototype.toggleVisibility = function() {
	let icon = this.element.getElementsByClassName("showPrefab")[0].children[0];
	if(this.group.visible) {
		this.group.visible = false;
		icon.className = "icofont-eye-blocked";
	} else {
		this.group.visible = true;
		icon.className = "icofont-eye";
	}
};

Prefab.prototype.onNameChange = function(name) {
	this.name = name;
	for (let key in this.worldInstances) {
		this.worldInstances[key].updatePrefabInfo();
	}
};

Prefab.prototype.onColorChange = function(color) {
	this.color = color;
	for (let key in this.worldInstances) {
		this.worldInstances[key].updatePrefabInfo();
	}
};

Prefab.prototype.toggleCollapse = function() {
	let caret = this.element.getElementsByClassName("collapse")[0].children[0];

	if ( this.element.className.indexOf("collapsed") === -1 ) {
		caret.className = "icofont-caret-right";
		this.element.className = "prefab collapsed";
	} else {
		caret.className = "icofont-caret-right rotated";
		this.element.className = "prefab";
	}
};

Prefab.prototype.addObject = function(uuid) {
	this.entities[uuid] = new PrefabObject(uuid, this);
	this.changed = true;
};

Prefab.prototype.addCollider = function(uuid) {
	this.entities[uuid] = new PrefabCollider(uuid, this);
	this.changed = true;
};

Prefab.prototype.deleteEntity = function(uuid) {
	let thisObject = this.entities[uuid];

	// Deselect inspector if this is currently selected
	if(inspector.selected === thisObject) inspector.deselect();

	this.group.remove(thisObject.sceneObject);
	thisObject.element.parentNode.removeChild(thisObject.element);

	delete this.entities[uuid];

	this.changed = true;
};

Prefab.prototype.updateInstances = function() {
	if(!this.changed) return;

	let containsStart = Object.keys( this.entities ).some(
		(key)=>{
			let functionality = this.entities[key].functionality;
			return (functionality && functionality === "startarea");
		}
	);

	for (let key in this.worldInstances) {
		let worldInstance = this.worldInstances[key];
		let old = worldInstance.sceneObject;

		let clone = this.group.clone();

		clone.position.copy(old.position);

		if (containsStart) {
			clone.rotation.setFromVector3( new THREE.Vector3(0, 0, 0) );
		} else {
			clone.rotation.copy(old.rotation);
		}

		old.parent.add(clone);
		old.parent.remove(old);

		worldInstance.sceneObject = clone;
		worldInstance.sceneObject.visible = true; // Do not copy visibility setting from prefab
	}

	this.changed = false;
};


// prefabEntity object, base for prefabObject and prefabCollider
function PrefabEntity(type, uuid, parent) {
	EditorObject.call(this, type, uuid);
	this.parent = parent;
	this.functionality = "static";
	
	this.element = document.getElementById(`prefab${type}Template`).cloneNode(true);
	this.element.removeAttribute("id");
	this.element.getElementsByClassName("uuid")[0].innerHTML = this.uuid;

	// Sets default name to Object# or Collider#, where # is lowest non-duplicate
	for(let i = 0; !this.name; i++) {
		let name = `${type}${i}`;
		let nameExists = false;
		for(let entity in parent.entities) {
			if(parent.entities[entity].name === name) nameExists = true;
		}
		if(!nameExists) {
			this.setName(name);
		}
	}
	
	// Add events
	let self = this;
	this.element.getElementsByClassName("delete")[0].addEventListener("click", function() { 
		if( !confirm(`Are you sure you want to delete this ${type}: ${self.name} (${self.uuid})?`)) return;
		self.parent.deleteEntity(self.uuid);
	}, false);
	this.element.addEventListener("click", function() {inspector.select(self);}, false);

	// Add to object list
	this.element = parent.element.getElementsByClassName("objectList")[0].appendChild(this.element);

}

PrefabEntity.prototype = Object.create(EditorObject.prototype);
Object.defineProperty(PrefabEntity.prototype, "constructor", {
	value: PrefabEntity,
	enumerable: false,
	writable: true
});

PrefabEntity.prototype.setFunctionality = function(functionality) {

	switch(functionality) {
	case "startarea":
		this.sceneObject.material = materials.startMaterial;
		this.setRotation(new THREE.Euler(0, 0, 0, "XYZ"));
		break;
	case "startgate":
		this.sceneObject.material = materials.gateMaterial;
		break;
	case "endarea":
		this.sceneObject.material = materials.endMaterial;
		break;
	case "static":
		this.sceneObject.material = materials.physicsMaterial;
		break;
	default:
		console.error(`Attempted to set unknown functionality "${functionality}" on an ${this.type}.`);
		return;
	}
	this.functionality = functionality;
	this.parent.changed = true;
};

PrefabEntity.prototype.setPosition = function(position) {
	EditorObject.prototype.setPosition.call(this, position);
	this.parent.changed = true;
};

PrefabEntity.prototype.setRotation = function(position) {
	EditorObject.prototype.setRotation.call(this, position);
	this.parent.changed = true;
};

PrefabEntity.prototype.setScale = function(position) {
	EditorObject.prototype.setScale.call(this, position);
	this.parent.changed = true;
};


// prefabObject object, inherits from prefabEntity
function PrefabObject(uuid, parent) {
	PrefabEntity.call(this, "Object", uuid, parent);
	this.model = null;
	this.sceneObject = defaultModel.clone();
	this.parent.group.add(this.sceneObject);
}

PrefabObject.prototype = Object.create(PrefabEntity.prototype);
Object.defineProperty(PrefabObject.prototype, "constructor", {
	value: PrefabObject,
	enumerable: false,
	writable: true
});

PrefabObject.prototype.setModel = function(modelName) {
	// Remove old model
	this.parent.group.remove(this.sceneObject);

	// Set new model
	this.model = modelName;
	let position = this.sceneObject.position;
	let rotation = this.sceneObject.rotation;
	let scale = this.sceneObject.scale;
	this.sceneObject = modelsTab.models[modelName].scene.clone();
	this.sceneObject.position.copy(position);
	this.sceneObject.rotation.copy(rotation);
	this.sceneObject.scale.copy(scale);
	this.sceneObject.visible = true;
	this.parent.group.add(this.sceneObject);
	this.parent.changed = true;
};


// prefabCollider object, inherits from prefabEntity
function PrefabCollider(uuid, parent) {
	PrefabEntity.call(this, "Collider", uuid, parent);

	this.colliderData = {
		shape: "box",
		width: 1,
		height: 1,
		depth: 1
	};
	let geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
	this.sceneObject = new THREE.Mesh(geometry, materials.physicsMaterial );
	this.parent.group.add(this.sceneObject);
}

PrefabCollider.prototype = Object.create(PrefabEntity.prototype);
Object.defineProperty(PrefabCollider.prototype, "constructor", {
	value: PrefabCollider,
	enumerable: false,
	writable: true
});

PrefabCollider.prototype.setShape = function(shapeType) {
	switch(shapeType) {
	case "box":
		this.colliderData = {
			shape: shapeType,
			width: 1,
			height: 1,
			depth: 1
		};
		this.sceneObject.geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
		this.sceneObject.scale.set(1, 1, 1);
		break;
	case "sphere":
		this.colliderData = {
			shape: shapeType,
			radius: 1
		};
		this.sceneObject.geometry = new THREE.SphereBufferGeometry( 1, 12, 10 );
		this.sceneObject.scale.set(1, 1, 1);
		break;
	case "cylinder":
		this.colliderData = {
			shape: shapeType,
			radius: 1,
			height: 1
		};
		this.sceneObject.geometry = new THREE.CylinderBufferGeometry( 1, 1, 1, 12 );
		this.sceneObject.scale.set(1, 1, 1);
		break;
	case "cone":
		this.colliderData = {
			shape: shapeType,
			radius: 1,
			height: 1
		};
		this.sceneObject.geometry = new THREE.ConeBufferGeometry( 1, 1, 12 );
		this.sceneObject.scale.set(1, 1, 1);
		break;
	default:
		console.error(`Attempted to set unknown collider shape type ${shapeType}`);
		return;
	}
	this.parent.changed = true;
};

PrefabCollider.prototype.setWidth = function(width) {
	if("width" in this.colliderData) {
		this.colliderData.width = width;
		this.sceneObject.scale.x = width;
		this.parent.changed = true;
	}
};

PrefabCollider.prototype.setHeight = function(height) {
	if("height" in this.colliderData) {
		this.colliderData.height = height;
		this.sceneObject.scale.y = height;
		this.parent.changed = true;
	}
};

PrefabCollider.prototype.setDepth = function(depth) {
	if("depth" in this.colliderData) {
		this.colliderData.depth = depth;
		this.sceneObject.scale.z = depth;
		this.parent.changed = true;
	}
};

PrefabCollider.prototype.setRadius = function(radius) {
	if("radius" in this.colliderData) {
		this.colliderData.radius = radius;
		this.sceneObject.scale.x = radius;
		this.sceneObject.scale.z = radius;
		if(this.colliderData.shape === "sphere") this.sceneObject.scale.y = radius;
		this.parent.changed = true;
	}
};



let prefabsTab = function() {

	return {
		prefabs: {},
		group: undefined,

		initialize: function() {
			this.group = new THREE.Group();
			scene.add(this.group);
			this.group.visible = false;

			// Register new prefab event
			document.getElementById("newPrefab").addEventListener("click", function() {
				let uuid = generateTinyUUID();
				prefabsTab.addPrefab(uuid,	hslToHex( Math.random() * 360, 100, Math.random() * 20 + 20));
				
				// Focus to name input so user can start typing right away
				prefabsTab.prefabs[uuid].element.getElementsByClassName("prefabName")[0].focus();
			}, false);
		},

		// Add a prefab with the provided uuid
		addPrefab: function(uuid, color) {
			prefabsTab.prefabs[uuid] = new Prefab(uuid, color);
		},

		// Deletes a prefab with the provided uuid
		deletePrefab: function(uuid) {
			let thisPrefab = prefabsTab.prefabs[uuid];

			// Delete worldObjects referencing this prefab
			while(Object.keys(thisPrefab.worldInstances).length > 0) {
				worldTab.deleteWorldObject(Object.keys(thisPrefab.worldInstances)[0]);
			}
			
			// Delete entities
			while(Object.keys(thisPrefab.entities).length > 0) {
				let thisEntity = thisPrefab.entities[Object.keys(thisPrefab.entities)[0]];
				thisPrefab.deleteEntity(thisEntity.uuid);
			}

			// Clean up prefab object
			prefabsTab.group.remove(thisPrefab.group);
			thisPrefab.element.parentNode.removeChild(thisPrefab.element);

			// Later: Delete from project

			delete prefabsTab.prefabs[uuid];
		},

		onTabActive: function() {
			prefabsTab.group.visible = true;
		},

		onTabInactive: function() {
			prefabsTab.group.visible = false;

			// Update changed prefabs
			for (let uuid in prefabsTab.prefabs) {
				prefabsTab.prefabs[uuid].updateInstances();
			}
		}
	};
}();

export { prefabsTab };
