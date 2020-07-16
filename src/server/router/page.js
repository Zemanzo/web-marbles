import config from "../config";
import React from "react";
import ReactDOMServer from "react-dom/server";
import {ServerStyleSheet} from "styled-components";
import headerProps from "./componentProps/header";

export default class Page {
	constructor(app, details, RootComponent) {
		this.RootComponent = RootComponent;

		this.details = details;
		this.props = {}; // Should be filled by the page's _getLatestProps function

		// Set up route in express
		app.get(`/${details.id}`, (req, res) => {
			this._renderPage(req, res);
		});

		// Add route to header props
		this.headerProps = Object.assign({ route: details.id }, headerProps);

		this.htmlStart = this._basicMinifyHTML(`
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

		<!-- Static stylesheets -->
		<link href="fontello/css/fontello.css" rel="stylesheet">
		<link href="styles/common.css" rel="stylesheet" type="text/css">
		${details.isSimplePage ? "<link href=\"styles/simple-page.css\" rel=\"stylesheet\" type=\"text/css\">" : ""}
		<link href="styles/${details.id}.css" rel="stylesheet" type="text/css">

		<!-- Static scripts -->
		<script src="dist/vendors.bundle.js"></script>
		${details.usesThreeOrPako ? "<script src=\"dist/threeAndPako.bundle.js\"></script >" : ""}
		<script src="dist/${details.id}.js"></script>
	</head>
	<body>
		<div id="root">`);

		this.htmlRoot = null;
		this.htmlEnd = null;
	}

	_renderPage(req, res) {
		res.setHeader("Content-Type", "text/html; charset=utf-8");
		res.setHeader("Transfer-Encoding", "chunked");
		res.write(this.htmlStart);

		// Get latest data and (re-)render if necessary
		if(this._getLatestProps() === true || !this.htmlRoot) {
			const latestProps = Object.assign({header: this.headerProps}, this.props);

			// Render the root component
			const styleSheet = new ServerStyleSheet();
			let styleTags = "";
			try {
				//const combinedJsx = styleSheet.collectStyles(<this.RootComponent {...latestProps} />);
				this.htmlRoot = ReactDOMServer.renderToString(<this.RootComponent {...latestProps} />);
				styleTags = styleSheet.getStyleTags();
			} catch(error) {
				console.error(`Failed to render root for page ${this.details.label}: ${error.message}`, error.stack);
			} finally {
				styleSheet.seal();
			}

			// Generate end html, including props for hydration and style data
			// No formatting because we want to send a minimal amount of data, and not waste processing resources
			this.htmlEnd = `</div>${
				latestProps ? `<script>window.__INITIAL_STATE__ = ${JSON.stringify(latestProps)};</script>` : ""
			}${styleTags}</body></html>`;
		}

		// Send the rendered/generated data
		res.write(this.htmlRoot);
		res.write(this.htmlEnd);
		res.end();
	}

	// Overridable function which will update this.props with the latest data relevant to this page
	// If any data has changed, this function should return true to trigger a re-render
	_getLatestProps() {
		return false;
	}

	/**
	 * Minifies the HTML string, and returns the minified version
	 * @param {string} html
	 * @returns {string} Minified HTML string
	 */
	_basicMinifyHTML(html) {
		return html.replace(/\n\s*|<!--.*-->/g, "");
	}
}
