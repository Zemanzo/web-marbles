const permissions = require("./permissions");
const commands = require("./commands");

const commandsManager = function() {
	let _defaultChannel = null;

	return {
		setDefaultChannel(channel) {
			_defaultChannel = channel;
		},

		parse: function(messageContent, id, username, channel) {
			// Only parse when a command is used
			if (messageContent.startsWith("!")) {
				for (let commandObject of commands) {
					if (
						messageContent.startsWith(`!${commandObject.commandString}`)
						&& permissions.memberHasPermission(id, commandObject.permission)
					) {
						if (
							commandObject.cooldown
							&& commandObject.lastUse + commandObject.cooldown * 1000 > Date.now()
						) {
							return;
						}
						commandObject.lastUse = Date.now();
						messageContent = messageContent.substring(commandObject.commandString.length + 1).trim(); // Remove "![command]" and start/end whitespace from message
						commandObject.action(messageContent, id, username, channel || _defaultChannel);
					}
				}
			}
		}
	};
}();

module.exports = commandsManager;
