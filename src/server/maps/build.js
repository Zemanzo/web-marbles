const physics = require("../physics/manager");
const Ammo = physics.Ammo;

module.exports = function(map) {
	let startAreas = [],
		endAreas = [];

	function transformFromEntity(entity) {
		let transform = new Ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(
			new Ammo.btVector3(
				entity.position.x,
				entity.position.y,
				entity.position.z
			)
		);
		transform.setRotation(
			new Ammo.btQuaternion(
				entity.rotation.x,
				entity.rotation.y,
				entity.rotation.z,
				entity.rotation.w
			)
		);

		return transform;
	}

	for (let worldObjectUuid in map.worldObjects) {
		let worldEntity = map.worldObjects[worldObjectUuid];
		let prefab = map.prefabs[map.worldObjects[worldObjectUuid].prefab];

		for (let prefabEntityUuid in prefab.entities) {
			let prefabEntity = prefab.entities[prefabEntityUuid];

			let worldEntityTransform, prefabEntityTransform, transform;
			switch (prefabEntity.type) {
			case "collider":
				worldEntityTransform = transformFromEntity(worldEntity);
				prefabEntityTransform = transformFromEntity(prefabEntity);

				transform = worldEntityTransform * prefabEntityTransform;

				switch (prefabEntity.functionality) {
				case "static":
				default:
					physics.addPrimitiveCollider(prefabEntity, transform);
					break;
				case "startarea":
					startAreas.push(prefabEntity, transform);
					break;
				case "endarea":
					endAreas.push(prefabEntity, transform);
					break;
				}

				break;
			case "object":

				break;
			}
		}
	}

	return {
		startAreas,
		endAreas
	};
};
