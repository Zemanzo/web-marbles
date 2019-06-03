import * as THREE from "three";
import * as config from "./config";
import { renderCore } from "./render/render-core";
import * as Cookies from "js-cookie";

let _userData = Cookies.getJSON("user_data");

// This module manages all the marbles that physically exist in the scene.
let marbleManager = function() {
	let _marbles = []; // Array of marbles that currently exist in the scene
	return {
		marbleGroup: null, // Group containing marble instances
		marbleNames: null, // Group containing name sprites

		initialize: function() {
			this.marbleGroup = new THREE.Group();
			this.marbleNames = new THREE.Group();
			renderCore.getMainScene().add(this.marbleGroup);
			renderCore.getMainScene().add(this.marbleNames);
		},

		spawnMarble: function(data) {
			let marbleMesh = new MarbleMesh(data);
			_marbles.push(marbleMesh);
			this.marbleGroup.add(marbleMesh.mesh);
			this.marbleNames.add(marbleMesh.nameSprite);
		},

		// removeMarble: function(id) {
		// 	// TODO
		// },

		clearMarbles: function() {
			for (let marble of _marbles) {
				this.marbleGroup.remove(marble.mesh);
				this.marbleNames.remove(marble.nameSprite);
			}
			_marbles = [];
		},

		updateMarbles: function() {
			// Currently gets overridden in client's render.js
		},

		updateMarbleMeshes: function(newPositions, newRotations, delta) {
			for (let i = 0; i < _marbles.length; i++) {
				// Positions
				_marbles[i].mesh.position.x = THREE.Math.lerp(_marbles[i].mesh.position.x || 0, newPositions[i * 3 + 0], delta);
				_marbles[i].mesh.position.y = THREE.Math.lerp(_marbles[i].mesh.position.y || 0, newPositions[i * 3 + 2], delta);
				_marbles[i].mesh.position.z = THREE.Math.lerp(_marbles[i].mesh.position.z || 0, newPositions[i * 3 + 1], delta);

				// Rotations
				_marbles[i].mesh.quaternion.set(
					newRotations[i * 4 + 0],
					newRotations[i * 4 + 1],
					newRotations[i * 4 + 2],
					newRotations[i * 4 + 3]
				);

				// Also update the nameSprite position
				if (_marbles[i].nameSprite) {
					_marbles[i].nameSprite.position.x = (_marbles[i].mesh.position.x || 0);
					_marbles[i].nameSprite.position.y = (_marbles[i].mesh.position.y || 0) + _marbles[i].size - .1;
					_marbles[i].nameSprite.position.z = (_marbles[i].mesh.position.z || 0);
				}
			}
		}
	};
}();

// Marbles
const MarbleMesh = function(tags) {
	this.size = tags.size;
	this.color = tags.color;
	this.name = tags.name;

	this.geometry = new THREE.SphereBufferGeometry(this.size, 9, 9);
	this.materialColor = new THREE.Color(this.color);
	this.material = new THREE.MeshStandardMaterial({ color: this.materialColor });
	this.mesh = new THREE.Mesh(this.geometry, this.material);

	// Useful for debugging
	this.mesh.name = `Marble (${tags.name})`;

	// Shadows
	this.mesh.castShadow = config.graphics.castShadow.marbles;
	this.mesh.receiveShadow = config.graphics.receiveShadow.marbles;

	// Highlight own name
	let nameSpriteOptions = {};
	if (_userData && _userData.username === this.name) {
		nameSpriteOptions.color = "#BA0069";
	}

	// Add name sprite (we avoid parenting, because this will also cause it to inherit the rotation which we do not want)
	this.nameSprite = makeTextSprite(this.name, nameSpriteOptions);
};

const makeTextSprite = function(message, options = {}) {
	let fontFamily = options.fontFamily || "Courier New";
	let fontSize = 48;

	let canvas = document.createElement("canvas");
	canvas.width = 512;
	canvas.height = 128;

	let context = canvas.getContext("2d");
	context.font = `Bold ${fontSize}px ${fontFamily}`;
	context.textAlign = "center";
	context.fillStyle = options.color || "#ffffff";
	context.fillText(message, 256, fontSize);

	// Canvas contents will be used for a texture
	let texture = new THREE.Texture(canvas);
	texture.needsUpdate = true;

	let spriteMaterial = new THREE.SpriteMaterial({ map: texture });
	let sprite = new THREE.Sprite(spriteMaterial);
	sprite.scale.set(4, 1, 1.0);

	return sprite;
};

export {
	marbleManager
};
