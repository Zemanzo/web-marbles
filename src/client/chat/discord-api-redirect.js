import * as Cookies from "js-cookie";
import domReady from "../dom-ready";
import { network as config } from "../config";

domReady.then(() => {
	let response = document.getElementById("response").dataset.response;

	try {
		let queryParameters = window.location.search.substr(1).split("&").map( el => el.split("=") );
		if (queryParameters[0][0] === "error" && queryParameters[0][1] === "access_denied") {
			window.close();
		}
		if (response) {
			let user_data = JSON.parse(response);

			let days = (user_data.expires_in / 62400) - 0.1; // seconds to days minus some slack
			Cookies.set("user_data", user_data, {
				expires: days,
				path: "/",
				domain: window.location.hostname,
				secure: config.ssl
			});

			window.opener.postMessage({
				success: true,
				response: user_data
			}, window.location.origin);

			document.getElementById("await").style.display = "none";
			document.getElementById("success").style.display = "block";
			return;
		}
	}
	catch (err) {
		console.error("JSON parse probably failed", err);
	}

	document.getElementById("await").style.display = "none";
	document.getElementById("failure").style.display = "block";
});
