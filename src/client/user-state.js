import Cookies from "js-cookie";

window.addEventListener("message", function(event) {
	// Don't parse anything that isn't ours
	if (event.origin !== window.location.origin) return;

	// If the authorization state has changed, update the user data
	if (event.data === userState.AUTH_CHANGED) {
		userState.data = JSON.parse(Cookies.get("user_data"));
	}
}, false);

let userState = {
	AUTH_CHANGED: 0,

	data: JSON.parse(Cookies.get("user_data"))
};

export { userState };
