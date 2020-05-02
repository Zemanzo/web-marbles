const config = require("./config");
const utility = require("../utility");
const permissions = require("./chat/permissions");
const skins = require("./skins");
const physicsWorld = require("../physics/world");

function Marble(id, entryId, name, attributes = {}) {
	this.userId = id;
	this.entryId = entryId;

	// Check for premium permissions
	if (
		config.discord.enabled
		&& skins.skinList[attributes.skinId]
		&& skins.skinList[attributes.skinId].premium
	) {
		if (permissions.memberHasPermission(id, "PREMIUM_SKINS")) {
			this.skinId = attributes.skinId;
		} else {
			this.skinId = "default";
		}
	} else {
		this.skinId = attributes.skinId || "default";
	}

	// Check if skin supports a custom color
	if(skins.skinList[this.skinId].allowCustomColor) {
		this.color = attributes.color || utility.randomHexColor();
	} else {
		this.color = "#ffffff";
	}

	this.name = name || "Nightbot";
	this.size = (Math.random() > .98 ? (.3 + Math.random() * .3) : false) || 0.2;
	this.finished = false;
	this.rank = null;
	this.time = null;

	physicsWorld.createMarble(this.entryId, this.size);
}

Marble.prototype.destroyMarble = function() {
	physicsWorld.destroyMarble(this.entryId);
};

module.exports = Marble;
