module.exports = {
	info: function(message, ...args) {
		console.log(`${currentHourString()}${message}`, ...args);
	},

	warn: function(message, ...args) {
		console.log(`${currentHourString().yellow}${message}`, ...args);
	},

	error: function(message, ...args) {
		console.log(`${currentHourString().red}${message}`, ...args);
	},

	throw: function(message) {
		throw `${currentHourString().red}${"[FATAL]".red} ${message}`;
	}
};

function pad(num, size) {
	let s = `000000000${num}`;
	return s.substr(s.length - size);
}

function currentHourString() {
	let date = new Date();
	return `[${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}] `;
}
