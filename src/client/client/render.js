import { renderCore } from "../render/render-core";
import { net as networking } from "./networking";
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
