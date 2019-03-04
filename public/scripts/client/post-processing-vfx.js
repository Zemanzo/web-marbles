import "three/examples/js/shaders/CopyShader";
import "three/examples/js/shaders/FilmShader";
import "three/examples/js/shaders/RGBShiftShader";

import "three/examples/js/postprocessing/EffectComposer";
import "three/examples/js/postprocessing/ShaderPass";
import "three/examples/js/postprocessing/RenderPass";
import "three/examples/js/postprocessing/FilmPass";
import * as THREE from "three";

export function BadTvEffect(renderer, scene, camera) {
	this.composer = new THREE.EffectComposer(renderer);

	// Render pass
	this.composer.addPass( new THREE.RenderPass(scene, camera) );

	// Film grain effect
	this._effectFilm = new THREE.FilmPass(0.35, 0.025, 648, false);
	this._effectFilm.renderToScreen = true;
	this.composer.addPass(this._effectFilm);

	// let effect = new THREE.ShaderPass(THREE.RGBShiftShader);
	// effect.uniforms["amount"].value = 0.0015;
	// effect.renderToScreen = true;
	// this.composer.addPass(effect);
}
