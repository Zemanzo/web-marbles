export default new Promise((resolve) => {
	if (document.readyState === "interactive" || document.readyState === "complete") {
		resolve(true);
	} else {
		window.addEventListener("DOMContentLoaded", () => resolve(true), false);
	}
});
