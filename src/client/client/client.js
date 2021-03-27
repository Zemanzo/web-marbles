import { renderCore } from "../render/render-core";
import { cameras } from "../render/cameras";
import { levelManager } from "../level-manager";
import { game } from "./game";
import { networking } from "./networking";
import { marbleManager } from "../marble-manager";

// Initialize client modules
networking.initialize();
renderCore.initialize(cameras.CAMERA_TRACKING);
levelManager.initialize();
marbleManager.initialize();
game.initialize();
