import { renderCore } from "../render/render-core";
import { net as networking } from "./networking";
import * as levelManager from "../../level/manager";
import * as config from "../config";

// This will change another time
renderCore.updateMarbles = function() {
	renderCore.updateMarbleMeshes(
		networking.marblePositions,
		networking.marbleRotations,
		networking.lastUpdate
	);

	if (networking.lastUpdate < 1.5) {
		// FPS assumed to be 60, replace with fps when possible, or better: base it on real time.
		networking.lastUpdate += (config.network.tickrate / 60 / config.network.ticksToLerp);
	}
};

networking.socketReady.then((initialData) => {
	let levelName = initialData.levelId;

	fetch(`/resources/maps/${levelName}.mmc`)
		.then((response) => {
			// Return as a buffer, since .text() tries to convert to UTF-8 which is undesirable for compressed data
			return response.arrayBuffer();
		})
		.then((buffer) => {
			let levelData = levelManager.load(buffer);
			renderCore.activeLevel.loadLevel(levelData);
		});
});
