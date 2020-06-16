import domReady from "./dom-ready";
import React from "react";
import ReactDOM from "react-dom";

export default function(RootComponent) {
	domReady.then(() => {
		ReactDOM.hydrate(
			<RootComponent {...window.__INITIAL_STATE__}/>,
			document.getElementById("root")
		);
	});
}
