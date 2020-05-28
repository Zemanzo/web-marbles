import config from "../config";
import React from "react";
import ReactDOMServer from "react-dom/server";
import headerProps from "./componentProps/header";

export default class Page {
	constructor(app, details, rootComponent, props = {}) {
		this.details = details;
		this.rootComponent = rootComponent;

		// Add default props
		this.props = props;
		this.props.serverSideProps = this.props.serverSideProps || {};
		this.props.serverSideProps.header = headerProps;

		// Set up route in express
		app.get(`/${details.id}`, (req, res) => {
			this._renderPage(req, res);
		});
	}

	_renderPage(req, res) {
		res.setHeader("Content-Type", "text/html; charset=utf-8");
		res.setHeader("Transfer-Encoding", "chunked");

		// Get latest props
		this.props.serverSideProps = this._deepRunObjectFunctions(this.props.serverSideProps);

		// Create stream data
		const htmlStart = `
<!DOCTYPE html>
<html>
	<head>
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta http-equiv="Content-Type" content="text/html;charset=utf-8">
		<meta name="theme-color" content="#ba0069">
		<meta name="description" content="A game of racing marbles, and hoping that your marble wins.">
		<meta name="keywords" content="marble,racing,game,multiplayer,free,open source">
		<meta name="author" content="Zemanzo">
		<meta property="og:title" content="${this.details.label} - Manzo's Marbles" />
		<meta property="og:description" content="${this.details.description}" />
		<meta property="og:type" content="game:multiplayer" />
		<meta property="og:image" content="${config.network.rootUrl}images/logo.png"> <!-- This is required to be an absolute path -->
		<meta property="og:image:type" content="image/png">
		<meta property="og:image:width" content="192">
		<meta property="og:image:height" content="192">
		<meta property="og:image:alt" content="A stylized marble">
		<title>${this.details.label} - Manzo's Marbles</title>
		<link href="favicon.ico" rel="shortcut icon" type="image/x-icon">

		<!-- Stylesheets -->
		${this.details.useIcons ? "<link href=\"fontello/css/fontello.css\" rel=\"stylesheet\">" : ""}
		<link href="styles/common.css" rel="stylesheet" type="text/css">
		${this.details.isSimplePage ? "<link href=\"styles/simple-page.css\" rel=\"stylesheet\" type=\"text/css\">" : ""}
		<link href="styles/${this.details.id}.css" rel="stylesheet" type="text/css">

		<!-- Scripts -->
		<script src="dist/vendors.bundle.js"></script>
		${this.details.usesThreeOrPako ? "<script src=\"dist/threeAndPako.bundle.js\"></script >" : ""}
		<script src="dist/${this.details.id}.js"></script>
		${this.props.serverSideProps ? `<script>
			window.__INITIAL_STATE__ = ${JSON.stringify(this.props.serverSideProps)};
		</script>` : ""}

	</head>
	<body>
		<div id="root">`;
		const RootComponent = this.rootComponent;
		const rootComponentStream = ReactDOMServer.renderToNodeStream(<RootComponent {...this.props}/>);
		const htmlEnd = `
		</div>
	</body>
</html>`;

		// Create the stream
		res.write(htmlStart);
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
