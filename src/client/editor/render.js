import * as THREE from "three";
import { renderCore } from "../render/render-core";

renderCore.activeMap.water.setHeight(-9);
renderCore.activeMap.sky.recalculate({
	inclination: .25
});

let gridHelper = new THREE.GridHelper(20, 20);
renderCore.activeMap.scene.add(gridHelper);
gridHelper.position.y = -.01;

let axesHelper = new THREE.AxesHelper(3);
renderCore.activeMap.scene.add(axesHelper);
