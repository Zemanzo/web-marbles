import * as THREE from "three";
import * as config from "./config";
import { renderCore } from "./render/render-core";
import { userState } from "./user-state";

// This module manages all the marbles that physically exist in the scene.
let marbleManager = function() {
	let _skins = {},
		_fallbackDiffuse = null;

	let _shaderUniforms = {
		"time": { value: 1.0 }
	};

	const _applySkin = function(marbleData) {
		let skinMeta = _skins[marbleData.skinId];
		if (skinMeta.customShader) {
			marbleData.mesh.material = skinMeta.material;
			console.log(marbleData.mesh.material);
		} else {
			if (skinMeta.diffuse) {
				marbleData.material.map = skinMeta.diffuse;
			}
			if (skinMeta.normal) {
				marbleData.material.normalMap = skinMeta.normal;
			}
		}

		marbleData.material.needsUpdate = true;
		console.log(marbleData.mesh);
	};

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

			_fallbackDiffuse = new THREE.TextureLoader().load(
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

		getSkin: function(marbleData) {
			let skinId = marbleData.skinId;
			if (!_skins[skinId]) {
				// Fetch skin meta. It will attempt to download the meta file that belongs to the skin ID.
				// It will then parse to form the final material.
				fetch(`resources/skins/${skinId}/meta.json`)
					.then((response) => {
						if (response.ok) {
							return response.json();
						}

						return Promise.reject();
					})
					// Parse meta file
					.then((skinMeta) => {
						_skins[skinId] = skinMeta;
						console.log(skinMeta);

						if (skinMeta.customShader) {
							// Load shader files. This tries to load all shader file types. If loading fails (because
							// it doesn't exist), it will simply ignore that shader file type.
							let files = ["fragment.glsl", "vertex.glsl", "uniforms.json"];
							let shaderFilePromises = [];

							for (let file of files) {
								shaderFilePromises.push(
									fetch(`resources/skins/${skinId}/${file}`)
										.then((response) => {
											if (response.ok) {
												return (file === "uniforms.json" ? response.json() : response.text());
											}

											return undefined;
										})
								);
							}

							return Promise.all(shaderFilePromises)
								.then((values) => {
									// TODO: parse potential constants (like vec3) in uniforms json.

									// Copy new uniforms into live-updating object.
									// if (values[2]) {
									// 	Object.assign(renderCore.shaderSkinUniforms, values[2]);
									// }

									// Create the material
									_skins[skinId].material = new THREE.ShaderMaterial({
										fragmentShader: values[0],
										vertexShader: values[1],
										uniforms: _shaderUniforms
									});

									renderCore.shaderMaterials.push(_skins[skinId].material);

									return _skins[skinId].material;
								})
								.then(() => {
									_applySkin(marbleData);
								});
						} else {
							// Load various maps. This tries to load all map types. If loading fails (because
							// it doesn't exist), it will simply ignore that map type.
							let mapTypes = ["diffuse", "normal"];
							let mapTexturePromises = [];

							// Load every map type as a texture. The texture loader has been promisified.
							for (let map of mapTypes) {
								mapTexturePromises.push(
									new Promise((resolve) => {
										// Load texture
										new THREE.TextureLoader().load(
											`resources/skins/${skinId}/${map}.png`,
											(texture) => {
												_skins[skinId][map] = texture;
												resolve(texture);
											},
											undefined,
											() => {
												resolve(map === "diffuse" ? _fallbackDiffuse : undefined);
											}
										);
									})
								);
								console.log(marbleData.material[map]);
							}

							// After all texture maps are loaded, apply the skin
							return Promise.all(mapTexturePromises)
								.then(() =>{
									_applySkin(marbleData);
								});
						}
					})
					.catch(() => {
						// Skin failed to load, so remove it from the skins list
						delete _skins[skinId];
					});
			} else {
				// Skin meta has already been retrieved before, so we only have to apply it.
				_applySkin(marbleData);
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
	this.marbleOrigin = new THREE.Group();

	this.geometry = marbleManager.marbleGeometry;
	this.materialColor = new THREE.Color(this.color);
	this.material = new THREE.MeshStandardMaterial({
		color: this.materialColor,
		roughness: .9,
		metalness: 0
	});
	this.mesh = new THREE.Mesh(this.geometry, this.material);
	marbleManager.getSkin(this);
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
	if (userState.data && userState.data.id === marbleData.userId) {
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
