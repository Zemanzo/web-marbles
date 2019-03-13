import domReady from "../domReady";
import * as renderer from "./render";
import { net as networking } from "./networking";
import { spawnMarble } from "./game";

// If both promises fulfill, start rendering & fill entries field
Promise.all([networking.socketReady, domReady]).then(() => {
	for (let i = 0; i < networking.marbleData.length; i++) {
		spawnMarble(networking.marbleData[i].meta);
	}
	renderer.init();
	document.getElementById("entries").innerHTML = networking.marbleData.length;
});
