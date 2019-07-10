const game = require("../game");
const skins = require("../skins");

const messages = function() {
	const _colorRegEx = /#(?:[0-9a-fA-F]{3}){1,2}$/g;

	const _createAttributesObject = function(messageContent) {
		let messageSections = messageContent.split(" ");
		let color, skinId;

		for (let i = 1; i < Math.min(messageSections.length, 3); i++) {
			if (!color) {
				let match = messageSections[i].match(_colorRegEx);
				color = (match === null ? undefined : match[0]);
				if (typeof color !== "undefined") continue;
			}

			if (!skinId) {
				skinId = skins.idList.includes(messageSections[i]) ? messageSections[i] : undefined;
				if (typeof skinId !== "undefined") continue;
			}
		}

		return {
			color,
			skinId
		};
	};

	return {
		parse: function(messageContent, id, username, member) {
			// Check for developer permissions
			let isDeveloper = false;
			if (member) {
				isDeveloper = member.roles.some(role => role.name === "Developers");
			} else {
				isDeveloper = id == "112621040487702528" || id == "133988602530103298";
			}

			// Check for marble entries
			if (messageContent.startsWith("!marble")) {
				game.addPlayerEntry(
					id,
					username,
					_createAttributesObject(messageContent)
				);
			}

			// -- Developer commands
			// End the race
			else if (messageContent.startsWith("!end") && isDeveloper) {
				game.end();
			}

			// Add bots to the race
			else if (messageContent.startsWith("!lotsofbots") && isDeveloper) {
				let amount = Math.min(100, parseInt(messageContent.substr(11)) || 10);
				for (let i = 0; i < amount; i++) {
					game.spawnMarble(
						undefined,
						undefined,
						_createAttributesObject(messageContent)
					);
				}
			}
		}
	};
}();

module.exports = messages;
