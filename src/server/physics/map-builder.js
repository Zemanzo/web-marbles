module.exports = function(Ammo, world, map) {
	let _startAreas = [],
		_endAreas = [];

	map.then((map) => {
		function transformFromEntity(entity) {
			if (!entity.position) {
				entity.position = { x: 0, y: 0, z: 0 };
			}
			if (!entity.rotation) {
				entity.rotation = { x: 0, y: 0, z: 0, w: 1 };
			}

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

				console.log(prefabEntity.type);

				switch (prefabEntity.type) {
				case "Collider":
					worldEntityTransform = transformFromEntity(worldEntity);
					prefabEntityTransform = transformFromEntity(prefabEntity);

					transform = worldEntityTransform.op_mul(prefabEntityTransform);

					switch (prefabEntity.functionality) {
					case "static":
					case "startgate":
					default:
						world.addPrimitiveCollider(prefabEntity, transform);
						break;
					case "startarea":
						_startAreas.push({prefabEntity, transform});
						break;
					case "endarea":
						_endAreas.push({prefabEntity, transform});
						break;
					}

					break;
				case "Object":

					break;
				}
			}
		}
	});

	return {
		getStartAreas() {
			return _startAreas;
		},

		getEndAreas() {
			return _startAreas;
		}
	};
};
