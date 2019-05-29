import domReady from "../dom-ready";
import "./render";
import { net as networking } from "./networking";
import { game } from "./game";
import { renderCore } from "../render/render-core";
import * as levelManager from "../../level/manager";

// If both promises fulfill, start rendering & fill entries field
Promise.all([networking.socketReady, domReady]).then(() => {
	for (let i = 0; i < networking.marbleData.length; i++) {
		game.spawnMarble(networking.marbleData[i]);
	}
});

// Level loading and initialisation
networking.socketReady.then((initialData) => {
	let levelName = initialData.levelId;

	fetch(`/resources/maps/${levelName}.mmc`)
		.then((response) => {
			// Return as a buffer, since .text() tries to convert to UTF-8 which is undesirable for compressed data
			return response.arrayBuffer();
		})
		.then((buffer) => {
			let levelData = levelManager.load(buffer);
			renderCore.activeLevel.loadLevel(levelData)
				.then( () => {
					if(game.getCurrentGameState() === "started") {
						renderCore.activeLevel.openGates();
					}
				});
		});
});
