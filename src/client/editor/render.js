import * as THREE from "three";
import "three/examples/js/loaders/LoaderSupport";
import "three/examples/js/loaders/GLTFLoader";
import * as renderCore from "../render/render-core";

const GLTFLoader = new THREE.GLTFLoader(),
	map = new renderCore.MarbleMap({
		world: {
			waterLevel: -9,
			sunInclination: .25
		}
	});

let gridHelper = new THREE.GridHelper(20, 20);
map.scene.add(gridHelper);
gridHelper.position.y = -.01;

map.addToWorld();

// Default model
let defaultModel;
GLTFLoader.load(
	// resource URL
	"resources/models/default.gltf",

	// called when the resource is loaded
	function(gltf) {
		defaultModel = gltf.scene;
	},

	null,

	function(error) {
		console.error("An error occurred when loading the model", error );
	}
);

export {
	defaultModel,
	map
};
