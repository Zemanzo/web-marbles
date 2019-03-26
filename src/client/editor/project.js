import { editorLog } from "./log";
import SerializeWorker from "./serialize.worker";
import * as pako from "pako";
import { worldTab } from "./world";
import { prefabsTab } from "./prefabs";
import { modelsTab } from "./models";

function Project() {
	this.mapName = "New map";
	this.authorName = "Nameless marblemapmaker";

	this.gameplay = {
		defaultEnterPeriod: 40,
		roundLength: 160,
		timeUntilDnf: 40
	};

	this.models = {};
	this.prefabs = {};
	this.worldObjects = {};

	this.world = {
		waterLevel: -9,
		sunInclination: 0.25
	};
}

Project.prototype.addModel = function(name, fileContents) {
	this.models[name] = {
		data: fileContents
	};
	return this.models[name];
};

Project.prototype.addPrefab = function(uuid) {
	this.prefabs[uuid] = {
		entities: {}
	};
	return this.prefabs[uuid];
};

Project.prototype.addWorldObject = function(uuid, prefabUuid) {
	this.worldObjects[uuid] = {
		prefab: prefabUuid
	};
	return this.worldObjects[uuid];
};

Project.prototype.validateProject = function() {
	// Fix/add any project properties that can easily be fixed
	// This may also help with backward compatibility later

	let validateObject = function(source, template) {
		for(let key in template) {
			if(typeof source[key] !== typeof template[key]) {
				source[key] = template[key];
				console.log(`Reset value for ${key}`);
			}
		}
		for(let key in source) {
			if(typeof source[key] !== typeof template[key]) {
				delete source[key];
				console.log(`Removed unused property ${key}`);
			}
		}
	};
	let template = new Project();
	validateObject(this, template);
	validateObject(this.world, template.world);
	validateObject(this.gameplay, template.gameplay);
};


