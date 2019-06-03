import { renderCore } from "../render/render-core";
import { levelManager } from "../level-manager";
import { game } from "./game";
import { networking } from "./networking";
import { marbleManager } from "../marble-manager";

// Initialize client modules
networking.initialize();
renderCore.initialize();
levelManager.initialize();
marbleManager.initialize();
game.initialize();

function clientUpdate() {
	levelManager.activeLevel.update();
	networking.update();
}

renderCore.clientUpdateCallback = clientUpdate;
