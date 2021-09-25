import Cookies from "js-cookie";

function getParsedUserDataCookie() {
	try {
		const cookie = Cookies.get("user_data");
		if (cookie) {
			return JSON.parse(cookie);
		}
	} catch (err) {
		console.warn("Could not parse user_data cookie. Will assume it was empty...", err);
	}
}

window.addEventListener("message", function(event) {
	// Don't parse anything that isn't ours
	if (event.origin !== window.location.origin) return;

	// If the authorization state has changed, update the user data
	if (event.data === userState.AUTH_CHANGED) {
		userState.data = getParsedUserDataCookie();
	}
}, false);

const userState = {
	AUTH_CHANGED: 0,
	data: getParsedUserDataCookie()
};

export { userState };
