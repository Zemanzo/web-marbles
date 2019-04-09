const log = require("../../log");

module.exports = function(db) {
	let _schemaVersion = 1;

	return {
		_users: db.prepare(
			`CREATE TABLE IF NOT EXISTS users (
				id INTEGER UNIQUE,
				username TEXT,
				discriminator TEXT,
				avatar TEXT,
				access_token TEXT,
				refresh_token TEXT,
				timestamp_refresh_last INTEGER,
				time_refresh_expire INTEGER,
				scope TEXT,
				stat_points_earned INTEGER,
				stat_rounds_entered INTEGER,
				stat_rounds_finished INTEGER,
				stat_rounds_not_finished INTEGER,
				stat_marbles_entered INTEGER,
				stat_marbles_finished INTEGER,
				stat_marbles_not_finished INTEGER,
				stat_unique_maps_played INTEGER,
				timestamp_first_login INTEGER,
				timestamp_first_marble INTEGER,
				PRIMARY KEY('id')
			)`
		),

		_rounds: db.prepare(
			`CREATE TABLE IF NOT EXISTS rounds (
				timestamp_start INTEGER,
				timestamp_end INTEGER,
				time_best INTEGER,
				map_id TEXT,
				stat_points_awarded INTEGER,
				stat_marbles_entered INTEGER,
				stat_marbles_finished INTEGER,
				stat_marbles_not_finished INTEGER,
				stat_players_entered INTEGER,
				stat_players_finished INTEGER,
				stat_players_not_finished INTEGER
			)`
		),

		_maps: db.prepare(
			`CREATE TABLE IF NOT EXISTS maps (
				id TEXT UNIQUE,
				name TEXT,
				author TEXT,
				stat_points_awarded INTEGER,
				stat_rounds_played INTEGER,
				stat_marbles_entered INTEGER,
				stat_marbles_finished INTEGER,
				stat_marbles_not_finished INTEGER,
				stat_players_entered INTEGER,
				stat_players_finished INTEGER,
				stat_players_not_finished INTEGER,
				time_best INTEGER,
				PRIMARY KEY('id')
			)`
		),

		_personalBests: db.prepare(
			`CREATE TABLE IF NOT EXISTS personal_bests (
				user_id INTEGER,
				map_id TEXT,
				time_best INTEGER
			)`
		),

		init() {
			let databaseSchemaVersion = db.pragma("user_version", { simple: true });

			if (databaseSchemaVersion === _schemaVersion || databaseSchemaVersion === 0) {
				// Set current schema version
				db.pragma(`user_version = ${_schemaVersion}`);

				// Create tables
				this._users.run();
				this._rounds.run();
				this._maps.run();
				this._personalBests.run();
			} else {
				log.throw("DATABASE: Schema version does not match. Please remove your outdated database.");
			}
		}
	};
};
