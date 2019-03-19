const config = {};

config.controls = {};
config.controls.camera = {};
config.controls.camera.speed = 150;

config.network = {};
config.network.ssl = false;
config.network.tickrate = 10;
config.network.ticksToLerp = 2;
config.network.websockets = {};
config.network.websockets.port = 3014;
config.network.websockets.localReroute = false; // Setting this to true removes the port from client WS requests, useful for local proxying over :80 or :443

config.graphics = {};
config.graphics.castShadow = {};
config.graphics.castShadow.marbles = true;
config.graphics.receiveShadow = {};
config.graphics.receiveShadow.marbles = false;

module.exports = config;
