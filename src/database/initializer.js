module.exports = function(db) {
	return {
		_users: db.prepare(
			`CREATE TABLE IF NOT EXISTS users (
			id INTEGER UNIQUE,
			username TEXT,
			discriminator TEXT,
			avatar TEXT,
			access_token TEXT,
			refresh_token TEXT,
			refresh_last INTEGER,
			refresh_expire INTEGER,
			scope TEXT,
			stat_rounds_entered INTEGER,
			stat_marbles_entered INTEGER,
			PRIMARY KEY('id')
			)`
		),

		init() {
			this._users.run();
		}
	};
};
