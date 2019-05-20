import * as THREE from "three";
import { renderCore } from "../render/render-core";
import * as Level from "../../level/level";

renderCore.activeLevel.loadLevel(new Level()); // Load default level properties

let gridHelper = new THREE.GridHelper(20, 20);
renderCore.activeLevel.scene.add(gridHelper);
gridHelper.position.y = -.01;

let axesHelper = new THREE.AxesHelper(3);
renderCore.activeLevel.scene.add(axesHelper);
