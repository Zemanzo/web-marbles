import config from "../config";
import React from "react";
import ReactDOMServer from "react-dom/server";
import headerProps from "./componentProps/header";

export default class Page {
	constructor(app, details, rootComponent, props = {}) {
		this.rootComponent = rootComponent;

		// Add default props
		this.props = props;
		this.props.header = headerProps;

		// Set up route in express
		app.get(`/${details.id}`, (req, res) => {
			this._renderPage(req, res);
		});

		this.htmlStart = `
<!DOCTYPE html>
<html>
	<head>
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta http-equiv="Content-Type" content="text/html;charset=utf-8">
		<meta name="theme-color" content="#ba0069">
		<meta name="description" content="A game of racing marbles, and hoping that your marble wins.">
		<meta name="keywords" content="marble,racing,game,multiplayer,free,open source">
		<meta name="author" content="Zemanzo">
		<meta property="og:title" content="${details.label} - Manzo's Marbles" />
		<meta property="og:description" content="${details.description}" />
		<meta property="og:type" content="game:multiplayer" />
		<meta property="og:image" content="${config.network.rootUrl}images/logo.png"> <!-- This is required to be an absolute path -->
		<meta property="og:image:type" content="image/png">
		<meta property="og:image:width" content="192">
		<meta property="og:image:height" content="192">
		<meta property="og:image:alt" content="A stylized marble">
		<title>${details.label} - Manzo's Marbles</title>
		<link href="favicon.ico" rel="shortcut icon" type="image/x-icon">

		<!-- Stylesheets -->
		${details.useIcons ? "<link href=\"fontello/css/fontello.css\" rel=\"stylesheet\">" : ""}
		<link href="styles/common.css" rel="stylesheet" type="text/css">
		${details.isSimplePage ? "<link href=\"styles/simple-page.css\" rel=\"stylesheet\" type=\"text/css\">" : ""}
		<link href="styles/${details.id}.css" rel="stylesheet" type="text/css">

		<!-- Scripts -->
		<script src="dist/vendors.bundle.js"></script>
		${details.usesThreeOrPako ? "<script src=\"dist/threeAndPako.bundle.js\"></script >" : ""}
		<script src="dist/${details.id}.js"></script>
	</head>
	<body>
		<div id="root">`;
	}

	_renderPage(req, res) {
		res.setHeader("Content-Type", "text/html; charset=utf-8");
		res.setHeader("Transfer-Encoding", "chunked");

		// Get latest props
		const latestProps = this._deepRunObjectFunctions(this.props);

		const RootComponent = this.rootComponent;
		const rootComponentStream = ReactDOMServer.renderToNodeStream(<RootComponent serverSideProps={latestProps}/>);
		const htmlEnd = `</div>
		${latestProps ? `<script>
			window.__INITIAL_STATE__ = ${JSON.stringify(latestProps)};
		</script>` : ""}
	</body>
</html>`;

		// Create the stream
		res.write(this.htmlStart);
		rootComponentStream.pipe(res, { end: false });
		rootComponentStream.on("end", () => {
			res.write(htmlEnd);
			res.end();
		});
	}

	/**
	 * Runs all functions in an object, and saves the result in the original key.
	 * @param {Object} obj
	 */
	_deepRunObjectFunctions(obj) {
		const newObj = {};
		for (const key in obj) {
			if (this._isObject(obj[key])) {
				newObj[key] = this._deepRunObjectFunctions(obj[key]);
			} else if (this._isFunction(obj[key])) {
				newObj[key] = obj[key]();
			} else {
				newObj[key] = obj[key];
			}
		}
		return newObj;
	}

	_isObject(a) {
		return !!a && a.constructor === Object;
	}

	_isFunction(x) {
		return Object.prototype.toString.call(x) == "[object Function]";
	}
}
