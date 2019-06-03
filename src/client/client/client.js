import { renderCore } from "../render/render-core";
import { levelManager } from "../level-manager";
import { game } from "./game";
import { networking } from "./networking";
import { marbleManager } from "../marble-manager";
import "./render"; // "Initialization" aka temporary function override

// Initialize client modules
networking.initialize();
renderCore.initialize();
levelManager.initialize();
marbleManager.initialize();
game.initialize();