let projectTab = function() {
	let _worker = new SerializeWorker();
	let _exportActive = false;

	_worker.onmessage = function(message) {
		switch(message.data.type) {
		case "log":
			editorLog(message.data.payload.message, message.data.payload.type);
			break;

		case "error":
			editorLog(`Serialization failed: ${message.data.payload}`, "error");
			_exportActive = false;
			break;

		case "publishSuccess": {
			let a = document.createElement("a");
			a.href = message.data.payload.url;
			a.download = message.data.payload.filename;
			document.body.appendChild(a);
			a.click();
			setTimeout(function() {
				document.body.removeChild(a); window.URL.revokeObjectURL(message.data.payload.url);
			}, 0 );
			_exportActive = false;
		}
			break;

		default:
			console.log("Unknown worker message", message);
			break;
		}
	};

	_worker.onerror = function(error) {
		editorLog(`Serialization failed: ${error.message}`, "error");
		console.log(`Worker error: ${error.message}`);
		console.log(error);
		_exportActive = false;
	};

	return {
		project: null,

		initialize: function() {
			this.project = new Project();

			// Project button events
			document.getElementById("importProjectFile").addEventListener("change", function() {
				let file = this.files[0];
				file.reader = new FileReader();
				file.reader.onload = function() {
					projectTab.importProject(file.reader.result);
				};

				file.reader.onerror = function() {
					editorLog(`Unable to read project file (${file.name}): ${file.reader.error.message}`, "error");
					file.reader.abort();
				};

				file.reader.readAsArrayBuffer(file);
			}, false);
			document.getElementById("exportProject").addEventListener("click", function() {projectTab.exportProject(false, true);}, false);

			// Publish button events
			document.getElementById("exportPublishBinary").addEventListener("click", function() {projectTab.exportProject(true, true);}, false);


			// The following events aren't on the project tab. Some will be, or will be moved elsewhere eventually
			// Change map name
			document.getElementById("paramMapName").addEventListener("change", function() { projectTab.setMapName( this.value ); }, false);
			document.getElementById("paramMapName").addEventListener("input", function() { projectTab.setMapName( this.value ); }, false);

			// Change author name
			document.getElementById("paramAuthorName").addEventListener("change", function() { projectTab.setAuthorName( this.value ); }, false);
			document.getElementById("paramAuthorName").addEventListener("input", function() { projectTab.setAuthorName( this.value ); }, false);

			// Change default enter period
			document.getElementById("paramEnterPeriod").addEventListener("change", function() { projectTab.setEnterPeriod( parseInt(this.value) ); }, false);
			document.getElementById("paramEnterPeriod").addEventListener("input", function() { projectTab.setEnterPeriod( parseInt(this.value) ); }, false);

			// Change maximum round length
			document.getElementById("paramMaxRoundLength").addEventListener("change", function() { projectTab.setMaxRoundLength( parseInt(this.value) ); }, false);
			document.getElementById("paramMaxRoundLength").addEventListener("input", function() { projectTab.setMaxRoundLength( parseInt(this.value) ); }, false);

			// Change time until DNF
			document.getElementById("paramWaitAfterFinish").addEventListener("change", function() { projectTab.setWaitAfterFinish( parseInt(this.value) ); }, false);
			document.getElementById("paramWaitAfterFinish").addEventListener("input", function() { projectTab.setWaitAfterFinish( parseInt(this.value) ); }, false);
		},

		setMapName: function(name) {
			if(!name.length) name = "New map";
			this.project.mapName = name;
		},

		setAuthorName: function(name) {
			if(!name.length) name = "Nameless marblemapmaker";
			this.project.authorName = name;
		},

		setEnterPeriod: function(seconds) {
			this.project.gameplay.defaultEnterPeriod = seconds;
		},

		setMaxRoundLength: function(seconds) {
			this.project.gameplay.roundLength = seconds;
		},

		setWaitAfterFinish: function(seconds) {
			this.project.gameplay.timeUntilDnf = seconds;
		},

		exportProject: function(exportAsLevel, useCompression) {
			if(_exportActive) return;

			let serializationStart = new Date();
			editorLog(`Starting export! (${(new Date()) - serializationStart}ms)`);

			// postMessage will copy the data, so we don't have to worry about it being shared
			// We may want to lock the editor controls and do this async in the future
			let payload = projectTab.project;

			_exportActive = true;
			_worker.postMessage({
				exportAsLevel: exportAsLevel,
				useCompression: useCompression,
				payload: payload,
				serializationStart: serializationStart
			});
		},

		importProject: function(loadedFile) {
			editorLog("Loading project...");
			let loadedProject;
			try {
				let data = pako.inflate(loadedFile);
				let string = new TextDecoder("utf-8").decode(data);
				loadedProject = JSON.parse(string);
			}
			catch(error) {
				editorLog("Unable to load project: Invalid project file.", "error");
				return;
			}

			// Project without these aren't considered valid
			if(typeof loadedProject.models !== "object"
				|| typeof loadedProject.prefabs !== "object"
				|| typeof loadedProject.worldObjects !== "object"
				|| typeof loadedProject.gameplay !== "object"
				|| typeof loadedProject.world !== "object") {
				editorLog("Unable to load project: Missing project properties.", "error");
				return;
			}

			// Clear out current active project
			while(Object.keys(worldTab.worldObjects).length > 0) {
				worldTab.deleteWorldObject(Object.keys(worldTab.worldObjects)[0]);
			}
			while(Object.keys(prefabsTab.prefabs).length > 0) {
				prefabsTab.deletePrefab(Object.keys(prefabsTab.prefabs)[0]);
			}
			while(Object.keys(modelsTab.models).length > 0) {
				modelsTab.removeModel(Object.keys(modelsTab.models)[0]);
			}

			//Initialize loaded project
			this.project = loadedProject;
			Object.setPrototypeOf(this.project, Project.prototype);
			this.project.validateProject();

			let modelLoaders = [];
			for(let key in this.project.models) {
				modelLoaders.push(modelsTab.loadModel(key, this.project.models[key].data, false).catch( error => {return error;}) );
			}

			// Wait for all models to load before continuing
			let modelPromise = Promise.all(modelLoaders);

			modelPromise.then( (results) => {
				let allSuccesses = true;
				for(let i = 0; i < results.length; i++) {
					if(results[i] === "error") {
						allSuccesses = false;
						delete this.project.models[i];
					}
				}

				for(let uuid in this.project.prefabs) {
					prefabsTab.addPrefab(uuid, this.project.prefabs[uuid]);
				}
				for(let uuid in this.project.worldObjects) {
					if(this.project.worldObjects[uuid].prefab in this.project.prefabs)
						worldTab.addWorldObject(uuid, prefabsTab.prefabs[this.project.worldObjects[uuid].prefab], this.project.worldObjects[uuid]);
					else {
						editorLog(`Unable to load worldObject ${this.project.worldObjects[uuid].name} because prefab with UUID ${this.project.worldObjects[uuid].prefab} doesn't exist.`, "error");
					}
				}

				// Non-model/prefab/object loading
				worldTab.onProjectLoad(this.project);
				document.getElementById("paramMapName").value = this.project.mapName;
				document.getElementById("paramAuthorName").value = this.project.authorName;
				document.getElementById("paramEnterPeriod").value = this.project.gameplay.defaultEnterPeriod;
				document.getElementById("paramMaxRoundLength").value = this.project.gameplay.roundLength;
				document.getElementById("paramWaitAfterFinish").value = this.project.gameplay.timeUntilDnf;

				if(!allSuccesses) {
					editorLog("Not all models loaded correctly. Some prefabs may be affected.", "warn");
				} else {
					editorLog("Project loaded successfully!", "success");
				}
			}).catch( (error) => {
				editorLog("Project failed to load. Check the console for details.", "error");
				console.error(error);
			} );
		},

		onTabActive: function() {
			worldTab.onTabActive();
		},

		onTabInactive: function() {
			worldTab.onTabInactive();
		}

	};
}();

export { Project, projectTab };
