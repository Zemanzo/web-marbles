import domReady from "../dom-ready";

import React from "react";
import ReactDOM from "react-dom";
import RootComponent from "./root-component";

domReady.then(() => {
	ReactDOM.hydrate(
		<RootComponent />,
		document.getElementById("root")
	);
});
