module.exports = function() {
	return {
		ammo: require("ammo.js")(),
		world: null,
		shapes: { // Container for collision shape re-usage
			defaultMarble: null
		},

		// Creates a convex shape using the given vertexData as float array
		createConvexShape(name, vertexData) {
			let convexShape = new this.ammo.btConvexHullShape();
			let vertex = new this.ammo.btVector3();

			for (let i = 0; i < vertexData.length / 3; i++) {
				vertex.setValue(
					vertexData[i * 3],
					vertexData[i * 3 + 1],
					vertexData[i * 3 + 2]);

				// Add vertex, recalc AABB if this is the last one we add
				convexShape.addPoint(vertex, i == (vertexData.length / 3) - 1);
			}

			if(name in this.shapes) {
				this.shapes[name].convex = convexShape;
			} else {
				this.shapes[name] = {
					convex: convexShape,
					concave: null
				};
			}
		},

		// Creates a concave shape using the given vertexData as float array and indexData as indices
		createConcaveShape(name, vertexData, indexData) {
			let mesh = new this.ammo.btTriangleMesh(true, false);

			let v0 = new this.ammo.btVector3();
			let v1 = new this.ammo.btVector3();
			let v2 = new this.ammo.btVector3();
			for(let t = 0; t < indexData.length / 3; t++) {
				v0.setValue(
					vertexData[ indexData[t * 3 + 0] * 3 + 0 ],
					vertexData[ indexData[t * 3 + 0] * 3 + 1 ],
					vertexData[ indexData[t * 3 + 0] * 3 + 2 ]);
				v1.setValue(
					vertexData[ indexData[t * 3 + 1] * 3 + 0 ],
					vertexData[ indexData[t * 3 + 1] * 3 + 1 ],
					vertexData[ indexData[t * 3 + 1] * 3 + 2 ]);
				v2.setValue(
					vertexData[ indexData[t * 3 + 2] * 3 + 0 ],
					vertexData[ indexData[t * 3 + 2] * 3 + 1 ],
					vertexData[ indexData[t * 3 + 2] * 3 + 2 ]);
				mesh.addTriangle(v0, v1, v2, true);
			}
			let concaveShape = new this.ammo.btBvhTriangleMeshShape(mesh, true, true);

			if(name in this.shapes) {
				this.shapes[name].concave = concaveShape;
			} else {
				this.shapes[name] = {
					convex: null,
					concave: concaveShape
				};
			}
		},

		// Destroys the shape data for the given name
		destroyShape(name) {
			delete this.shapes[name];
		}
	};
}();

// Module initialization
module.exports.shapes.defaultMarble = new module.exports.ammo.btSphereShape(0.2);
module.exports.world = require("./world");
