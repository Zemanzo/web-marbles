// Add any config properties you wish to override here
// To see which properties you can override, check config.js

const userConfig = {
	"contact.email": "c2VuZEBudWRlcy5tZQ==",
	"contact.decode": function(str) {
		return atob(str);
	},

	"network.ssl": false,
	"network.websockets.localReroute": false
};

module.exports = userConfig;
