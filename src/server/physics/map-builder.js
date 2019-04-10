const physics = require("./manager");
const maps = require("../maps/manager");

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

	maps.currentMapData.then((map) => {
		for (let worldObjectUuid in map.worldObjects) {
			let worldEntity = map.worldObjects[worldObjectUuid];
			let prefab = map.prefabs[map.worldObjects[worldObjectUuid].prefab];

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
