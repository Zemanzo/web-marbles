// Add any config properties you wish to override here
// To see which properties you can override, check config.js

const userConfig = {
	"contact.email": "c2VuZEBudWRlcy5tZQ==",
	"contact.decode": function(str) {
		/**
		 * TODO: This is terrible. Do it better, independent of environment type.
		 * Maybe good to mention it should be valid in both an ES6 environment
		 * and a Node.js environment
		 */
		return this.window
			? atob(str)
			// eslint-disable-next-line no-undef
			: Buffer.from(str, "base64").toString("ascii");
	},

	"network.ssl": false,
	"network.websockets.localReroute": false
};

module.exports = userConfig;
