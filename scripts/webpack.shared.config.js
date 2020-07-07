const isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
	console.warn("Build running in production mode!");
}

const babelConfig = {
	loader: "babel-loader",
	options: {
		presets: ["@babel/preset-env", "@babel/preset-react"],
		plugins: ["babel-plugin-styled-components"]
	}
};

module.exports = {
	isProduction,
	mode: isProduction ? "production" : "development", // We do it this way so that it defaults to development if the variable is not explicitly set to "production"
	module: [
		{
			test: /\.js$/,
			exclude: /node_modules/,
			use: babelConfig
		},
		{
			test: /\.svg$/,
			use: [
				babelConfig,
				{
					loader: "react-svg-loader",
					options: {
						svgo: {
							plugins: [
								{ removeViewBox: false }
							]
						},
						jsx: true // true outputs JSX tags
					}
				}
			]
		}
	],
	plugins: []
};
