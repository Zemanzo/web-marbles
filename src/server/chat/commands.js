const game = require("../game");

const commands = function() {
	return [
		// Anyone
		{
			// Enter a marble
			commandString: "marble",
			permission: "ANYONE",
			action: function(messageContent, id, username) {
				game.addRaceEntry(
					id,
					username,
					messageContent
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
				let amount = Math.min(100, parseInt(messageContent) || 10);
				for (let i = 0; i < amount; i++) {
					game.addRaceEntry(
						undefined,
						undefined,
						messageContent
					);
				}
			}
		},
		{
			// Changes the level
			commandString: "level",
			permission: "DEVELOPER_COMMANDS",
			action: function(messageContent) {
				game.changeLevel(messageContent);
			}
		}
	];
}();

module.exports = commands;
