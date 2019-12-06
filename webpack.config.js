const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
	mode: process.env.NODE_ENV !== "production" ? "development" : "production",
	entry: {
		client: "./src/client/client/client.js",
		editor: "./src/client/editor/editor.js",
		skins: "./src/client/skins/skins.js",
		chat: "./src/client/chat/chat.js",
		discordApiRedirect: "./src/client/chat/discord-api-redirect.js",
		contact: "./src/client/contact/contact.js",
		debug: "./src/client/client/debug.js"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].bundle.js",
		path: path.resolve(__dirname, "public/dist"),
		publicPath: "dist/"
	},
	devtool: "source-map",
	module: {
		rules: [
			{
				test: /\.worker\.js$/,
				use: { loader: "worker-loader" }
			}
		]
	},
	plugins: [
		new CopyPlugin([
			{
				from: path.resolve(__dirname, "node_modules/three/examples/js/libs/draco/gltf"),
				to: path.resolve(__dirname, "public/dist/libs/draco")
			}
		])
	]
};
