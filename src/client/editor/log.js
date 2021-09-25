import { currentTimeString } from "../../utility";

let element;

export function setEditorLogElement(el) {
	element = el;
}

export function editorLog(message, type = "info") {
	if (console[type]) {
		console[type](message);
	} else {
		console.info(message);
	}
	element.insertAdjacentHTML(
		"beforeend",
		`<div class='${type}'>[${currentTimeString()}] ${message}</div>`
	);
	element.scrollTop = element.scrollHeight;
}
