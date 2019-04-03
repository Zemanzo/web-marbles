module.exports = function(Ammo, world, map) {
	let _transformFromEntity = function(entity) {
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
	};

	map.currentMapData.then((map) => {
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
					transform = new Ammo.btTransform();
					transform.setIdentity();
					transform.setOrigin(worldEntityTransform.getOrigin());
					transform.setRotation(worldEntityTransform.getRotation());

					transform.op_mul(prefabEntityTransform); // Modifies "transform"

					switch (prefabEntity.functionality) {
					case "static":
					default:
						world.addPrimitiveCollider(prefabEntity, transform);
						break;
					case "startgate":
						world.addStartGate(prefabEntity, transform);
						break;
					case "startarea":
						world.startAreas.push({prefabEntity, transform});
						break;
					case "endarea":
						world.endAreas.push({prefabEntity, transform});
						break;
					}

					break;
				case "object":
					continue;
				}
			}
		}
	});
};
