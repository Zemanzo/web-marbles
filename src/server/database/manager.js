const EventEmitter = require("events");

module.exports = {
	setCurrentDatabase: function(databasePath) {
		try {
			let db = require("better-sqlite3")(databasePath);
			this.currentDatabase = this._db = db;

			let _common = {
				beginTransaction: db.prepare("BEGIN TRANSACTION"),
				endTransaction: db.prepare("END TRANSACTION")
			};

			let _initializer = require("./initializer")(db);
			_initializer.init();

			this.events = new EventEmitter();

			this.user = require("./users")(db, _common, this.events);
			this.round = require("./rounds")(db);
			this.personalBest = require("./personal-bests")(db, _common);

			this.close = () => {
				return this._db.close();
			};
		} catch (error) {
			throw new Error(`Could not initialize the database. It might be unreadable or corrupted. Check the read/write permissions, or remove the database file and try again.\n${error}`);
		}
	}
};
