module.exports = function(Ammo, world, map) {
	let _startAreas = [],
		_endAreas = [];

	map.currentMapData.then((map) => {
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

				let worldEntityTransform, prefabEntityTransform;

				//console.log(prefabEntity.type);

				let transform;
				switch (prefabEntity.type) {
				case "collider":
					worldEntityTransform = transformFromEntity(worldEntity);
					prefabEntityTransform = transformFromEntity(prefabEntity);

					// Clone the transform because op_mul modifies the transform it is called on
					transform = new Ammo.btTransform();
					transform.setIdentity();
					transform.setOrigin(worldEntityTransform.getOrigin());
					transform.setRotation(worldEntityTransform.getRotation());

					transform.op_mul(prefabEntityTransform); // Modifies "newTransform"

					switch (prefabEntity.functionality) {
					case "static":
					default:
						world.addPrimitiveCollider(prefabEntity, transform);
						break;
					case "startgate":
						world.addStartGate(prefabEntity, transform);
						break;
					case "startarea":
						_startAreas.push({ prefabEntity, transform});
						break;
					case "endarea":
						_endAreas.push({ prefabEntity, transform});
						break;
					}

					break;
				case "object":

					break;
				}

				// Terrain, someday:

				// // Load obj as heightfield
				// let OBJHeightfield = require("../model-import/obj-heightfield");
				// let fs = require("fs");
				// let file = fs.readFileSync(config.marbles.resources + config.marbles.mapRotation[0].name, "utf-8");
				// let mapObj = new OBJHeightfield(file); // X forward, Z up. Write normals & Objects as OBJ Objects.
				// mapObj.centerOrigin("xyz");
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
