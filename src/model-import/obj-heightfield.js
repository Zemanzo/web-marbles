const config = require('../../config');
const fs = require('fs');
const OBJFile = require('obj-file-parser');

class OBJHeightfield {
	constructor(file) {
		this.obj = new OBJFile( fs.readFileSync( config.marbles.resources+file, "utf-8" ) );
		this.parsed = this.obj.parse();
		
		// Clone & sort vertices
		this.vertices = this.parsed.models[0].vertices.slice(0).sort(
			function(a, b) {
				return b.x - a.x || b.y - a.y 
			}
		);
		
		this.heightArray = matrixFromArray( Array.from( this.vertices, a => a.z ) );;
		this.elementSize = Math.abs( this.vertices[0].y - this.vertices[1].y )
	}
}

function matrixFromArray(arr) {
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
}

module.exports = OBJHeightfield;