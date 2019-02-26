import domReady from "../domReady";
import * as renderer from "./render";
import { net as networking } from "./networking";
import { spawnMarble } from "./game";

// If both promises fulfill, start rendering & fill entries field
Promise.all([networking.socketReady, domReady]).then(() => {
	for (let i = 0; i < networking.marblePositions.length / 3; i++) {
		spawnMarble(networking.marbleData[i].tags);
	}
	renderer.init();
	document.getElementById("entries").innerHTML = networking.marbleData.length;
});

window.addEventListener("DOMContentLoaded", function() {
	// Fix camera
	/* document.getElementById("fixCam").addEventListener("click", function(){
		controls.getObject().position.x = 0;
		controls.getObject().position.y = 0;
		controls.getObject().position.z = 0;
	},false); */
}, false);
