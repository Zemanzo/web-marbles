module.exports = {
	setCurrentDatabase: function(db) {
		this.currentDatabase = this._db = db;

		this._initializer = require("./initializer")(db);
		this.user = require("./users")(db);
	},

	initialize: function() {
		this._initializer.init();
	}
};
