import * as THREE from "three";
import { renderCore } from "./render/render-core";

let marbleSkins = function() {
	let _skins = {},
		_fallbackDiffuse = null,
		_shaderUniforms = {
			"time": { value: 1.0 }
		},
		_textureLoader = new THREE.TextureLoader();

	// Default marble texture
	let canvas = document.createElement("canvas");
	canvas.width = 32;
	canvas.height = 32; // who needs pixels anyway

	let context = canvas.getContext("2d");
	context.fillStyle = "#ffffff";
	context.fillRect(0, 0, 32, 32);

	_fallbackDiffuse = _textureLoader.load(
		canvas.toDataURL(),
		undefined,
		undefined,
		function(error) { // error
			console.warn("Unable to load default texture", error);
		}
	);

	return {
		applySkin: function(marbleData) {
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
												return response.text();
											}

											return undefined;
										})
								);
							}

							return Promise.all(shaderFilePromises)
								.then((values) => {
									// Copy new uniforms into live-updating object.
									if (skinMeta.textures) {
										let newUniforms = {};
										for (let key in skinMeta.textures) {
											newUniforms[key] = { value: _textureLoader.load(`resources/skins/${skinId}/${skinMeta.textures[key]}`) };
											newUniforms[key].value.wrapS = newUniforms[key].value.wrapT = THREE.RepeatWrapping;
										}
										Object.assign(_shaderUniforms, newUniforms);
									}

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
									this.applySkin(marbleData);
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
										_textureLoader.load(
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
								.then(() => {
									this.applySkin(marbleData);
								});
						}
					})
					.catch(() => {
						// Skin failed to load, so remove it from the skins list
						delete _skins[skinId];
					});
			} else {
				// Skin meta has already been retrieved before, so we only have to apply it.
				this.applySkin(marbleData);
			}
		}
	};
}();

export {
	marbleSkins
};
