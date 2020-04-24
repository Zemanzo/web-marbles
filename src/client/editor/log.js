import { currentTimeString } from "../../utility";

let element;

export function setEditorLogElement(el) {
	element = el;
}

export function editorLog(message, type = "info") {
	element.insertAdjacentHTML(
		"beforeend",
		`<div class='${type}'>[${currentTimeString()}] ${message}</div>`
	);
	element.scrollTop = element.scrollHeight;
}
