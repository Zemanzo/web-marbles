let element;

export function setEditorLogElement(el) {
	element = el;
}

export function editorLog(message, type = "info") {
	let date = new Date();
	let hrs = date.getHours();
	let min = date.getMinutes();
	let sec = date.getSeconds();
	if (hrs < 10) {
		hrs = `0${hrs}`;
	}
	if (min < 10) {
		min = `0${min}`;
	}
	if (sec < 10) {
		sec = `0${sec}`;
	}
	element.insertAdjacentHTML(
		"beforeend",
		`<div class='${type}'>[${hrs}:${min}:${sec}] ${message}</div>`
	);
	element.scrollTop = element.scrollHeight;
}
