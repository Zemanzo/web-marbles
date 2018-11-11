whenDocReady.add(
	function(){renderInit()},
	"renderInit",
	{
		type:1,
		readyState:"complete"
	}
);

let editor = {
	log: undefined,
	menu: {},
	groups: {
		models: undefined,
		prefabs: undefined,
		world: undefined
	},
	models: {},
	prefabs: {},
	world: {},
	initialize: {},
	selectedModel: null,
	entityCount: 0
};

window.addEventListener("DOMContentLoaded", function(){
	editor.elements = {
		log: document.getElementById("log"),
		worldPrefab: document.getElementById("worldPrefab")
	};

	//

	editor.initialize.inspector();

	//

	editor.initialize.prefabs();

	//

	// Menu
	let childValue = 0;
	for (let child of document.getElementById("editorMode").children){
		child.dataset.nthChild = childValue++;
		child.addEventListener("click", function(){
			let firstElement = document.getElementById("properties").firstElementChild;
			firstElement.style.marginLeft = "-"+parseInt(this.dataset.nthChild) * 100 +"%";

			for (let c of this.parentNode.children){
				c.className = "";
			}

			for (let key in editor.groups){
				editor.groups[key].visible = false;
			}

			editor.inspector.deselect();

			if (parseInt(this.dataset.nthChild) >= 2){
				editor.inspector.element.style.transform = "translateX(100%)";
				if (editor.menu.overflowTimeout) clearTimeout(editor.menu.overflowTimeout);
				document.getElementById("prefabs").style.overflow = "visible";
			} else {
				editor.inspector.element.style.transform = "translateX(0%)";
				editor.menu.overflowTimeout = setTimeout(function(){
					document.getElementById("prefabs").style.overflow = "auto";
				},400);
			}

			if (parseInt(this.dataset.nthChild) === 2){ // World
				for (uuid in editor.prefabs){
					if (editor.prefabs[uuid].changed){
						// update prefab

						let containsStart = Object.keys( editor.prefabs[uuid].entities ).some(
							(key)=>{
								let userData = editor.prefabs[uuid].entities[key].sceneObject.userData;
								return (userData.functionality && userData.functionality === "startarea");
							}
						);

						for (key in editor.prefabs[uuid].instances){
							let instance = editor.prefabs[uuid].instances[key];
							let old = instance.sceneObject;

							let clone = editor.prefabs[uuid].group.clone();

							clone.position.copy(old.position);

							if (containsStart) {
								clone.rotation.setFromVector3( new THREE.Vector3(0,0,0) );
							} else {
								clone.rotation.copy(old.rotation);
							}

							old.parent.add(clone);

							old.parent.remove(old);

							instance.sceneObject = clone;
							instance.sceneObject.visible = true; // Do not copy visibility setting from prefab
						}

						// world instances are updated
						editor.prefabs[uuid].changed = false;
					}
				}
			}

			if (this.dataset.sceneGroup) editor.groups[this.dataset.sceneGroup].visible = true;

			this.className = "selected";

		}, false);
	}

	// Fix camera
	document.getElementById("fixCam").addEventListener("click", function(event){
		flyCam.controls.getObject().position.x = -2.3;
		flyCam.controls.getObject().position.y = 12;
		flyCam.controls.getObject().position.z = 19.7;
		flyCam.controls.getObject().rotation.z = 0;
		flyCam.controls.getObject().rotation.x = 0;
		flyCam.controls.getObject().rotation.y = 0;
		camera.parent.rotation.x = -.3;
		velocity.z = 0;
		velocity.x = 0;
		velocity.y = 0;
		moveForward = false;
		moveBackward = false;
		moveLeft = false;
		moveRight = false;
	}, false);

	//

	// Add models
	let GLTFLoader = new THREE.GLTFLoader();
    document.getElementById("addModelFile").addEventListener("change", function(e) {
		Array.from(this.files).forEach(function(file){
			file.reader = new FileReader();
			file.reader.onload = function(e) {
				let result = file.reader.result;
				// parse using your corresponding loader
				GLTFLoader.parse(
					result,	null,
					function(model){
						model.userData.name = file.name;
						if (!Object.keys(editor.models).some((key)=>{ // Check if model is already loaded
							return key === file.name;
						})){
							// Add to model list
							let clone = document.getElementById("modelTemplate").cloneNode(true); // deep clone
							clone.id = file.name;
							clone.getElementsByClassName("name")[0].innerHTML = file.name;
							clone.getElementsByClassName("name")[0].addEventListener("mousedown",function(){
								if (editor.selectedModel){
									editor.models[editor.selectedModel].scene.visible = false;
									document.getElementById(editor.selectedModel).className = "model";
								}
								editor.selectedModel = this.parentNode.id;
								editor.models[editor.selectedModel].scene.visible = true;
								document.getElementById(editor.selectedModel).className = "model selected";
							}, false);

							// Delete model
							clone.getElementsByClassName("delete")[0].addEventListener("click",function(){
								let parent = this.parentNode;
								let id = parent.id;
								if ( confirm("Are you sure you want to delete this model? ("+id+")") ) {
									if (editor.selectedModel === id) editor.selectedModel = null;
									editor.groups.models.remove(editor.models[id].scene);
									delete editor.models[id];
									let select = document.getElementById("inspectorModel");
									let index = Array.from(select.children).findIndex((el)=>{
										return el.value === id;
									}, false);
									select.remove(index);
									parent.parentNode.removeChild(parent); // oofies
									editorLog("Removed model ("+id+")","warn");
								}
							}, false);

							// Add to select drop-down
							let select = document.getElementById("inspectorModel");
							let option = document.createElement("option");
							option.text = file.name;
							option.value = file.name;
							select.add(option);

							// Add to DOM
							let modelList = document.getElementById("models");
							clone = modelList.appendChild(clone);

							// Add to scene
							editor.groups.models.add(model.scene);
							model.scene.visible = false;

							editor.models[file.name] = model;
							editorLog("Loaded model: "+file.name,"info");
						} else {
							editorLog("Model already loaded. ("+file.name+")","error");
						}
					}, function(error){
						console.log(error);
					}
				);
			}
			file.reader.readAsText(file, "utf-8");
		});
    }, false);

	// World

	// Change water level
	let changeWaterLevel = function(e){
		water.position.y = this.value;
	}
	document.getElementById("envWaterHeight").addEventListener("change",changeWaterLevel,false);
	document.getElementById("envWaterHeight").addEventListener("input",changeWaterLevel,false);

	// Change sun inclination
	let changeSunInclination = function(e){
		parameters.inclination = this.value;
		updateSun();
	}
	document.getElementById("envSunInclination").addEventListener("change",changeSunInclination,false);
	document.getElementById("envSunInclination").addEventListener("input",changeSunInclination,false);

	// Add world prefab
	let addWorldPrefab = function(){
		let prefabUuid = editor.elements.worldPrefab.value;
		if (
			!editor.elements.worldPrefab.disabled &&
			prefabUuid !== "null"
		) {
			let clone = document.getElementById("worldPrefabTemplate").cloneNode(true); // deep clone
			let uuid = generateTinyUUID();
			clone.removeAttribute("id");
			clone.dataset.uuid = uuid;
			clone.dataset.prefabUuid = prefabUuid;
			clone.dataset.type = "instances";

			// Add select event
			clone.addEventListener("click",editor.inspector.select,false);

			// Add name & prefab name
			clone.getElementsByClassName("name")[0].innerText =
			clone.getElementsByClassName("prefabName")[0].innerText =
				editor.prefabs[prefabUuid].element.getElementsByClassName("prefabName")[0].value;

			clone.getElementsByClassName("prefabName")[0].style.background =
				editor.prefabs[prefabUuid].element.getElementsByClassName("prefabColor")[0].value;

			// Add uuid
			clone.getElementsByClassName("uuid")[0].innerHTML = uuid;

			// Add prefab uuid
			clone.getElementsByClassName("prefabName")[0].title = prefabUuid;

			// Add threejs group to scene
			let groupClone = editor.prefabs[prefabUuid].group.clone();
			editor.groups.world.add( groupClone );
			groupClone.visible = true;

			// Add to DOM
			let hierarchy = document.getElementById("worldHierarchy");
			let element = hierarchy.insertBefore(clone,document.getElementById("worldPrefabTemplate"));

			// Add instance reference to parent prefab
			editor.prefabs[prefabUuid].instances[uuid] = {
				uuid: uuid,
				sceneObject: groupClone,
				element: element
			};

		}
	}
	document.getElementById("worldAddPrefabButton").addEventListener("click", addWorldPrefab, false);

	let exportPublishBinary = function(){
		editor.serialization.worker.postMessage({
			type: 'exportPublishBinary',
			payload: editor.serialization.preparePayload()
		});
	}
	document.getElementById("exportPublishBinary").addEventListener("click", exportPublishBinary, false);

}, false);

