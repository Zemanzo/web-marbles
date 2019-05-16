function Level() {
	this.levelName = "New level";
	this.authorName = "Unknown";
	this.version = "0.2.1";
	this.type = "project";
	this.exportDate = 0;

	this.gameplay = {
		gravity: 10,
		roundLength: 160
	};

	this.models = {};
	this.prefabs = {};
	this.worldObjects = {};

	this.world = {
		waterLevel: -9,
		sunInclination: 0.25
	};
}

Level.prototype.addModel = function(name, fileContents) {
	this.models[name] = {
		file: fileContents,
		convexData: null,
		concaveData: {}
	};
	return this.models[name];
};

Level.prototype.addPrefab = function(uuid) {
	this.prefabs[uuid] = {
		entities: {}
	};
	return this.prefabs[uuid];
};

Level.prototype.addWorldObject = function(uuid, prefabUuid) {
	this.worldObjects[uuid] = {
		prefab: prefabUuid
	};
	return this.worldObjects[uuid];
};

Level.prototype.getLevelId = function() {
	return `${this.levelName}_${this.exportDate}`;
};

Level.prototype.validateLevel = function() {
	// Fix/add any level properties that can easily be fixed
	// This may also help with backward compatibility later

	let validateObject = function(source, template) {
		for(let key in template) {
			if(typeof source[key] !== typeof template[key]) {
				source[key] = template[key];
				console.log(`Level validation: Reset value for "${key}"`);
			}
		}
		for(let key in source) {
			if(typeof source[key] !== typeof template[key]) {
				delete source[key];
				console.log(`Level validation: Removed unused property "${key}"`);
			}
		}
	};
	let template = new Level();
	validateObject(this, template);
	validateObject(this.world, template.world);
	validateObject(this.gameplay, template.gameplay);
};

module.exports = Level;
