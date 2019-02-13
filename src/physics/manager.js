const Ammo = require("ammo-node");

module.exports = function(config) {
	const world = require("./world")(Ammo, config);
	const marbles = require("./marbles")(Ammo, world, config);

	return {
		world: world.physics,
		map: world.map,
		gateBody: world.gateBody,
		openGate: world.openGate,
		closeGate: world.closeGate,

		marbles
	};
};
