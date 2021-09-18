let TUUIDs = [];
let charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateTinyUUID() {
	let l = 4;
	let possibilities = Math.pow(charset.length, l);
	let timeString = (new Date()).getTime().toString();
	let decimal = parseInt(timeString.substring(timeString.length - possibilities.toString().length)) % possibilities;
	while (TUUIDs.indexOf(decimal) !== -1) {
		decimal++;
	}
	TUUIDs.push(decimal);
	let tUUID = "";
	for (let i = 0; i < l; i++) {
		let remain = decimal % charset.length;
		decimal = (decimal - remain) / charset.length;
		tUUID += charset.substring(remain, remain + 1);
	}
	return tUUID.split("").reverse().join("");
}

export { generateTinyUUID };
