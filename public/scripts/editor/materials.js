import { MeshStandardMaterial, MeshPhongMaterial } from "three";

export let materials = {
	// Default physics material
	physicsMaterial: new MeshStandardMaterial({
		color: 0x000000,
		emissive: 0xff00ff,
		roughness: 1,
		wireframe: true
	}),

	// Start area material
	startMaterial: new MeshPhongMaterial({
		color: 0x000000,
		specular: 0x333333,
		emissive: 0x00cc00,
		shininess: 10,
		opacity: 0.5,
		transparent: true
	}),

	// End area material
	endMaterial: new MeshPhongMaterial({
		color: 0x000000,
		specular: 0x333333,
		emissive: 0xcc0000,
		shininess: 10,
		opacity: 0.5,
		transparent: true
	}),

	//

	// End area material
	gateMaterial: new MeshPhongMaterial({
		color: 0x000000,
		specular: 0x333333,
		emissive: 0xcc7700,
		shininess: 10,
		opacity: 0.5,
		transparent: true
	})
}