// Spawn serialization worker
editor.serialization = {};
editor.serialization.worker = new Worker('scripts/editor/serialize_worker.js');
editor.serialization.asyncToJson = function(obj){
	return new Promise(resolve => {
		resolve(obj = obj.toJSON());
	});
}
editor.serialization.preparePayload = function(){
	let promises = [];
	let prefabs = {};
	Object.keys(editor.prefabs).forEach(key => {
		prefabs[key] = Object.assign({}, editor.prefabs[key]);
		delete prefabs[key].element;
		delete prefabs[key].option;
		prefabs[key].group = prefabs[key].group.toJSON();
		Object.keys(prefabs[key].entities).forEach(entity => {
			delete prefabs[key].entities[entity].element;
			delete prefabs[key].entities[entity].terrainGeometry;
			prefabs[key].entities[entity].sceneObject = prefabs[key].entities[entity].sceneObject.toJSON();
		});
	});

	let models = {};
	Object.keys(editor.models).forEach(key => {
		models[key] = Object.assign({}, editor.models[key]);
		delete models[key].animations;
		delete models[key].asset;
		delete models[key].cameras;
		delete models[key].parser;
		delete models[key].scenes;
		promises.push(editor.serialization.asyncToJson(models[key].scene));
	});

	console.log(promises);
	Promise.all(promises).then(()=>{
		let payload = {
			params: {
				title: document.getElementById("paramMapName").value,
				author: document.getElementById("paramAuthorName").value,
				enterPeriod: document.getElementById("paramEnterPeriod").value,
				maxRoundLength: document.getElementById("paramMaxRoundLength").value,
				waitAfterFinish: document.getElementById("paramWaitAfterFinish").value,
			},
			models: models,
			prefabs: prefabs
		};
		console.log(payload);

		return payload;
	})
}
editor.serialization.worker.onmessage = function(message){
	switch(message.data.type){
		case 'log':
			editorLog(message.data.payload.message, message.data.payload.type);
			break;
		default:
			console.log('Unknown worker message', message);
			break;
	}
}


