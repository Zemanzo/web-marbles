import * as Cookies from "js-cookie";

window.addEventListener("message", function(event) {
	// Don't parse anything that isn't ours
	if (event.origin !== window.location.origin) return;

	// If the authorization state has changed, update the user data
	if (event.data === userState.AUTH_CHANGED) {
		userState.data = Cookies.getJSON("user_data");
		console.log("updated user_data", userState.data);
	}
}, false);

let userState = {
	AUTH_CHANGED: 0,

	data: Cookies.getJSON("user_data")
};

export { userState };
