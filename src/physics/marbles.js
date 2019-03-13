module.exports = function(Ammo, world) {
	return {
		list: [],
		_marblesTransformAux: new Ammo.btTransform(),
		_pos: undefined,
		_rot: undefined,
		_id: 0,

		createMarble(name, color) {
			// Create physics body
			let size = (Math.random() > .95 ? (.3 + Math.random() * .7) : false) || 0.2;
			let sphereShape = new Ammo.btSphereShape(size);
			sphereShape.setMargin( 0.05 );
			let mass = (size || 0.5) * 5;
			let localInertia = new Ammo.btVector3( 0, 0, 0 );
			sphereShape.calculateLocalInertia( mass, localInertia );
			let transform = new Ammo.btTransform();
			transform.setIdentity();
			transform.setOrigin( new Ammo.btVector3( Math.random() * 3 - 20, world.map.maxZ + 1, Math.random() * 3 + 1 ) );
			let motionState = new Ammo.btDefaultMotionState( transform );
			let bodyInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, sphereShape, localInertia );
			let ammoBody = new Ammo.btRigidBody( bodyInfo );

			// Add metadata
			let body = {
				ammoBody: ammoBody,
				tags: {}
			};
			body.tags.id = this._id++;
			body.tags.color = color || randomHexColor();
			body.tags.size = size;
			body.tags.useFancy = (Math.random() > .99);
			body.tags.name = name || "Nightbot";

			// Add to physics world
			this.list[body.tags.id] = body;
			world.physics.addRigidBody(body.ammoBody);

			return body;
		},

		getMarbleTransformations() {
			this._pos = new Float32Array(this.list.length * 3);
			this._rot = new Float32Array(this.list.length * 4);

			for (let i = 0; i < this.list.length; i++) {
				let ms = this.list[i].ammoBody.getMotionState();
				if (ms) {
					ms.getWorldTransform( this._marblesTransformAux );
					let p = this._marblesTransformAux.getOrigin();
					let q = this._marblesTransformAux.getRotation();

					this._pos[i * 3 + 0] = p.x();
					this._pos[i * 3 + 1] = p.z();
					this._pos[i * 3 + 2] = p.y();

					this._rot[i * 4 + 0] = q.x();
					this._rot[i * 4 + 1] = q.z();
					this._rot[i * 4 + 2] = q.y();
					this._rot[i * 4 + 3] = q.w();
				}
			}

			return {
				position: this._pos,
				rotation: this._rot
			};
		},

		_finishedMarbles: [],
		getFinishedMarbles() {
			let finished = [];
			for (let i = 0; i < this.list.length; i++) {
				let ms = this.list[i].ammoBody.getMotionState();
				if (ms) {
					ms.getWorldTransform(this._marblesTransformAux);
					let p = this._marblesTransformAux.getOrigin();

					if ( p.y() < 5 && this._finishedMarbles[i] !== true ) {
						this._finishedMarbles[i] = true;
						finished.push(i);
					}
				}
			}

			return finished;
		},

		destroyAllMarbles() {
			for (let i = this.list.length - 1; i >= 0; --i) {
				world.physics.removeRigidBody(this.list[i].ammoBody);
			}

			this._finishedMarbles = [];
			this.list = [];
			this._id = 0;
		}
	};
};

function randomHexColor() {
	return `#${(Math.random() * 0xffffff | 0).toString(16)}`;
}
