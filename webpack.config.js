const path = require("path");
const webpack = require("webpack");

module.exports = {
	mode: "development",
	entry: {
		client: "./public/scripts/client/client.js",
		editor: "./public/scripts/editor/editor.js",
		chat: "./public/scripts/chat/chat.js"
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
		})
	]
};
