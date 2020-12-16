const utility = require("../../utility");
const skins = require("../skins");
const physicsWorld = require("../../physics/world");

function Marble(id, entryId, name, attributes = {}) {
	this.userId = id;
	this.entryId = entryId;
	this.name = name || "Nightbot";
	this.finished = false;
	this.rank = null;
	this.time = null;

	this.skinId = attributes.skinId || "default";

	// Check if skin supports a custom color
	if(skins.skinList[this.skinId].allowCustomColor) {
		this.color = attributes.color || utility.randomHexColor();
	} else {
		this.color = "#ffffff";
	}

	this.size = attributes.size || 0.2;

	physicsWorld.createMarble(this.entryId, this.size);
}

Marble.prototype.destroyMarble = function() {
	physicsWorld.destroyMarble(this.entryId);
};

module.exports = Marble;
