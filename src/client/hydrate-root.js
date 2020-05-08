import domReady from "./dom-ready";
import React from "react";
import ReactDOM from "react-dom";

export default function(RootComponent) {
	domReady.then(() => {
		ReactDOM.hydrate(
			<RootComponent />,
			document.body
		);
	});
}
