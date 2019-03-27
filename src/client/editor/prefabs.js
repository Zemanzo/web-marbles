import * as THREE from "three";
import { generateTinyUUID } from "../generate-tiny-uuid";
import { hslToHex } from "../hsl-to-hex";
import { inspector } from "./inspector";
import * as materials from "./materials";
import { scene, defaultModel } from "./render";
import { EditorObject } from "./editor";
import { modelsTab } from "./models";
import { worldTab } from "./world";
import { projectTab } from "./project";
import { editorLog } from "./log";

// Prefab object
function Prefab(uuid, project) {
	this.uuid = uuid;
	this.project = project;
	this.group = new THREE.Group();
	this.entities = {};
	this.worldInstances = {};
	this.changed = false;

	// Load prefab-related data if it exists in the project
	if(this.project.name) {
		this.name = this.project.name;
	} else {
		this.name = this.project.name = "";
	}
	if(this.project.color) {
		this.color = this.project.color;
	} else {
		this.color = this.project.color = hslToHex( Math.random() * 360, 100, Math.random() * 20 + 20);
	}

	prefabsTab.group.add(this.group);

	this.element = document.getElementById("prefabTemplate").cloneNode(true); // deep clone
	this.element.removeAttribute("id");
	this.element.getElementsByClassName("prefabName")[0].value = this.name;
	this.element.getElementsByClassName("prefabColor")[0].value = this.color;

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
		let worldText = "";
		let worldObjectCount = Object.keys(self.worldInstances).length;
		if( worldObjectCount > 0) {
			worldText = `\nThis will remove ${worldObjectCount} object${worldObjectCount === 1 ? "" : "s"} from the world!`;
		}

		if( !confirm(`Are you sure you want to delete prefab ${self.name} (${self.uuid})?${worldText}`)) return;
		prefabsTab.deletePrefab(self.uuid);
	}, false);

	// Remove entity templates from clone
	this.element.getElementsByClassName("objectList")[0].innerHTML = "";

	// Display UUID
	this.element.getElementsByClassName("detailsID")[0].innerHTML = uuid;

	// Add to DOM
	let prefabList = document.getElementById("prefabsList");
	this.element = prefabList.insertBefore(this.element, document.getElementById("addPrefab"));

	// Add any existing entities from the project
	// The rest is handled in their constructors
	for( let key in this.project.entities) {
		let entity = this.project.entities[key];
		if(entity.type === "Object") {
			this.addObject(key);
		} else if (entity.type === "Collider") {
			this.addCollider(key);
		} else {
			editorLog(`Attempted to load unknown prefab entity of type ${entity.type}`, "error");
			delete this.project.entities[key];
		}
	}
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
	this.project.name = name;
	for (let key in this.worldInstances) {
		this.worldInstances[key].updatePrefabInfo();
	}
};

