const Ammo = require("ammo")();
const config = require("../config");

const world = require("./world")(Ammo, config);
const marbles = require("./marbles")(Ammo, world, config);

module.exports = {
	Ammo,
	world,
	marbles
};
