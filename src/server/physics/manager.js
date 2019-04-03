const Ammo = require("ammo")();
const config = require("../config");
const maps = require("../maps/manager");

const world = require("./world")(Ammo, config);
const mapBuilder = require("./map-builder")(Ammo, world, maps);
const marbles = require("./marbles")(Ammo, world, mapBuilder);

module.exports = {
	Ammo,
	world,
	marbles
};
