import * as THREE from "three";
import * as config from "./config";
import { renderCore } from "./render/render-core";
import * as Cookies from "js-cookie";

let _userData = Cookies.getJSON("user_data");

// This module manages all the marbles that physically exist in the scene.
let marbleManager = function() {
	let _skins = {},
		_fallbackSkin = null;

	return {
		marbles: [], // Array of marbles that currently exist in the scene
		marbleGroup: null, // Group containing marble instances
		marbleGeometry: null,

		initialize: function() {
			this.marbleGroup = new THREE.Group();
			renderCore.mainScene.add(this.marbleGroup);

			// Default marble model
			this.marbleGeometry = new THREE.SphereBufferGeometry(1, 32, 32);

			// Default marble texture
			let canvas = document.createElement("canvas");
			canvas.width = 32;
			canvas.height = 32; // who needs pixels anyway

			let context = canvas.getContext("2d");
			context.fillStyle = "#ffffff";
			context.fillRect(0, 0, 32, 32);

			_fallbackSkin = new THREE.TextureLoader().load(
				canvas.toDataURL(),
				undefined,
				undefined,
				function(error) { // error
					console.warn("Unable to load default texture", error);
				}
			);
		},

		spawnMarble: function(marbleData) {
			let marbleMesh = new MarbleMesh(marbleData);
			this.marbles.push(marbleMesh);
			this.marbleGroup.add(marbleMesh.marbleOrigin);
			return marbleMesh.marbleOrigin;
		},

		removeMarble: function(entryId) {
			for(let i = 0; i < this.marbles.length; i++) {
				if(this.marbles[i].entryId === entryId) {
					this.marbleGroup.remove(this.marbles[i].marbleOrigin);
					this.marbles.splice(i, 1);
					return;
				}
			}
		},

		clearMarbles: function() {
			for (let marble of this.marbles) {
				this.marbleGroup.remove(marble.marbleOrigin);
			}
			this.marbles = [];
		},

		getSkin: function(id) {
			if (!_skins[id]) {
				_skins[id] = new THREE.TextureLoader().load(
					`resources/skins/${id}.png`,
					undefined,
					undefined,
					function(error) { // error
						console.warn(`Unable to load skin as texture (${id})`, error);
						_skins[id] = _fallbackSkin;
					}
				);
			}
			return _skins[id];
		}
	};
}();

// Marbles
const MarbleMesh = function(marbleData) {
	this.size = marbleData.size;
	this.name = marbleData.name;
	this.entryId = marbleData.entryId;
	this.color = marbleData.color;
	this.skinId = marbleData.skinId;

	// The marble's main object, has mesh and name sprite as child objects
	this.marbleOrigin = new THREE.Group();

	this.geometry = marbleManager.marbleGeometry;
	this.materialColor = new THREE.Color(this.color);
	this.material = new THREE.MeshStandardMaterial({
		color: this.materialColor,
		roughness: .9,
		metalness: 0,
		map: marbleManager.getSkin(this.skinId)
	});
	this.mesh = new THREE.Mesh(this.geometry, this.material);
	this.marbleOrigin.add(this.mesh);

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

	// Add name sprite and set a height based on marble size
	this.nameSprite = makeTextSprite(this.name, nameSpriteOptions);
	this.nameSprite.position.y = this.size - 0.1;
	this.marbleOrigin.add(this.nameSprite);
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
	sprite.layers.disable(0);
	sprite.layers.enable(renderCore.SPRITE_LAYER);
	if (options.renderOrder !== undefined) {
		sprite.renderOrder = options.renderOrder;
	} else {
		sprite.renderOrder = 1; // Defaults to 1 to resolve a render order issue with the water
	}

	return sprite;
};

export {
	marbleManager
};
