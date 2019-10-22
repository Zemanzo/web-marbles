const config = require("../config");

/**
 * This module matches permission constants with their Discord roles.
 * It allows for more readable code, where we don't have to work with
 * IDs, but instead can use a string as a permission identifier.
 * For example "DEVELOPER_COMMANDS" will be used as a permission
 * identifier for all commands that can only be used as a developer.
 * See commands.js for more. The corresponding Discord roles have to
 * be added in config.js.
 */
const permissions = function() {
	const _constantKeyRegex = /^[0-9A-Z_]+$/;
	const _getDiscordMemberById = function(id) {
		return permissions.guild.members.get(id);
	};

	return {
		guild: null,
		roleIdentifiers: {},

		initialize: function(guilds) {
			// Get reference to guild that is used for fetching the roles / matching the permissions.
			this.guild = guilds.get(config.discord.permissions.guildId);

			// Create a reverse lookup table for all permission identifiers
			for (let key in config.discord.permissions) {
				if (_constantKeyRegex.test(key)) {
					for (let role of config.discord.permissions[key]) {
						if (!this.roleIdentifiers[role]) {
							this.roleIdentifiers[role] = [];
						}
						this.roleIdentifiers[role].push(key);
					}
				}
			}
		},

		memberHasPermission(memberId, permissionId) {
			if (permissionId === "ANYONE") return true;

			let member = _getDiscordMemberById(memberId);
			// Find the role that has a matching permission
			if (
				member
				&& Array.from(member.roles.keys()).find(roleId => (
					this.roleIdentifiers[roleId]
					&& this.roleIdentifiers[roleId].includes(permissionId)
				))
				// I long for the day that Node.js supports optional chaining
				// (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)
			) {
				return true;
			}

			return false;
		}
	};
}();

module.exports = permissions;
