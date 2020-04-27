import domReady from "../dom-ready";

import React from "react";
import ReactDOM from "react-dom";
import RootComponent from "./RootComponent";

domReady.then(() => {
	ReactDOM.hydrate(
		<RootComponent />,
		document.getElementById("root")
	);
});
