import hydrateRoot from "../hydrate-root";
import RootComponent from "./root-component";
import { networking } from "./networking";
import { levelManager } from "../level-manager";
import { marbleManager } from "../marble-manager";
import { renderCore } from "../render/react-render-core";
import { cameras } from "../render/cameras";
console.log("NEWCLIENT YOOO");

function clientUpdate(deltaTime) {
	levelManager.activeLevel.update(deltaTime);
	networking.update(deltaTime);
}
function onStartAnimateLoop() {
	levelManager.initialize();
	marbleManager.initialize();
}
const isWebGLSupported = renderCore.initialize();
renderCore.onStartAnimateLoop = onStartAnimateLoop;
renderCore.updateCallback = clientUpdate;

hydrateRoot(RootComponent, {
	isWebGLSupported,
	defaultCameraType: cameras.CAMERA_TRACKING,
	clientScripts: {
		networking,
		levelManager,
		marbleManager,
		renderCore
	}
});
