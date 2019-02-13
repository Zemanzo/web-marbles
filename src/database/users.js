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
		}
	};
};
