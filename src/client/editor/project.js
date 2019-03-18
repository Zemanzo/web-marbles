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

	this.world = {
		waterHeight: -9,
		sunInclination: 0.25
	};
}

Project.prototype.addModel = function(name, fileContents) {
	this.models[name] = {
		data: fileContents
	};
	return this.models[name];
};

Project.prototype.import = function() {
	// TODO: It.
};

// Exports project to a file. If exportAsMap is true, all unused prefabs/models will be omitted
Project.prototype.export = function(exportAsMap, useCompression) {
	console.log(`exportAsMap: ${exportAsMap}, useCompression: ${useCompression}`);
	console.log(this);
	// TODO: Also it.
};

export { Project };
