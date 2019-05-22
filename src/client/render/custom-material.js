import * as THREE from "three";
import "three/examples/js/nodes/THREE.Nodes";

function CustomMaterial(properties) {
	// Create new material
	this.material = new THREE.StandardNodeMaterial();

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

	let diffuseNodeA,
		diffuseNodeB,
		maskNode,
		normalNodeA,
		normalNodeB;

	console.log(properties.diffuseA.texture);
	diffuseNodeA = new THREE.TextureNode(properties.diffuseA.texture);
	diffuseNodeA.uv = new THREE.UVTransformNode();
	setUvTransformWithObject(diffuseNodeA.uv, properties.diffuseA);

	// Create a mask node
	let maskAlphaChannel;
	if (properties.mask) {
		maskNode = new THREE.TextureNode(properties.mask.texture);
		maskNode.uv = new THREE.UVTransformNode();
		setUvTransformWithObject(maskNode.uv, properties.mask);
		maskAlphaChannel = new THREE.SwitchNode(maskNode, "w");
	}

	// If a second diffuse texture and a mask are available, use them for blending and create a new blended texture
	if (properties.diffuseA && properties.diffuseB && properties.mask) {
		diffuseNodeB = new THREE.TextureNode(properties.diffuseB.texture);
		diffuseNodeB.uv = new THREE.UVTransformNode();
		setUvTransformWithObject(diffuseNodeB.uv, properties.diffuseB);

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
	}

	if (properties.normalA && properties.normalB && properties.mask) {
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
		this.material.side = THREE[properties.side];
	}
}

export { CustomMaterial };
