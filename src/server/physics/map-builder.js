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
				let worldEntityTransform, prefabEntityTransform, transform;

				switch (prefabEntity.type) {
				case "collider":
					worldEntityTransform = _transformFromEntity(worldEntity);
					prefabEntityTransform = _transformFromEntity(prefabEntity);

					// Clone the transform because op_mul modifies the transform it is called on
					transform = new physics.ammo.btTransform();
					transform.setIdentity();
					transform.setOrigin(worldEntityTransform.getOrigin());
					transform.setRotation(worldEntityTransform.getRotation());

					transform.op_mul(prefabEntityTransform); // Modifies "transform"

					switch (prefabEntity.functionality) {
					case "static":
					default:
						physics.world.addPrimitiveCollider(prefabEntity, transform);
						break;
					case "startgate":
						physics.world.addStartGate(prefabEntity, transform);
						break;
					case "startarea":
						physics.world.startAreas.push({prefabEntity, transform});
						break;
					case "endarea":
						physics.world.endAreas.push({prefabEntity, transform});
						break;
					}

					break;
				case "object":
					continue;
				}
			}
		}
	});
}();
