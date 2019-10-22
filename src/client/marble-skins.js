import {
	TextureLoader,
	MeshStandardMaterial,
	ShaderMaterial,
	Color,
	RepeatWrapping as THREE_REPEAT_WRAPPING
} from "three";
import { renderCore } from "./render/render-core";

let marbleSkins = function() {
	let _skins = {},
		_fallbackDiffuse = null,
		_textureLoader = new TextureLoader();

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
		placeholderMaterial: new MeshStandardMaterial({
			color: new Color("#000000"),
			roughness: .9,
			metalness: 0
		}),

		/**
		 * This function will load a skin from the server and parse it to a material.
		 *
		 * @param {String} skinId The ID for the skin that needs to be loaded.
		 * @param {String} color Optionally, the base color of the material. Will default to "#ffffff".
		 *
		 * Return value
		 * @returns {Promise} A promise that resolves to the corresponding material.
		 */
		loadSkin: function(skinId, color) {
			if (!_skins[skinId]) {
				_skins[skinId] = {};

				// Fetch skin meta. It will attempt to download the meta file that belongs to the skin ID.
				// It will then parse to form the final material.
				_skins[skinId].promise = fetch(`resources/skins/${skinId}/meta.json`)
					.then((response) => {
						if (response.ok) {
							return response.json();
						}

						return Promise.reject();
					})
					// Parse meta file
					.then((skinMeta) => {
						Object.assign(_skins[skinId], skinMeta);

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
											newUniforms[key].value.wrapS = newUniforms[key].value.wrapT = THREE_REPEAT_WRAPPING;
										}
										Object.assign(renderCore.shaderUniforms, newUniforms);
									}

									// Create the material
									_skins[skinId].material = new ShaderMaterial({
										fragmentShader: values[0],
										vertexShader: values[1],
										uniforms: renderCore.shaderUniforms
									});

									return _skins[skinId].material;
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
							}

							// After all texture maps are loaded, create the material
							return Promise.all(mapTexturePromises)
								.then(() => {
									let materialValues = {};
									materialValues.color = new Color(color || "#ffffff");
									materialValues.roughness = !isNaN(skinMeta.roughness) ? skinMeta.roughness : .9;
									materialValues.metalness = !isNaN(skinMeta.metalness) ? skinMeta.metalness : 0;
									materialValues.map = _skins[skinId].diffuse;
									if (_skins[skinId].normal) {
										materialValues.normalMap = _skins[skinId].normal;
									}

									return _skins[skinId].material = new MeshStandardMaterial(materialValues);
								});
						}
					})
					.catch(() => {
						// Skin failed to load, so remove it from the skins list
						delete _skins[skinId];
					});

				return _skins[skinId].promise;
			} else {
				// Skin meta has already been retrieved before, so we only have to return it. Since the
				// return value is always expected to be a promise, we will return a promise that
				// immediately resolves to the already loaded material.
				return _skins[skinId].promise.then((material) => {
					if (_skins[skinId].allowCustomColor) {
						let clonedMaterial = material.clone();
						clonedMaterial.color = new Color(color);
						return clonedMaterial;
					} else {
						return material;
					}
				});
			}
		}
	};
}();

export {
	marbleSkins
};
