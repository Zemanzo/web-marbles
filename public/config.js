const config = {};

config.controls = {};
config.controls.camera = {};
config.controls.camera.speed = 150;

config.network = {};
config.network.tickrate = 10;
config.network.ticksToLerp = 2;
config.network.websockets = {};
config.network.websockets.port = 3014;
config.network.websockets.ssl = false;

config.graphics = {};
config.graphics.castShadow = {};
config.graphics.castShadow.marbles = true;
config.graphics.receiveShadow = {};
config.graphics.receiveShadow.marbles = false;

module.exports = config;
