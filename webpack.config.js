const path = require("path");
const webpack = require("webpack");
const IgnoreNotFoundExportPlugin = require("./ignorenotfoundexportplugin.js");

module.exports = {
	mode: process.env.NODE_ENV !== "production" ? "development" : "production",
	entry: {
		client: "./public/scripts/client/client.js",
		editor: "./public/scripts/editor/editor.js",
		chat: "./public/scripts/chat/chat.js",
		discordApiRedirect: "./public/scripts/chat/discord-api-redirect.js"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].bundle.js",
		path: path.resolve(__dirname, "public/scripts/dist"),
		publicPath: "scripts/dist/"
	},
	devtool: "source-map",
	plugins: [
		new webpack.ProvidePlugin({
			THREE: "three"
		}),
		new IgnoreNotFoundExportPlugin()
	]
};
