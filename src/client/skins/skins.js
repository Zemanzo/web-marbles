import * as THREE from "three";
import { renderCore } from "../render/render-core";
import { levelManager } from "../level-manager";
import { marbleManager } from "../marble-manager";
import { cameras } from "../render/cameras";
import domReady from "../dom-ready";

// Set up core (rendering, level & marble management)
renderCore.initialize(cameras.CAMERA_FREE);
renderCore.updateCallback = function(deltaTime) {
	levelManager.activeLevel.update(deltaTime);

	if (_rotateMarbles) {
		_leftMesh.rotation.x += .01;
		_leftMesh.rotation.y += .01;
		_leftMesh.rotation.z += .01;

		_rightMesh.rotation.x += .01;
		_rightMesh.rotation.y += .01;
		_rightMesh.rotation.z += .01;
	}
};
levelManager.initialize();
marbleManager.initialize();

// Add marbles
let _rotateMarbles = false;
let _marble = {
	skinId: "default",
	color: "#ffffff"
};
_marble.geometry = new THREE.SphereBufferGeometry(1, 32, 32);
_marble.materialColor = new THREE.Color(_marble.color);
_marble.material = new THREE.MeshStandardMaterial({
	color: _marble.materialColor,
	roughness: .9,
	metalness: 0,
	map: marbleManager.getSkin(_marble.skinId)
});


// Left mesh
let _leftMesh = new THREE.Mesh(_marble.geometry, _marble.material);
_leftMesh.position.x = renderCore.activeCamera.camera.position.x - 1.3;
_leftMesh.position.y = renderCore.activeCamera.camera.position.y - 1;
_leftMesh.position.z = renderCore.activeCamera.camera.position.z - 3;
renderCore.mainScene.add(_leftMesh);

// Right mesh
let _rightMesh = new THREE.Mesh(_marble.geometry, _marble.material);
_rightMesh.position.x = renderCore.activeCamera.camera.position.x + 1.3;
_rightMesh.position.y = renderCore.activeCamera.camera.position.y - 1;
_rightMesh.position.z = renderCore.activeCamera.camera.position.z - 3;
_rightMesh.rotation.y = Math.PI;
renderCore.mainScene.add(_rightMesh);

domReady.then(() => {
	for (let skinEntry of document.getElementsByClassName("skinEntry")) {
		// Add click event for every entry in the list of skins
		skinEntry.addEventListener("click", () => {
			let selected = skinEntry.parentNode.getElementsByClassName("selected")[0];
			if (selected) selected.classList.remove("selected");
			skinEntry.classList.add("selected");
			_marble.material.map = marbleManager.getSkin(skinEntry.dataset.skinId);
		}, false);

		// Also add the image in front
		skinEntry.getElementsByClassName("color")[0].style.backgroundImage = `url("resources/skins/${skinEntry.dataset.skinId}.png")`;
	}

	// Add functionality for automatically rotating the marbles
	document.getElementById("toggleRotate").addEventListener("change", function() {
		console.log(this.checked);
		_rotateMarbles = this.checked;
	}, false);
});
