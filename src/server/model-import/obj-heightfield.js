const OBJFile = require("obj-file-parser");

class OBJHeightfield {
	constructor(file) {
		this.obj = new OBJFile( file );
		this.parsed = this.obj.parse();

		// Clone & sort vertices
		this.vertices = this.parsed.models[0].vertices.slice(0).sort(
			function(a, b) {
				return b.x - a.x || b.y - a.y;
			}
		);

		this.centerOrigin = function(axes) {
			if (axes.indexOf("x") !== -1) {
				let diff = this.maxX - this.minX;
				let half = diff * .5;
				for ( let verts of this.vertices ) {
					verts.x = 0 - (this.maxX - verts.x) + half;
				}
			}
			if (axes.indexOf("y") !== -1) {
				let diff = this.maxY - this.minY;
				let half = diff * .5;
				for ( let verts of this.vertices ) {
					verts.y = 0 - (this.maxY - verts.y) + half;
				}
			}
			if (axes.indexOf("z") !== -1) {
				let diff = this.maxZ - this.minZ;
				let half = diff * .5;
				for ( let verts of this.vertices ) {
					verts.z = 0 - (this.maxZ - verts.z) + half;
				}
			}

			// Update arrays after modifying origin
			this.updateVertexArrays();

			return this.vertices;
		};

		this.updateVertexArrays = function() {
			this.xArray = Array.from( this.vertices, a => a.x );
			this.yArray = Array.from( this.vertices, a => a.y );
			this.zArray = Array.from( this.vertices, a => a.z );

			this.minX = this.xArray.reduce(function(a, b) {return Math.min(a, b);});
			this.maxX = this.xArray.reduce(function(a, b) {return Math.max(a, b);});
			this.minY = this.yArray.reduce(function(a, b) {return Math.min(a, b);});
			this.maxY = this.yArray.reduce(function(a, b) {return Math.max(a, b);});
			this.minZ = this.zArray.reduce(function(a, b) {return Math.min(a, b);});
			this.maxZ = this.zArray.reduce(function(a, b) {return Math.max(a, b);});
		};

		this.updateVertexArrays();

		this.width = this.depth = Math.sqrt(this.zArray.length);

		this.gridDistance = Math.abs( this.vertices[0].y - this.vertices[1].y );
	}
}

/* function matrixFromArray(arr) {
	let root = Math.sqrt(arr.length);
	if (Number.isInteger(root)) {
		let matrix = [];
		for (let i = 0; i < root; i++){
			matrix.push( arr.slice( i*root, i*root+root ) );
		}
		return matrix;
	} else {
		throw "Cannot create matrix. Square root is not an integer. ("+arr.length+","+root+")";
	}
} */

module.exports = OBJHeightfield;
