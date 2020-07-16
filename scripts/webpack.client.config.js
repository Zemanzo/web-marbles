const sharedConfig = require("./webpack.shared.config");

const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
	mode: sharedConfig.mode,
	entry: {
		client: "./src/client/client/client.js",
		newclient: "./src/client/client/newclient.js",
		editor: "./src/client/editor/editor.js",
		skins: "./src/client/skins/skins.js",
		chat: "./src/client/chat/chat.js",
		discordApiRedirect: "./src/client/chat/discord-api-redirect.js",
		contact: "./src/client/contact/contact.js",
		leaderboards: "./src/client/leaderboards/leaderboards.js",
		debug: "./src/client/client/debug.js"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].bundle.js",
		path: path.resolve(__dirname, "../public/dist"),
		publicPath: "dist/"
	},
	optimization: {
		minimize: sharedConfig.isProduction,
		minimizer: [new TerserPlugin()],
		splitChunks: {
			cacheGroups: {
				threeAndPako: {
					test: /[\\/]node_modules[\\/](three|pako)[\\/]/,
					name: "threeAndPako",
					chunks: "all"
				},
				otherVendors: {
					test: /[\\/]node_modules[\\/](?!three|pako).*[\\/]/,
					name: "vendors",
					chunks: "all"
				}
			}
		}
	},
	devtool: "source-map",
	module: {
		rules: [
			{
				test: /\.worker\.js$/,
				use: { loader: "worker-loader" }
			},
			...sharedConfig.module // Add default module, used for transpiling React JSX
		]
	},
	plugins: [
		...sharedConfig.plugins,
		new CopyPlugin([
			{
				from: path.resolve(
					__dirname,
					"../node_modules/three/examples/js/libs/draco/gltf"
				),
				to: path.resolve(__dirname, "../public/dist/libs/draco")
			}
		])
	]
};
