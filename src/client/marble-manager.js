import {
	Group,
	SphereBufferGeometry,
	Mesh,
	Texture,
	Sprite,
	SpriteMaterial,
	MeshBasicMaterial,
	Raycaster,
	BackSide as THREE_BACK_SIDE
} from "three";
import * as config from "./config";
import { renderCore } from "./render/render-core";
import { marbleSkins } from "./marble-skins";
import { userState } from "./user-state";

// This module manages all the marbles that physically exist in the scene.
let marbleManager = function() {
	let _intersectedMarble = null;
	const _raycaster = new Raycaster();

	return {
		marbles: [], // Array of marbles that currently exist in the scene
		marbleMeshes: [], // Array of only the main mesh of all marbles in the scene
		marbleGroup: null, // Group containing marble instances
		marbleGeometry: null,

		initialize: function() {
			this.marbleGroup = new Group();
			renderCore.mainScene.add(this.marbleGroup);

			// Default marble model
			this.marbleGeometry = new SphereBufferGeometry(1, 32, 32);
		},

		spawnMarble: function(marbleData) {
			let marbleMesh = new MarbleMesh(marbleData);
			this.marbles.push(marbleMesh);
			this.marbleMeshes.push(marbleMesh.mesh); // Only the main mesh reference, so we can use it to target for raycasting
			this.marbleGroup.add(marbleMesh.marbleOrigin);
			return marbleMesh.marbleOrigin;
		},

		removeMarble: function(entryId) {
			for(let i = 0; i < this.marbles.length; i++) {
				if(this.marbles[i].entryId === entryId) {
					this.marbleGroup.remove(this.marbles[i].marbleOrigin);
					this.marbleMeshes.splice(i, 1);
					this.marbles.splice(i, 1);
					return;
				}
			}
		},

		clearMarbles: function() {
			for (let marble of this.marbles) {
				this.marbleGroup.remove(marble.marbleOrigin);
			}
			this.marbleMeshes = [];
			this.marbles = [];
		},

		// Gets called in render update loop
		raycastFromCamera: function() {
			// Update raycaster position
			_raycaster.setFromCamera(renderCore.mouse, renderCore.activeCamera.camera);

			// Only check for intersects on marbles
			let intersects = _raycaster.intersectObjects(this.marbleMeshes);
			if (intersects.length > 0) {
				// if the object is the same as last frame, do nothing
				if (intersects[0].object !== _intersectedMarble) {
					if (_intersectedMarble) {
						_intersectedMarble.marbleMeshData.outlineMesh.visible = false;
					}

					_intersectedMarble = intersects[0].object;
					_intersectedMarble.marbleMeshData.outlineMesh.visible = true;
				}
			} else if (_intersectedMarble) {
				_intersectedMarble.marbleMeshData.outlineMesh.visible = false;
				_intersectedMarble = null;
			}
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
	this.marbleOrigin = new Group();

	this.geometry = marbleManager.marbleGeometry;
	this.material = marbleSkins.placeholderMaterial;
	this.mesh = new Mesh(this.geometry, this.material);

	// Load skin
	marbleSkins.loadSkin(this.skinId, this.color)
		.then((skinMaterial) => {
			this.material = this.mesh.material = skinMaterial;
		});

	this.marbleOrigin.add(this.mesh);

	// Set scale based on marble size
	this.mesh.scale.x = this.mesh.scale.y = this.mesh.scale.z = this.size;

	// Useful for debugging
	this.mesh.name = `Marble (${marbleData.name})`;

	// Add reference to this on mesh
	this.mesh.marbleMeshData = this;

	// Shadows
	this.mesh.castShadow = config.graphics.castShadow.marbles;
	this.mesh.receiveShadow = config.graphics.receiveShadow.marbles;

	// Highlight own name
	let nameSpriteOptions = {};
	if (userState.data && userState.data.id === marbleData.userId) {
		nameSpriteOptions.color = "#BA0069";
		nameSpriteOptions.renderOrder = 9e9;
	}

	// Add name sprite and set a height based on marble size
	this.nameSprite = makeTextSprite(this.name, nameSpriteOptions);
	this.nameSprite.position.y = this.size - 0.1;
	this.marbleOrigin.add(this.nameSprite);

	// Add outline mesh that gets rendered when targeted
	const outlineMaterial = new MeshBasicMaterial({ color: 0xba0069, side: THREE_BACK_SIDE });
	this.outlineMesh = new Mesh(this.geometry, outlineMaterial);
	this.outlineMesh.visible = false;
	this.outlineMesh.scale.multiplyScalar(1.05);
	this.mesh.add(this.outlineMesh);
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
	let texture = new Texture(canvas);
	texture.needsUpdate = true;

	let spriteMaterial = new SpriteMaterial({
		map: texture,
		sizeAttenuation: false,
		depthWrite: false,
		depthTest: false
	});

	let sprite = new Sprite(spriteMaterial);
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
