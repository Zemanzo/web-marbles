import domReady from "../dom-ready";
import * as renderer from "./render";
import { net as networking } from "./networking";
import { game } from "./game";

// If both promises fulfill, start rendering & fill entries field
Promise.all([networking.socketReady, domReady]).then(() => {
	for (let i = 0; i < networking.marbleData.length; i++) {
		game.spawnMarble(networking.marbleData[i]);
	}
	renderer.init();
});
