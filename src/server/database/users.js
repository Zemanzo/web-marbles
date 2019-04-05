module.exports = function(db, common) {
	return {
		_idExists: db.prepare("SELECT id FROM users WHERE id = ?"),

		idExists(id) {
			return !!this._idExists.get(id);
		},

		_idIsAuthenticated: db.prepare("SELECT access_token FROM users WHERE id = ?"),

		idIsAuthenticated(id, access_token) {
			if (this.idExists(id)) {
				let row = this._idIsAuthenticated.get(id);
				if (row && row.access_token == access_token) {
					return true;
				}
			}
			return false;
		},

		_getUsernameById: db.prepare("SELECT username FROM users WHERE id = ?"),

		getUsernameById(id) {
			if (this.idExists(id)) {
				let row = this._getUsernameById.get(id);
				if (row) return row.username;
			}
			return false;
		},

		_getTokenById: db.prepare("SELECT access_token, refresh_token, id, scope FROM users WHERE id = ?"),

		getTokenById(id) {
			if (this.idExists(id)) {
				let row = this._getTokenById.get(id);
				if (row) return row;
			}
			return false;
		},

		_getUserDetailsById: db.prepare(
			`SELECT
				access_token,
				username,
				avatar,
				discriminator
			FROM
				users
			WHERE
				id = ?`
		),

		getUserDetailsById(id) {
			if (this.idExists(id)) {
				let row = this._getUserDetailsById.get(id);
				if (row) return row;
			}
			return false;
		},

		_updateTokenById: db.prepare(
			`UPDATE OR REPLACE users SET
				access_token = ?,
				refresh_token = ?,
				timestamp_refresh_last = ?,
				time_refresh_expire = ?,
				scope = ?
			WHERE
				id = ?`
		),

		updateTokenById(token, id) {
			this._updateTokenById.run([
				token.access_token,
				token.refresh_token,
				token.access_granted,
				token.expires_in,
				token.scope,
				id
			]);
		},

		_insertNewUser: db.prepare(
			`INSERT OR ABORT INTO users (
				id,
				username,
				discriminator,
				avatar,
				access_token,
				refresh_token,
				timestamp_refresh_last,
				time_refresh_expire,
				scope,
				timestamp_first_login
			) VALUES (?,?,?,?,?,?,?,?,?,?)`
		),

		insertNewUser(token_body, user_body, scope) {
			this._insertNewUser.run([
				user_body.id,
				user_body.username,
				user_body.discriminator,
				user_body.avatar,
				token_body.access_token,
				token_body.refresh_token,
				token_body.access_granted,
				token_body.expires_in,
				scope,
				Date.now()
			]);
		},

		// stat_points
		_incrementUserPoints: db.prepare(
			`UPDATE OR ABORT
				users
			SET
				stat_points_earned = stat_points_earned + ?
			WHERE
				id = ?`
		),

		incrementUserPoints(points, id) {
			this._incrementUserPoints.run([
				points,
				id
			]);
		},

		// stat_rounds
		_incrementRoundsEntered: db.prepare(
			`UPDATE OR ABORT
				users
			SET
				stat_rounds_entered = stat_rounds_entered + 1
			WHERE
				id = ?`
		),

		incrementRoundsEntered(id) {
			this._incrementRoundsEntered.run(id);
		},

		_incrementRoundsFinished: db.prepare(
			`UPDATE OR ABORT
				users
			SET
				stat_rounds_finished = stat_rounds_finished + 1
			WHERE
				id = ?`
		),

		incrementRoundsFinished(id) {
			this._incrementRoundsFinished.run(id);
		},

		_incrementRoundsNotFinished: db.prepare(
			`UPDATE OR ABORT
				users
			SET
				stat_rounds_not_finished = stat_rounds_not_finished + 1
			WHERE
				id = ?`
		),

		incrementRoundsNotFinished(id) {
			this._incrementRoundsNotFinished.run(id);
		},

		// stat_marbles
		_incrementMarblesEntered: db.prepare(
			`UPDATE OR ABORT
				users
			SET
				stat_marbles_entered = stat_marbles_entered + ?
			WHERE
				id = ?`
		),

		incrementMarblesEntered(amount, id) {
			if (amount !== 0) {
				this._incrementMarblesEntered.run([
					amount,
					id
				]);
			}
		},

		_incrementMarblesFinished: db.prepare(
			`UPDATE OR ABORT
				users
			SET
				stat_marbles_finished = stat_marbles_finished + ?
			WHERE
				id = ?`
		),

		incrementMarblesFinished(amount, id) {
			if (amount !== 0) {
				this._incrementMarblesFinished.run([
					amount,
					id
				]);
			}
		},

		_incrementMarblesNotFinished: db.prepare(
			`UPDATE OR ABORT
				users
			SET
				stat_marbles_not_finished = stat_marbles_not_finished + ?
			WHERE
				id = ?`
		),

		incrementMarblesNotFinished(amount, id) {
			if (amount !== 0) {
				this._incrementMarblesNotFinished.run([
					amount,
					id
				]);
			}
		},

		// batch update user statistics
		batchUpdateStatistics(batch) {
			common.beginTransaction.run();

			for (let user of batch) {
				this.incrementUserPoints(user.points, user.id);

				this.incrementRoundsEntered(user.id);
				if (user.finished) {
					this.incrementRoundsFinished(user.id);
				} else {
					this.incrementRoundsNotFinished(user.id);
				}

				this.incrementMarblesEntered(user.marblesEntered);
				this.incrementMarblesFinished(user.marblesFinished);
				this.incrementMarblesNotFinished(user.marblesEntered - user.marblesFinished);
			}

			common.endTransaction.run();
		}
	};
};
