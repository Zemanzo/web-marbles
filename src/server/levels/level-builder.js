const physics = require("../../physics/manager");

/**
 * Module that parses level data and loads it as their appropriate physics colliders
 */
const levelBuilder = function() {
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

	return function(levelData) {
		for(let key in levelData.models) {
			let model = levelData.models[key];
			if(model.convexData) {
				physics.createConvexShape(key, model.convexData);
			}
			if(model.concaveData) {
				physics.createConcaveShape(key, model.concaveData.vertices, model.concaveData.indices);
			}
		}

		physics.world.setGravity(levelData.gameplay.gravity);

		for (let worldObjectUuid in levelData.worldObjects) {
			let worldEntity = levelData.worldObjects[worldObjectUuid];
			let prefab = levelData.prefabs[levelData.worldObjects[worldObjectUuid].prefab];

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
	};
}();

module.exports = levelBuilder;
