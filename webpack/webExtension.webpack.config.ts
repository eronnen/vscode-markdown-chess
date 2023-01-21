import { resolve } from "path";
import webpack from "webpack";

const webExtensionConfig = {
  target: "webworker",
  entry: "./src/extension.ts",
  output: {
    path: resolve(__dirname, "..", "dist", "web"),
    filename: "extension.js",
    libraryTarget: "commonjs",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  resolve: {
    mainFields: ["browser", "module", "main"], // look for `browser` entry point in imported node modules
    extensions: [".ts", ".js"], // support ts-files and js-files
    alias: {
      // provides alternate implementation for node module and source files
    },
    // fallback: {
    // 	// Webpack 5 no longer polyfills Node.js core modules automatically.
    // 	// see https://webpack.js.org/configuration/resolve/#resolvefallback
    // 	// for the list of Node.js core module polyfills.
    // 	'assert': require.resolve('assert')
    // }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1, // disable chunks by default since web extensions must be a single bundle
    }),
    new webpack.ProvidePlugin({
      process: "process/browser", // provide a shim for the global `process` variable
    }),
  ],
  externals: {
    vscode: "commonjs vscode", // ignored because it doesn't exist
  },
  performance: {
    hints: false,
  },
  devtool: "nosources-source-map",
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
  },
};

export default webExtensionConfig;
