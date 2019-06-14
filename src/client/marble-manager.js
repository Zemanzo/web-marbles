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
		marbleNamesGroup: null, // Group containing name sprites
		marbleGeometry: null,

		initialize: function() {
			this.marbleGroup = new THREE.Group();
			this.marbleNamesGroup = new THREE.Group();
			this.marbleNamesGroup.renderOrder = 1;
			renderCore.mainScene.add(this.marbleGroup);
			renderCore.mainScene.add(this.marbleNamesGroup);

			this.marbleGeometry = new THREE.SphereBufferGeometry(1, 32, 32);
		},

		spawnMarble: function(marbleData) {
			let marbleMesh = new MarbleMesh(marbleData);
			_marbles.push(marbleMesh);
			this.marbleGroup.add(marbleMesh.mesh);
			this.marbleNamesGroup.add(marbleMesh.nameSprite);
			marbleData.mesh = marbleMesh.mesh;
		},

		removeMarble: function(entryId) {
			for (let marble of _marbles) {
				if(marble.entryId === entryId) {
					this.marbleGroup.remove(marble.mesh);
					this.marbleNamesGroup.remove(marble.nameSprite);
					return;
				}
			}
		},

		clearMarbles: function() {
			for (let marble of _marbles) {
				this.marbleGroup.remove(marble.mesh);
				this.marbleNamesGroup.remove(marble.nameSprite);
			}
			_marbles = [];
		},

		setMarbleTransforms: function(newPositions, newRotations) {
			for (let i = 0; i < _marbles.length; i++) {
				// Positions
				_marbles[i].mesh.position.x = newPositions[i * 3 + 0];
				_marbles[i].mesh.position.y = newPositions[i * 3 + 2];
				_marbles[i].mesh.position.z = newPositions[i * 3 + 1];

				// Rotations
				_marbles[i].mesh.quaternion.set(
					newRotations[i * 4 + 0],
					newRotations[i * 4 + 1],
					newRotations[i * 4 + 2],
					newRotations[i * 4 + 3]
				);

				// Also update the nameSprite position
				if (_marbles[i].nameSprite) {
					_marbles[i].nameSprite.position.x = _marbles[i].mesh.position.x;
					_marbles[i].nameSprite.position.y = _marbles[i].mesh.position.y + _marbles[i].size - .1;
					_marbles[i].nameSprite.position.z = _marbles[i].mesh.position.z;
				}
			}
		}
	};
}();

// Marbles
const MarbleMesh = function(marbleData) {
	this.size = marbleData.size;
	this.color = marbleData.color;
	this.name = marbleData.name;
	this.entryId = marbleData.entryId;

	this.geometry = marbleManager.marbleGeometry;
	this.materialColor = new THREE.Color(this.color);
	this.material = new THREE.MeshStandardMaterial({ color: this.materialColor });
	this.mesh = new THREE.Mesh(this.geometry, this.material);

	// Set scale based on marble size
	this.mesh.scale.x = this.mesh.scale.y = this.mesh.scale.z = this.size;

	// Useful for debugging
	this.mesh.name = `Marble (${marbleData.name})`;

	// Shadows
	this.mesh.castShadow = config.graphics.castShadow.marbles;
	this.mesh.receiveShadow = config.graphics.receiveShadow.marbles;

	// Highlight own name
	let nameSpriteOptions = {};
	if (_userData && _userData.id === marbleData.userId) {
		nameSpriteOptions.color = "#BA0069";
		nameSpriteOptions.renderOrder = 9e9;
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

	let spriteMaterial = new THREE.SpriteMaterial({
		map: texture,
		sizeAttenuation: false,
		depthWrite: false,
		depthTest: false
	});

	let sprite = new THREE.Sprite(spriteMaterial);
	sprite.scale.set(0.3, 0.1, 1.0);
	if (options.renderOrder) sprite.renderOrder = options.renderOrder;

	return sprite;
};

export {
	marbleManager
};
