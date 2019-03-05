const config = {};
config.controls = {
	camera: {
		speed: 150
	}
};
config.network = {
	tickrate: 10,
	ticksToLerp: 2,
	websockets: {
		port: 3014,
		ssl: false
	}
},
config.graphics = {
	castShadow: {
		marbles: true
	},
	receiveShadow: {
		marbles: false
	}
};

module.exports = config;
