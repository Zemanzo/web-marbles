module.exports = function(Ammo, world) {
	let _marblesTransformAux = new Ammo.btTransform(),
		_pos = null,
		_rot = null,
		_id = 0,
		_finishedMarbles = [];

	let _randomPositionInStartAreas = function() {
		let startAreas = world.startAreas;
		let area = startAreas[Math.floor(startAreas.length * Math.random())];

		let transform = new Ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(
			new Ammo.btVector3(
				Math.random() * area.prefabEntity.colliderData.width  - ( area.prefabEntity.colliderData.width  * .5 ),
				Math.random() * area.prefabEntity.colliderData.height - ( area.prefabEntity.colliderData.height * .5 ),
				Math.random() * area.prefabEntity.colliderData.depth  - ( area.prefabEntity.colliderData.depth  * .5 )
			)
		);

		// Clone the transform because op_mul modifies the transform it is called on
		let newTransform = new Ammo.btTransform();
		newTransform.setIdentity();
		newTransform.setOrigin(area.transform.getOrigin());
		newTransform.setRotation(area.transform.getRotation());

		newTransform.op_mul(transform); // Modifies "newTransform"

		let origin = newTransform.getOrigin();

		return origin;
	};

	return {
		list: [],

		createMarble(meta) {
			// Create physics body
			let size = (Math.random() > .95 ? (.3 + Math.random() * .7) : false) || 0.2;
			let sphereShape = new Ammo.btSphereShape(size);
			sphereShape.setMargin( 0.05 );
			let mass = (size || 0.5) * 5;
			let localInertia = new Ammo.btVector3( 0, 0, 0 );
			sphereShape.calculateLocalInertia( mass, localInertia );
			let transform = new Ammo.btTransform();
			transform.setIdentity();
			transform.setOrigin( _randomPositionInStartAreas() );
			let motionState = new Ammo.btDefaultMotionState( transform );
			let bodyInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, sphereShape, localInertia );
			let ammoBody = new Ammo.btRigidBody( bodyInfo );

			// Add metadata
			let body = {
				ammoBody: ammoBody,
				meta: {}
			};
			body.meta.id = _id++;
			body.meta.size = size;
			Object.assign(body.meta, meta);

			// Add to physics world
			this.list[body.meta.id] = body;
			world.physicsWorld.addRigidBody(body.ammoBody);

			return body;
		},

		getMarbleTransformations() {
			_pos = new Float32Array(this.list.length * 3);
			_rot = new Float32Array(this.list.length * 4);

			for (let i = 0; i < this.list.length; i++) {
				let ms = this.list[i].ammoBody.getMotionState();
				if (ms) {
					ms.getWorldTransform( _marblesTransformAux );
					let p = _marblesTransformAux.getOrigin();
					let q = _marblesTransformAux.getRotation();

					_pos[i * 3 + 0] = p.x();
					_pos[i * 3 + 1] = p.z();
					_pos[i * 3 + 2] = p.y();

					_rot[i * 4 + 0] = q.x();
					_rot[i * 4 + 1] = q.z();
					_rot[i * 4 + 2] = q.y();
					_rot[i * 4 + 3] = q.w();
				}
			}

			return {
				position: _pos,
				rotation: _rot
			};
		},

		getFinishedMarbles() {
			let finished = [];
			for (let i = 0; i < this.list.length; i++) {
				let ms = this.list[i].ammoBody.getMotionState();
				if (ms) {
					ms.getWorldTransform(_marblesTransformAux);
					let p = _marblesTransformAux.getOrigin();

					if ( p.y() < -5 && _finishedMarbles[i] !== true ) {
						_finishedMarbles[i] = true;
						finished.push(i);
					}
				}
			}

			return finished;
		},

		destroyAllMarbles() {
			for (let i = this.list.length - 1; i >= 0; --i) {
				world.physicsWorld.removeRigidBody(this.list[i].ammoBody);
			}

			_finishedMarbles = [];
			this.list = [];
			_id = 0;
		}
	};
};
