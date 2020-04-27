const sharedConfig = require("./webpack.shared.config");

const path = require("path");
const nodeExternals = require("webpack-node-externals");

module.exports = {
	mode: "development",
	target: "node",
	node: {
		__dirname: true
	},
	externals: [nodeExternals()],
	entry: {
		"web-marbles.js": path.resolve(__dirname, "../src/web-marbles.js")
	},
	devtool: "source-map",
	module: {
		rules: [...sharedConfig.module]
	},
	output: {
		path: path.resolve(__dirname, "../dist"),
		filename: "[name]",
		publicPath: path.resolve(__dirname, "../")
	}
};
