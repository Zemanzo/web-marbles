module.exports = function(db, common) {
	return {
		_getPersonalBest: db.prepare(
			`SELECT
				time_best
			FROM
				personal_bests
			WHERE
				level_id IS ?
				AND
				user_id IS ?`
		),

		getPersonalBest(level, id) {
			return this._getPersonalBest.get([level, id]);
		},

		_insertPersonalBest: db.prepare(
			`INSERT OR ABORT INTO personal_bests (
				time_best,
				level_id,
				user_id
			) VALUES (?,?,?)`
		),

		insertPersonalBest(time, level, id) {
			this._insertPersonalBest.run([time, level, id]);
		},

		_updatePersonalBest: db.prepare(
			`UPDATE OR ABORT
				personal_bests
			SET
				time_best = ?
			WHERE
				level_id IS ?
				AND
				user_id IS ?
				AND
				time_best > ?`
		),

		updatePersonalBest(time, level, id) {
			this._updatePersonalBest.run([time, level, id, time]);
		},

		// batch update user statistics
		batchInsertOrUpdatePersonalBest(batch, level) {
			let personalBestIds = [];

			common.beginTransaction.run();

			for (let user of batch) {
				let pb = this.getPersonalBest(level, user.id);
				if (user.time && pb && pb.time_best && pb.time_best > user.time) {
					this.updatePersonalBest(user.time, level, user.id);
					personalBestIds.push(user.id);
				} else if (user.time && !pb) {
					this.insertPersonalBest(user.time, level, user.id);
					personalBestIds.push(user.id);
				}
			}

			common.endTransaction.run();

			return personalBestIds;
		}
	};
};
