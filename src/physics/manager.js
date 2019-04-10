module.exports = function() {
	return {
		ammo: require("ammo")(),
		world: null,
		shapes: { // Future container for collision shape re-usage
			defaultMarble: null
		},

		// Currently unused/untested
		addTerrainShape(name, mapObj) {
			// Up axis = 0 for X, 1 for Y, 2 for Z. Normally 1 = Y is used.
			let upAxis = 1;

			// hdt, height data type. "PHY_FLOAT" is used. Possible values are "PHY_FLOAT", "PHY_UCHAR", "PHY_SHORT"
			let hdt = "PHY_FLOAT";

			// Set this to your needs (inverts the triangles)
			let flipQuadEdges = false;

			// Creates height data buffer in Ammo heap
			let ammoHeightData = null;
			ammoHeightData = this.ammo._malloc(4 * mapObj.width * mapObj.depth);

			// Copy the javascript height data array to the Ammo one.
			let p = 0,
				p2 = 0;

			for (let j = 0; j < mapObj.depth; j++) {
				for (let i = 0; i < mapObj.width; i++) {
					// write 32-bit float data to memory
					this.ammo.HEAPF32[ammoHeightData + p2 >> 2] = mapObj.zArray[p];
					p++;

					// 4 bytes/float
					p2 += 4;
				}
			}

			// Creates the heightfield physics shape
			let heightFieldShape = new this.ammo.btHeightfieldTerrainShape(
				mapObj.width,
				mapObj.depth,
				ammoHeightData,
				1,
				mapObj.minZ,
				mapObj.maxZ,
				upAxis,
				hdt,
				flipQuadEdges
			);

			// Set horizontal scale
			let scaleX = mapObj.gridDistance;
			let scaleZ = mapObj.gridDistance;
			heightFieldShape.setLocalScaling(new this.ammo.btVector3(scaleX, 1, scaleZ));

			heightFieldShape.setMargin(0.05);

			this.shapes[name] = heightFieldShape;

			return heightFieldShape;
		}
	};
}();

// Module initialization
module.exports.shapes.defaultMarble = new module.exports.ammo.btSphereShape(0.2);
module.exports.world = require("./world");
