const game = require("../game");
const skins = require("../skins");

const commands = function() {
	const _colorRegEx = /#(?:[0-9a-fA-F]{3}){1,2}$/g;
	const _createMarbleAttributesObject = function(messageContent) {
		let messageSections = messageContent.split(" ");
		let color, skinId;

		// At most, check only the first three words. The first occurrence of an attribute will be used, the rest will be ignored.
		for (let i = 1; i < Math.min(messageSections.length, 4); i++) {
			if (!color) {
				let match = messageSections[i].match(_colorRegEx);
				color = (match === null ? undefined : match[0]);
				if (typeof color !== "undefined") continue;
			}

			if (!skinId) {
				// Get the skinId that corresponds to the provided message. Non-existing skins will set `skinId` to undefined.
				skinId = skins.idList[messageSections[i]];
				if (typeof skinId !== "undefined") continue;
			}
		}

		return {
			color,
			skinId
		};
	};

	return [
		// Anyone
		{
			// Enter a marble
			commandString: "marble",
			permission: "ANYONE",
			action: function(messageContent, id, username) {
				game.addPlayerEntry(
					id,
					username,
					_createMarbleAttributesObject(messageContent)
				);
			}
		},
		{
			// doot
			commandString: "doot",
			permission: "ANYONE",
			cooldown: 10,
			action: function(messageContent, id, username, channel) {
				channel.send("🎺");
			}
		},


		// Developer commands
		{
			// Starts the race early, in case you gotta go fast but the countdown is being a bully
			commandString: "start",
			permission: "DEVELOPER_COMMANDS",
			action: function() {
				game.start();
			}
		},
		{
			// End the race early, and store the results
			commandString: "end",
			permission: "DEVELOPER_COMMANDS",
			action: function() {
				game.end();
			}
		},
		{
			// End the race early, and discard the results
			commandString: "abort",
			permission: "DEVELOPER_COMMANDS",
			action: function() {
				game.end(false);
			}
		},
		{
			// Add x amount of bots
			commandString: "lotsofbots",
			permission: "DEVELOPER_COMMANDS",
			action: function(messageContent) {
				let amount = Math.min(100, parseInt(messageContent.substr(11)) || 10);
				for (let i = 0; i < amount; i++) {
					game.spawnMarble(
						undefined,
						undefined,
						_createMarbleAttributesObject(messageContent)
					);
				}
			}
		},
		{
			// Changes the level
			commandString: "level",
			permission: "DEVELOPER_COMMANDS",
			action: function(messageContent) {
				game.changeLevel(messageContent.substr(7));
			}
		}
	];
}();

module.exports = commands;
