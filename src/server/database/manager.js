module.exports = {
	setCurrentDatabase: function(db) {
		this.currentDatabase = this._db = db;

		let _common = {
			beginTransaction: db.prepare("BEGIN TRANSACTION"),
			endTransaction: db.prepare("END TRANSACTION")
		};

		let _initializer = require("./initializer")(db);
		_initializer.init();

		this.user = require("./users")(db, _common);
		this.round = require("./rounds")(db);

		this.close = () => {
			return this._db.close();
		};
	}
};
