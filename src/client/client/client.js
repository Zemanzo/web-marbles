import { renderCore } from "../render/render-core";
import "./render"; // "Initialization" aka temporary function override
import { levelManager } from "../level-manager";
import domReady from "../dom-ready";
import { game } from "./game";
import { networking } from "./networking";

// Initialize client modules
renderCore.initialize();
levelManager.initialize();
domReady.then( () => {
	game.initialize();
	networking.initialize();
});
