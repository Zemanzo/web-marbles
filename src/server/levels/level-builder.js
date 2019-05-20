const physics = require("../../physics/manager");
const levels = require("./manager");

module.exports = function() {
	let _transformFromEntity = function(entity) {
		let transform = new physics.ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(
			new physics.ammo.btVector3(
				entity.position.x,
				entity.position.y,
				entity.position.z
			)
		);
		transform.setRotation(
			new physics.ammo.btQuaternion(
				entity.rotation.x,
				entity.rotation.y,
				entity.rotation.z,
				entity.rotation.w
			)
		);

		return transform;
	};

	levels.currentLevelData.then((level) => {
		for(let key in level.models) {
			let model = level.models[key];
			if(model.convexData) {
				physics.createConvexShape(key, model.convexData);
			}
			if(model.concaveData) {
				physics.createConcaveShape(key, model.concaveData.vertices, model.concaveData.indices);
			}
		}

		physics.world.setGravity(level.gameplay.gravity);

		for (let worldObjectUuid in level.worldObjects) {
			let worldEntity = level.worldObjects[worldObjectUuid];
			let prefab = level.prefabs[level.worldObjects[worldObjectUuid].prefab];

			for (let prefabEntityUuid in prefab.entities) {
				let prefabEntity = prefab.entities[prefabEntityUuid];

				if(prefabEntity.type !== "collider") continue;

				let worldEntityTransform = _transformFromEntity(worldEntity);
				let prefabEntityTransform = _transformFromEntity(prefabEntity);

				// Clone the transform because op_mul modifies the transform it is called on
				let transform = new physics.ammo.btTransform();
				transform.setIdentity();
				transform.setOrigin(worldEntityTransform.getOrigin());
				transform.setRotation(worldEntityTransform.getRotation());

				transform.op_mul(prefabEntityTransform); // Modifies "transform"

				physics.world.createCollider(prefabEntity, transform);
			}
		}
	});
}();
