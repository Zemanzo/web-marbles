module.exports = {
	setCurrentDatabase: function(db) {
		this.currentDatabase = this._db = db;

		this._initializer = require("./initializer")(db);
		this._initializer.init();
		this.user = require("./users")(db);

		this.close = () => {
			return this._db.close();
		};
	}
};
