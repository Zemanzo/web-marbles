editor.initialize.prefabs = function(){
	// New prefab:
	// Collapse prefab
	let collapse = function(){
		let parent = this.closest(".prefab");
		if ( parent.className.indexOf("collapsed") === -1 ){
			this.children[0].className = "icofont-caret-right"
			parent.className = "prefab collapsed";
		} else {
			this.children[0].className = "icofont-caret-right rotated"
			parent.className = "prefab";
		}
	}
	
	// Delete entity
	let deleteEntity = function(event){
		if (event) event.stopPropagation();		
		let parent = this.closest(".objectList > div");
		let prefabUuid = parent.dataset.prefabUuid;
		let uuid = parent.dataset.uuid;
		let name = parent.getElementsByClassName("name")[0].innerHTML;
		if ( !event || confirm("Are you sure you want to delete this entity? ("+name+") ("+uuid+")") ) {
			// Deselect inspector if it shows currently selected object
			if (editor.inspector.selected === parent)
				editor.inspector.deselect();
			
			// Remove element
			parent.parentNode.removeChild(parent);
			
			// Remove threejs object
			editor.prefabs[prefabUuid].group.remove(
				editor.prefabs[prefabUuid].entities[uuid].sceneObject
			);
			
			delete editor.prefabs[prefabUuid].entities[uuid];
			
		}
		editor.prefabs[prefabUuid].changed = true;
	}
	
	// Delete prefab
	let deletePrefab = function(){
		let parent = this.closest(".prefab");
		let prefabUuid = parent.dataset.uuid;
		let name = parent.getElementsByClassName("prefabName")[0].value;
		if ( confirm("Are you sure you want to delete this prefab? ("+name+") ("+parent.dataset.uuid+")") ) {
			// Deselect inspector
			// TODO: add deselect condition (only need to deselect when selected object is in prefab)
			editor.inspector.deselect();
			
			let children = parent.getElementsByClassName("objectList")[0].children;
			for (let i = children.length; i > 0; i--){
				let child = children[i - 1];
				deleteEntity.call(child);
			}
			
			// Remove world select option element
			editor.elements.worldPrefab.removeChild(editor.prefabs[prefabUuid].option);
			
			if (editor.elements.worldPrefab.children.length == 1){
				editor.elements.worldPrefab.disabled = true;
			}
			
			// Remove world instances
			for (key in editor.prefabs[prefabUuid].instances){
				let instance = editor.prefabs[prefabUuid].instances[key];
				instance.element.parentNode.removeChild(instance.element);
				instance.sceneObject.parent.remove(instance.sceneObject);
			}
			
			// Remove element
			parent.parentNode.removeChild(parent);
			
			delete editor.prefabs[prefabUuid];
		}
	}
	
	// Add template element to prefab
	let addTemplateElement = function(type,parent){
		let clone = document.getElementById("prefab"+type+"Template").cloneNode(true);
		let uuid = generateTinyUUID();
		
		clone.removeAttribute("id");
		clone.dataset.prefabUuid = parent.dataset.uuid;
		clone.dataset.uuid = uuid;
		clone.dataset.type = "entities";
		clone.getElementsByClassName("name")[0].innerHTML = type+editor.entityCount++;
		clone.getElementsByClassName("uuid")[0].innerHTML = uuid;
		clone.getElementsByClassName("delete")[0].addEventListener("click",deleteEntity,false);
		clone.addEventListener("click",editor.inspector.select,false);
		clone = parent.getElementsByClassName("objectList")[0].appendChild(clone);
		editor.prefabs[parent.dataset.uuid].entities[uuid] = {
			element: clone
		};
		editor.prefabs[parent.dataset.uuid].changed = true;
		return uuid;
	}
	
	// Add object to prefab
	let addObject = function(){
		let parent = this.closest(".prefab");
		let uuid = addTemplateElement.call(this,"Object",parent);
		
		let clone = editor.defaultModel.clone();
		editor.prefabs[parent.dataset.uuid].entities[uuid].model = "null";
		editor.prefabs[parent.dataset.uuid].entities[uuid].sceneObject = clone;
		editor.prefabs[parent.dataset.uuid].entities[uuid].sceneObject.userData.functionality = "static";
		editor.prefabs[parent.dataset.uuid].group.add(clone);
	}
	
	// Add collider to prefab
	let addCollider = function(){
		let parent = this.closest(".prefab");
		let uuid = addTemplateElement.call(this,"Collider",parent);
		
		let geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
		let box = new THREE.Mesh( geometry, editor.physicsMaterial );
		editor.prefabs[parent.dataset.uuid].entities[uuid].shape = "box";
		let sceneObject = editor.prefabs[parent.dataset.uuid].entities[uuid].sceneObject = box;
		sceneObject.userData.radius = 1;
		sceneObject.userData.width = 1;
		sceneObject.userData.height = 1;
		sceneObject.userData.depth = 1;
		sceneObject.userData.functionality = "static";
		editor.prefabs[parent.dataset.uuid].group.add(box);
	}
	
	// Toggle prefab visibility
	let showPrefab = function(){
		let parent = this.closest(".prefab");
		let prefabUuid = parent.dataset.uuid;
		let prefabGroup = editor.prefabs[prefabUuid].group;
		let icon = this.getElementsByTagName("i")[0];
		
		if (prefabGroup.visible){
			prefabGroup.visible = false;
			icon.className = "icofont-eye-blocked";
		} else {
			prefabGroup.visible = true;
			icon.className = "icofont-eye";
		}
	}
	
	// Change prefab name
	let namePrefab = function(){
		let parent = this.closest(".prefab");
		let prefabUuid = parent.dataset.uuid;
		editor.prefabs[prefabUuid].option.text = this.value+" ("+prefabUuid+")";
		for ( key of Object.keys(editor.prefabs[prefabUuid].instances) ){
			let instance = editor.prefabs[prefabUuid].instances[key];
			instance.element.getElementsByClassName("prefabName")[0].innerText = this.value;
		}
	}
	
	// Change prefab color
	let colorPrefab = function(){
		let parent = this.closest(".prefab");
		let prefabUuid = parent.dataset.uuid;
		for ( key of Object.keys(editor.prefabs[prefabUuid].instances) ){
			let instance = editor.prefabs[prefabUuid].instances[key];
			instance.element.getElementsByClassName("prefabName")[0].style.background = this.value;
		}
	}
	
	// Actually add the prefab
	document.getElementById("addPrefab").addEventListener("click",function(){
		let clone = document.getElementById("prefabTemplate").cloneNode(true); // deep clone
		let uuid = generateTinyUUID();
		clone.removeAttribute("id");
		clone.dataset.uuid = uuid;
		
		// Add events
		clone.getElementsByClassName("showPrefab")[0].addEventListener("click",showPrefab,false);
		clone.getElementsByClassName("prefabName")[0].addEventListener("input",namePrefab,false);
		clone.getElementsByClassName("prefabName")[0].addEventListener("change",namePrefab,false);
		clone.getElementsByClassName("prefabColor")[0].addEventListener("change",colorPrefab,false);
		clone.getElementsByClassName("collapse")[0].addEventListener("click",collapse,false);
		clone.getElementsByClassName("delete")[0].addEventListener("click",deletePrefab,false);
		clone.getElementsByClassName("addObject")[0].addEventListener("click",addObject,false);
		clone.getElementsByClassName("addCollider")[0].addEventListener("click",addCollider,false);
		
		// Set random color
		clone.getElementsByClassName("prefabColor")[0].value = hslToHex(
			Math.random()*360,
			100,
			Math.random()*20 + 20
		);
		
		// Remove entity templates from clone
		clone.getElementsByClassName("objectList")[0].innerHTML = "";
		
		// Display UUID
		clone.getElementsByClassName("detailsID")[0].innerHTML = uuid;
		
		// Add to editor object
		editor.prefabs[uuid] = {
			uuid: uuid,
			group: new THREE.Group(),
			entities: {},
			instances: {}
		};
		
		// Add option to prefab world list
		let select = editor.elements.worldPrefab;
		let option = document.createElement("option");
		option.text = "("+uuid+")";
		option.value = uuid;
		editor.prefabs[uuid].option = select.appendChild(option);
		
		if (select.disabled) select.disabled = false;
		
		// Add threejs group to scene
		editor.groups.prefabs.add(editor.prefabs[uuid].group);
		
		// Add to DOM
		let prefabList = document.getElementById("prefabsList");
		editor.prefabs[uuid].element = clone = prefabList.insertBefore(clone,document.getElementById("addPrefab"));
		
		// Focus to name input so user can start typing right away
		clone.getElementsByClassName("prefabName")[0].focus();
	}, false);
}