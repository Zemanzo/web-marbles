const game = require("../game");
const skins = require("../skins");

const colorRegEx = /#(?:[0-9a-fA-F]{3}){1,2}$/g;

const createAttributesObject = function(messageContent) {
	let messageSections = messageContent.split(" ");
	let color, skinId;

	for (let i = 1; i < Math.min(messageSections.length, 3); i++) {
		if (!color) {
			let match = messageSections[i].match(colorRegEx);
			color = (match === null ? undefined : match[0]);
			if (typeof color !== "undefined") continue;
		}

		if (!skinId) {
			skinId = skins.idList[messageSections[i] ? messageSections[i] : undefined];
			if (typeof skinId !== "undefined") continue;
		}
	}

	return {
		color,
		skinId
	};
};

const parse = function(messageContent, id, username, member) {
	let isDeveloper = false;

	if (member) {
		isDeveloper = member.roles.some(role => role.name === "Developers");
	} else {
		isDeveloper = id == "112621040487702528" || id == "133988602530103298";
	}

	if (messageContent.startsWith("!marble")) {
		game.addPlayerEntry(
			id,
			username,
			createAttributesObject(messageContent)
		);
	}

	else if (messageContent.startsWith("!end") && isDeveloper) {
		game.end();
	}

	else if (messageContent.startsWith("!lotsofbots") && isDeveloper) {
		let amount = Math.min(100, parseInt(messageContent.substr(11)) || 10);
		for (let i = 0; i < amount; i++) {
			game.spawnMarble(
				undefined,
				undefined,
				createAttributesObject(messageContent)
			);
		}
	}
};

module.exports = {
	parse
};
