const path = require("path");
const webpack = require("webpack");
const IgnoreNotFoundExportPlugin = require("./src/pipelines/ignore-not-found-export-plugin.js");

module.exports = {
	mode: process.env.NODE_ENV !== "production" ? "development" : "production",
	entry: {
		client: "./src/client/client/client.js",
		editor: "./src/client/editor/editor.js",
		chat: "./src/client/chat/chat.js",
		discordApiRedirect: "./src/client/chat/discord-api-redirect.js",
		contact: "./src/client/contact.js"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].bundle.js",
		path: path.resolve(__dirname, "public/dist"),
		publicPath: "dist/"
	},
	devtool: "source-map",
	plugins: [
		new webpack.ProvidePlugin({
			THREE: "three"
		}),
		new IgnoreNotFoundExportPlugin(["three"])
	],
	module: {
		rules: [
			{
				test: /\.worker\.js$/,
				use: { loader: "worker-loader" }
			}
		]
	}
};
