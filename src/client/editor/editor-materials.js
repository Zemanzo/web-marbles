import { MeshStandardMaterial, MeshPhongMaterial } from "three";

// Default physics material
export let physicsMaterial = new MeshStandardMaterial({
	color: 0x000000,
	emissive: 0xff00ff,
	roughness: 1,
	wireframe: true
});

// Start area material
export let startMaterial = new MeshPhongMaterial({
	color: 0x000000,
	specular: 0x333333,
	emissive: 0x00cc00,
	shininess: 10,
	opacity: 0.5,
	transparent: true
});

// End area material
export let endMaterial = new MeshPhongMaterial({
	color: 0x000000,
	specular: 0x333333,
	emissive: 0xcc0000,
	shininess: 10,
	opacity: 0.5,
	transparent: true
});

// End area material
export let gateMaterial = new MeshPhongMaterial({
	color: 0x000000,
	specular: 0x333333,
	emissive: 0xcc7700,
	shininess: 10,
	opacity: 0.5,
	transparent: true
});
