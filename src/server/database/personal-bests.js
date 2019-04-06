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
			common.beginTransaction.run();

			for (let user of batch) {
				if (this.getPersonalBest(map, user.id)) {
					this.updatePersonalBest(user.time, map, user.id);
				} else {
					this.insertPersonalBest(user.time, map, user.id);
				}
			}

			common.endTransaction.run();
		}
	};
};
