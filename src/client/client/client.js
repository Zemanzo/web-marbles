import { renderCore } from "../render/render-core";
import "./render"; // "Initialization" aka temporary function override
import { levelManager } from "../level-manager";
import { game } from "./game";
import { networking } from "./networking";

// Initialize client modules
networking.initialize();
renderCore.initialize();
levelManager.initialize();
game.initialize();
