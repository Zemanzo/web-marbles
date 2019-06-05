import { renderCore } from "../render/render-core";
import { levelManager } from "../level-manager";
import { game } from "./game";
import { networking } from "./networking";
import { marbleManager } from "../marble-manager";

// Initialize client modules
networking.initialize();
renderCore.initialize("TrackingCamera");
levelManager.initialize();
marbleManager.initialize();
game.initialize();

function clientUpdate(deltaTime) {
	levelManager.activeLevel.update(deltaTime);
	networking.update(deltaTime);
}

renderCore.updateCallback = clientUpdate;
