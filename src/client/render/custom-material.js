import {
	TextureLoader,
	Math as ThreeMath,
	FrontSide as THREE_FRONT_SIDE,
	BackSide as THREE_BACK_SIDE,
	DoubleSide as THREE_DOUBLE_SIDE
} from "three";
import {
	ColorNode,
	StandardNodeMaterial,
	FloatNode,
	TextureNode,
	UVTransformNode,
	SwitchNode,
	NormalMapNode,
	MathNode
} from "three/examples/jsm/nodes/Nodes";

let _createFlatColorTexture = function(color) {
	let canvas = document.createElement("canvas");
	canvas.width = 32;
	canvas.height = 32; // who needs pixels anyway

	let context = canvas.getContext("2d");
	context.fillStyle = color || "#ffffff";
	context.fillRect(0, 0, 128, 128);

	return new TextureLoader().load(
		canvas.toDataURL(),
		undefined,
		undefined,
		function(error) {
			console.error("This is kind of embarassing but... The generated texture failed to load...", error);
		}
	);
};

function DefaultMaterial() {
	let material = new StandardNodeMaterial();
	material.color = new ColorNode(0xff00ff);
	material.build();
	return material;
}

function CustomMaterial(properties) {
	// Create new material
	this.material = new StandardNodeMaterial();

	// Set roughness and metalness values if supplied (these already have default values)
	if (!isNaN(properties.roughness)) this.material.roughness = new FloatNode(properties.roughness);
	if (!isNaN(properties.metalness)) this.material.metalness = new FloatNode(properties.metalness);

	function setUvTransformWithObject(uv, obj) {
		uv.setUvTransform(
			obj.offsetX || 0,
			obj.offsetY || 0,
			obj.scaleX || 1,
			obj.scaleY || 1,
			ThreeMath.degToRad(obj.rotation || 0)
		);
	}

	function createFallbackTextureNode() {
		let fallbackNode = new TextureNode( _createFlatColorTexture("#ffffff") );
		fallbackNode.uv = new UVTransformNode();
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
		diffuseNodeA = new TextureNode(properties.diffuseA.texture);
		diffuseNodeA.uv = new UVTransformNode();
		setUvTransformWithObject(diffuseNodeA.uv, properties.diffuseA);
	} else {
		diffuseNodeA = createFallbackTextureNode();
	}

	// Create a mask node
	let maskAlphaChannel;
	if (properties.mask) {
		maskNode = new TextureNode(properties.mask.texture);
		maskNode.uv = new UVTransformNode();
		setUvTransformWithObject(maskNode.uv, properties.mask);
		maskAlphaChannel = new SwitchNode(maskNode, "w");
	}

	// If a second diffuse texture and a mask are available, use them for blending and create a new blended texture
	if (properties.mask) {
		if (properties.diffuseB) {
			diffuseNodeB = new TextureNode(properties.diffuseB.texture);
			diffuseNodeB.uv = new UVTransformNode();
			setUvTransformWithObject(diffuseNodeB.uv, properties.diffuseB);
		} else {
			diffuseNodeB = createFallbackTextureNode();
		}

		let diffuseBlend = new MathNode(
			diffuseNodeA,
			diffuseNodeB,
			maskAlphaChannel,
			MathNode.MIX
		);

		this.material.color = diffuseBlend;
	} else {
		this.material.color = diffuseNodeA;
	}

	// Normals
	if (properties.normalA) {
		normalNodeA = new TextureNode(properties.normalA.texture);
		normalNodeA.uv = new UVTransformNode();
		setUvTransformWithObject(normalNodeA.uv, properties.normalA);
	} else {
		normalNodeA = new TextureNode( _createFlatColorTexture("#7f7fff") ); // Default normal map color
		normalNodeA.uv = new UVTransformNode();
		setUvTransformWithObject(normalNodeA.uv, {});
	}

	if (properties.mask) {
		if (properties.normalB) {
			normalNodeB = new TextureNode(properties.normalB.texture);
			normalNodeB.uv = new UVTransformNode();
			setUvTransformWithObject(normalNodeB.uv, properties.normalB);
		} else {
			normalNodeB = new TextureNode( _createFlatColorTexture("#7f7fff") ); // Default normal map color
			normalNodeB.uv = new UVTransformNode();
			setUvTransformWithObject(normalNodeB.uv, {});
		}

		let normalBlend = new MathNode(
			normalNodeA,
			normalNodeB,
			maskAlphaChannel,
			MathNode.MIX
		);

		this.material.normal = new NormalMapNode(normalBlend);
	} else if (properties.normalA) {
		this.material.normal = new NormalMapNode(normalNodeA);
	}

	if (properties.side) {
		switch(properties.side) {
		case "DoubleSide":
			this.material.side = THREE_DOUBLE_SIDE;
			break;
		case "BackSide":
			this.material.side = THREE_BACK_SIDE;
			break;
		case "FrontSide":
		default:
			this.material.side = THREE_FRONT_SIDE;
		}
	}
}

export { DefaultMaterial, CustomMaterial };
