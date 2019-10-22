import domReady from "../dom-ready";
import * as config from "../config";

domReady.then(() => {
	document.getElementById("reveal").addEventListener("click", function() {
		let email;

		email = typeof config.contact.decode === "function"
			? config.contact.decode(config.contact.email)
			: config.contact.email;

		this.innerHTML = `<a href="mailto:${email}">${email}</a>`;
	}, false);
});
