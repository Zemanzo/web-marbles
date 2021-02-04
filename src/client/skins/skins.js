import { renderCore } from "../render/render-core";
import { levelManager } from "../level-manager";
import { marbleManager } from "../marble-manager";
import { marbleSkins } from "../marble-skins";
import { cameras } from "../render/cameras";
import { updateManager } from "../update-manager";
import domReady from "../dom-ready";

// Set up core (rendering, level & marble management)
renderCore.initialize(cameras.CAMERA_FREE);
const update = function(deltaTime) {
	levelManager.activeLevel.update(deltaTime);

	if (_rotateMarbles) {
		_marbleLeft.rotation.x += .01;
		_marbleLeft.rotation.y += .01;
		_marbleLeft.rotation.z += .01;

		_marbleRight.rotation.x += .01;
		_marbleRight.rotation.y += .01;
		_marbleRight.rotation.z += .01;
	}
};
levelManager.initialize();
marbleManager.initialize();

let _rotateMarbles = false;

// Add marbles
let _marbleData = {
	name: "",
	size: 1,
	color: "#ffffff",
	skinId: "default"
};
let _marbleLeft = marbleManager.spawnMarble(_marbleData);
let _marbleRight = marbleManager.spawnMarble(_marbleData);

// Left mesh
_marbleLeft.position.x = renderCore.activeCamera.camera.position.x - 1.3;
_marbleLeft.position.y = renderCore.activeCamera.camera.position.y - 1;
_marbleLeft.position.z = renderCore.activeCamera.camera.position.z - 3;

// Right mesh
_marbleRight.position.x = renderCore.activeCamera.camera.position.x + 1.3;
_marbleRight.position.y = renderCore.activeCamera.camera.position.y - 1;
_marbleRight.position.z = renderCore.activeCamera.camera.position.z - 3;
_marbleRight.rotation.y = Math.PI;

domReady.then(() => {
	for (let skinEntry of document.getElementsByClassName("skinEntry")) {
		// ID
		let id = skinEntry.dataset.skinId;

		// Load skin material, then add a click listener to the corresponding entry
		marbleSkins.loadSkin(id)
			.then(()=>{
				// Add click event for every entry in the list of skins
				skinEntry.addEventListener("click", () => {
					let selected = skinEntry.parentNode.getElementsByClassName("selected")[0];
					if (selected) selected.classList.remove("selected");
					skinEntry.classList.add("selected");

					marbleSkins.loadSkin(id)
						.then((material) => {
							_marbleLeft.children[0].material = _marbleRight.children[0].material = material;
						});
				}, false);
			});

		// Also add the image in front
		skinEntry.getElementsByClassName("color")[0].style.backgroundImage = `url("resources/skins/${id}/diffuse.png")`;
	}

	// Add functionality for automatically rotating the marbles
	document.getElementById("toggleRotate").addEventListener("change", function() {
		_rotateMarbles = this.checked;
	}, false);
	updateManager.addUpdateCallback(update);
});