// Classic XHR snippet
function getXMLDoc(doc, callback){
	let xmlhttp;
	xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState === 4 && xmlhttp.status !== 200) {
			console.log("rip", xmlhttp.response);
  		} else if (callback && xmlhttp.readyState === 4 && xmlhttp.status === 200){
			callback(xmlhttp.response);
		}
	}
	xmlhttp.open("GET", doc, true);
	xmlhttp.send();
}

function editorLog(message, type = 'info'){
	let date = new Date();
	let hrs = date.getHours();
	let min = date.getMinutes();
	let sec = date.getSeconds();
	if (hrs < 10){
		hrs = "0"+hrs;
	}
	if (min < 10){
		min = "0"+min;
	}
	if (sec < 10){
		sec = "0"+sec;
	}
	editor.elements.log.insertAdjacentHTML(
		"beforeend",
		"<div class='"+type+"'>["+hrs+":"+min+":"+sec+"] "+message+"</div>"
	);
}

let TUUIDs = [];
let charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function generateTinyUUID(){
	let l = 4;
	let possibilities = Math.pow(charset.length,l);
	let timeString = (new Date()).getTime().toString();
	let decimal = parseInt(timeString.substr(timeString.length - possibilities.toString().length)) % possibilities;
	while(TUUIDs.indexOf(decimal) !== -1){
		decimal++;
	}
	TUUIDs.push(decimal);
	let tUUID = "";
	for (let i = 0; i < l; i++){
		let remain = decimal % charset.length;
		decimal = (decimal - remain) / charset.length;
		tUUID += charset.substr(remain,1);
	}
	return tUUID.split("").reverse().join("");
}

// hslToHex courtesy of icl7126 and Abel Rodríguez at
// https://stackoverflow.com/questions/36721830/convert-hsl-to-rgb-and-hex
function hslToHex(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = x => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

window.onbeforeunload = function(e) {
	var dialogText = "Leave? You might lose unsaved changes!";
	e.returnValue = dialogText;
	return dialogText;
};