Prefab.prototype.onColorChange = function(color) {
	this.color = color;
	this.project.color = color;
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

	// Remove from model references
	if(thisObject.model && thisObject.model !== "null") {
		delete modelsTab.models[thisObject.model].prefabEntities[uuid];
	}

	delete this.entities[uuid];
	delete this.project.entities[uuid];

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
	if(uuid in parent.project.entities === false) {
		parent.project.entities[uuid] = {
			type: type,
			functionality: "static"
		};
	}
	EditorObject.call(this, type, uuid, parent.project.entities[uuid]);
	this.parent = parent;
	this.functionality = "static";

	this.element = document.getElementById(`prefab${type}Template`).cloneNode(true);
	this.element.removeAttribute("id");
	this.element.getElementsByClassName("uuid")[0].innerHTML = this.uuid;

	if(this.project.name) this.setName(this.project.name);

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
	this.element.getElementsByClassName("delete")[0].addEventListener("click", function(event) {
		event.stopPropagation(); // Don't fire the "select" event in parent node
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
	this.project.functionality = functionality;
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
	this.model = "null"; // Note: HAS to be a string for inspector purposes!
	this.sceneObject = defaultModel.clone();
	this.updateTransformFromProject();
	this.parent.group.add(this.sceneObject);

	// Load any object data from project
	if("model" in this.project) {
		this.setModel(this.project.model);
	} else {
		this.project.model = null;
	}
	this.setFunctionality(this.project.functionality);
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
	if(this.model !== "null") {
		delete modelsTab.models[this.model].prefabEntities[this.uuid];
	}

	let position = this.sceneObject.position;
	let rotation = this.sceneObject.rotation;
	let scale = this.sceneObject.scale;

	let model = null;

	// For null or non-existing models, use default
	if(modelName && modelName !== "null") {
		if(!modelsTab.models[modelName]) {
			editorLog(`Unable to set prefab model to ${modelName} because it doesn't exist!`, "error");
			modelName = "null";
		} else {
			this.model = modelName;
			this.project.model = modelName;
			modelsTab.models[this.model].prefabEntities[this.uuid] = this;
			model = modelsTab.models[modelName].sceneObject;
		}
	}

	// Not as an else, in case the above "fails"
	if(!modelName || modelName === "null") {
		this.model = "null";
		this.project.model = null;
		model = defaultModel;
	}

	// Set new model
	this.sceneObject = model.clone();
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
	this.updateTransformFromProject();
	if(this.project.scale) delete this.project.scale;
	this.parent.group.add(this.sceneObject);

	// Load any collider data from project
	if("colliderData" in this.project) {
		let projectData = this.project.colliderData;
		switch(projectData.shape) {
		case "box": {
			let width = projectData.width;
			let height = projectData.height;
			let depth = projectData.depth;
			this.setShape("box");
			this.setWidth(width);
			this.setHeight(height);
			this.setDepth(depth);
			break;
		}
		case "sphere": {
			let radius = projectData.radius;
			this.setShape("sphere");
			this.setRadius(radius);
			break;
		}
		case "cylinder": {
			let radius = projectData.radius;
			let height = projectData.height;
			this.setShape("cylinder");
			this.setRadius(radius);
			this.setHeight(height);
			break;
		}
		case "cone": {
			let radius = projectData.radius;
			let height = projectData.height;
			this.setShape("cone");
			this.setRadius(radius);
			this.setHeight(height);
			break;
		}
		default:
			break;
		}
	} else {
		this.project.colliderData = this.colliderData;
	}
	this.setFunctionality(this.project.functionality);
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
		this.project.colliderData = this.colliderData;
		this.sceneObject.geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
		this.sceneObject.scale.set(1, 1, 1);
		break;
	case "sphere":
		this.colliderData = {
			shape: shapeType,
			radius: 1
		};
		this.project.colliderData = this.colliderData;
		this.sceneObject.geometry = new THREE.SphereBufferGeometry( 1, 12, 10 );
		this.sceneObject.scale.set(1, 1, 1);
		break;
	case "cylinder":
		this.colliderData = {
			shape: shapeType,
			radius: 1,
			height: 1
		};
		this.project.colliderData = this.colliderData;
		this.sceneObject.geometry = new THREE.CylinderBufferGeometry( 1, 1, 1, 12 );
		this.sceneObject.scale.set(1, 1, 1);
		break;
	case "cone":
		this.colliderData = {
			shape: shapeType,
			radius: 1,
			height: 1
		};
		this.project.colliderData = this.colliderData;
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
		elements: {
			modelList: null
		},
		prefabs: {},
		group: null,

		initialize: function() {
			this.elements.modelList = document.getElementById("inspectorModelList");
			this.group = new THREE.Group();
			scene.add(this.group);
			this.group.visible = false;

			// Register new prefab event
			document.getElementById("newPrefab").addEventListener("click", function() {
				let uuid = generateTinyUUID();
				let projectPrefab = projectTab.project.addPrefab(uuid);
				prefabsTab.addPrefab(uuid, projectPrefab);
				// Focus to name input so user can start typing right away
				prefabsTab.prefabs[uuid].element.getElementsByClassName("prefabName")[0].focus();
			}, false);
		},

		// Add a prefab with the provided uuid and project-side object
		addPrefab: function(uuid, project) {
			prefabsTab.prefabs[uuid] = new Prefab(uuid, project);
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

			delete prefabsTab.prefabs[uuid];
			delete projectTab.project.prefabs[uuid];
		},

		onTabActive: function() {
			prefabsTab.group.visible = true;

			// Clear out the model list, except for "<Select model>"
			while(prefabsTab.elements.modelList.children.length > 1) {
				prefabsTab.elements.modelList.removeChild(prefabsTab.elements.modelList.children[1]);
			}

			// Add an option for every existing model
			for(let key in modelsTab.models) {
				let option = document.createElement("option");
				option.value = key;
				option.text = key;
				prefabsTab.elements.modelList.appendChild(option);
			}
		},

		onTabInactive: function() {
			prefabsTab.group.visible = false;
		}
	};
}();

export { prefabsTab };
