import { editorLog } from "./log";
import SerializeWorker from "./serialize.worker";

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
		
			document.getElementById("exportPublishBinary").addEventListener("click", function() {projectTab.exportProject(true, true);}, false);		
			document.getElementById("exportPublishPlain").addEventListener("click", function() {projectTab.exportProject(true, false);}, false);
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

		onTabActive: function() {

		},

		onTabInactive: function() {

		}

	};
}();

export { Project, projectTab };
