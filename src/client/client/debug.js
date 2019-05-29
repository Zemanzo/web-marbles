import domReady from "../dom-ready";

domReady.then(() => {
	let debugAmount = document.getElementById("debugAmount"),
		debugAddMarble = document.getElementById("debugAdd"),
		debugStart = document.getElementById("debugStart"),
		debugEnd = document.getElementById("debugEnd");

	debugAddMarble.addEventListener("click", function() {
		window.fetch(`/debug?marble=true&amount=${debugAmount.valueAsNumber}`);
	}, false);

	debugStart.addEventListener("click", function() {
		window.fetch("/debug?start=true");
	}, false);

	debugEnd.addEventListener("click", function() {
		window.fetch("/debug?end=true");
	}, false);
});
