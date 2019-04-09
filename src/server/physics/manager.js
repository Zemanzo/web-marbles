module.exports = function() {
	return {
		ammo: require("ammo")(),
		world: null,
		shapes: { // Future container for collision shape re-usage
			defaultMarble: null
		}
	};
}();

// Module initialization
module.exports.shapes.defaultMarble = new module.exports.ammo.btSphereShape(0.2);
module.exports.world = require("./world");

// Not-module initialization that has no business happening here
require("./map-builder");
