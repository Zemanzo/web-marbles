module.exports = function(db) {
	return {
		_idExists: db.prepare(
			`SELECT EXISTS (
				SELECT 1 FROM users WHERE id = ?
			)`
		),

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

		_getUserDetailsById: db.prepare(`SELECT
			access_token,
			username,
			avatar,
			discriminator
			FROM users
			WHERE id = ?`),

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
				refresh_last = ?,
				refresh_expire = ?,
				scope = ?
				WHERE id = ?`
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
				refresh_last,
				refresh_expire,
				scope
			) VALUES (?,?,?,?,?,?,?,?,?)`
		),

		insertNewUser(user_body, token_body, scope) {
			this._insertNewUser.run([
				user_body.id,
				user_body.username,
				user_body.discriminator,
				user_body.avatar,
				token_body.access_token,
				token_body.refresh_token,
				token_body.access_granted,
				token_body.expires_in,
				scope
			]);
		}
	};
};
