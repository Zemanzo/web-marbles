module.exports = function(db, common) {
	return {
		_getPersonalBest: db.prepare(
			`SELECT
				time_best
			FROM
				personal_bests
			WHERE
				map_id IS ?
				AND
				user_id IS ?`
		),

		getPersonalBest(map, id) {
			return this._getPersonalBest.get([map, id]);
		},

		_insertPersonalBest: db.prepare(
			`INSERT OR ABORT INTO personal_bests (
				time_best,
				map_id,
				user_id
			) VALUES (?,?,?)`
		),

		insertPersonalBest(time, map, id) {
			this._insertPersonalBest.run([time, map, id]);
		},

		_updatePersonalBest: db.prepare(
			`UPDATE OR ABORT
				personal_bests
			SET
				time_best = ?
			WHERE
				map_id IS ?
				AND
				user_id IS ?
				AND
				time_best > ?`
		),

		updatePersonalBest(time, map, id) {
			this._updatePersonalBest.run([time, map, id, time]);
		},

		// batch update user statistics
		batchInsertOrUpdatePersonalBest(batch, map) {
			let personalBestIds = [];

			common.beginTransaction.run();

			for (let user of batch) {
				let pb = this.getPersonalBest(map, user.id);
				if (user.time && pb && pb.time_best && pb.time_best > user.time) {
					this.updatePersonalBest(user.time, map, user.id);
					personalBestIds.push(user.id);
				} else if (user.time && !pb) {
					this.insertPersonalBest(user.time, map, user.id);
					personalBestIds.push(user.id);
				}
			}

			common.endTransaction.run();

			return personalBestIds;
		}
	};
};
