module.exports = function(game) {
	const chat = {};
	chat.testMessage = function(messageContent, id, username) {
		if (messageContent.startsWith("!marble")) {
			let colorRegEx = /#(?:[0-9a-fA-F]{3}){1,2}$/g;
			let match = messageContent.match(colorRegEx);
			let color = (match === null ? undefined : match[0]);

			game.addMarble(
				id,
				username,
				color
			);
		}

		else if (messageContent.startsWith("!end") && (id == "112621040487702528" || id == "133988602530103298")) {
			game.end();
		}

		else if (messageContent.startsWith("!lotsofbots") && (id == "112621040487702528" || id == "133988602530103298")) {
			let amount = Math.min(100, parseInt(messageContent.substr(11)) || 10);
			for (let i = 0; i < amount; i++) {
				game.spawnMarble();
			}
		}
	};

	return chat;
};
