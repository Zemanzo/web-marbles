import * as THREE from "three";
import "three/examples/js/nodes/THREE.Nodes";

let _createFlatColorTexture = function(color) {
	let canvas = document.createElement("canvas");
	canvas.width = 32;
	canvas.height = 32; // who needs pixels anyway

	let context = canvas.getContext("2d");
	context.fillStyle = color || "#ffffff";
	context.fillRect(0, 0, 128, 128);

	return new THREE.TextureLoader().load(
		canvas.toDataURL(),
		undefined,
		undefined,
		function(error) {
			console.error("This is kind of embarassing but... The generated texture failed to load...", error);
		}
	);
};

function DefaultMaterial() {
	let material = new THREE.StandardNodeMaterial();
	material.color = new THREE.ColorNode(0xff00ff);
	material.build();
	return material;
}

function CustomMaterial(properties) {
	// Create new material
	this.material = new THREE.StandardNodeMaterial();

	// Set roughness and metalness values if supplied (these already have default values)
	if (!isNaN(properties.roughness)) this.material.roughness = new THREE.FloatNode(properties.roughness);
	if (!isNaN(properties.metalness)) this.material.metalness = new THREE.FloatNode(properties.metalness);

	function setUvTransformWithObject(uv, obj) {
		uv.setUvTransform(
			obj.offsetX || 0,
			obj.offsetY || 0,
			obj.scaleX || 1,
			obj.scaleY || 1,
			THREE.Math.degToRad(obj.rotation || 0)
		);
	}

	function createFallbackTextureNode() {
		let fallbackNode = new THREE.TextureNode( _createFlatColorTexture("#ffffff") );
		fallbackNode.uv = new THREE.UVTransformNode();
		setUvTransformWithObject(fallbackNode.uv, {});
		return fallbackNode;
	}

	let diffuseNodeA,
		diffuseNodeB,
		maskNode,
		normalNodeA,
		normalNodeB;

	// Basic diffuse texture, use fallback if none is set
	if (properties.diffuseA) {
		diffuseNodeA = new THREE.TextureNode(properties.diffuseA.texture);
		diffuseNodeA.uv = new THREE.UVTransformNode();
		setUvTransformWithObject(diffuseNodeA.uv, properties.diffuseA);
	} else {
		diffuseNodeA = createFallbackTextureNode();
	}

	// Create a mask node
	let maskAlphaChannel;
	if (properties.mask) {
		maskNode = new THREE.TextureNode(properties.mask.texture);
		maskNode.uv = new THREE.UVTransformNode();
		setUvTransformWithObject(maskNode.uv, properties.mask);
		maskAlphaChannel = new THREE.SwitchNode(maskNode, "w");
	}

	// If a second diffuse texture and a mask are available, use them for blending and create a new blended texture
	if (properties.mask) {
		if (properties.diffuseB) {
			diffuseNodeB = new THREE.TextureNode(properties.diffuseB.texture);
			diffuseNodeB.uv = new THREE.UVTransformNode();
			setUvTransformWithObject(diffuseNodeB.uv, properties.diffuseB);
		} else {
			diffuseNodeB = createFallbackTextureNode();
		}

		let diffuseBlend = new THREE.Math3Node(
			diffuseNodeA,
			diffuseNodeB,
			maskAlphaChannel,
			THREE.Math3Node.MIX
		);

		this.material.color = diffuseBlend;
	} else {
		this.material.color = diffuseNodeA;
	}

	// Normals
	if (properties.normalA) {
		normalNodeA = new THREE.TextureNode(properties.normalA.texture);
		normalNodeA.uv = new THREE.UVTransformNode();
		setUvTransformWithObject(normalNodeA.uv, properties.normalA);
	} else {
		normalNodeA = new THREE.TextureNode( _createFlatColorTexture("#7f7fff") ); // Default normal map color
		normalNodeA.uv = new THREE.UVTransformNode();
		setUvTransformWithObject(normalNodeA.uv, {});
	}

	if (properties.normalB && properties.mask) {
		normalNodeB = new THREE.TextureNode(properties.normalB.texture);
		normalNodeB.uv = new THREE.UVTransformNode();
		setUvTransformWithObject(normalNodeB.uv, properties.normalB);

		let normalBlend = new THREE.Math3Node(
			normalNodeA,
			normalNodeB,
			maskAlphaChannel,
			THREE.Math3Node.MIX
		);

		this.material.normal = new THREE.NormalMapNode(normalBlend);
	} else if (properties.normalA) {
		this.material.normal = new THREE.NormalMapNode(normalNodeA);
	}

	if (properties.side) {
		switch(properties.side) {
		case "DoubleSide":
			this.material.side = THREE.DoubleSide;
			break;
		case "BackSide":
			this.material.side = THREE.BackSide;
			break;
		case "FrontSide":
		default:
			this.material.side = THREE.FrontSide;
		}
	}
}

export { DefaultMaterial, CustomMaterial };
