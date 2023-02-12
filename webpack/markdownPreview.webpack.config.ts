import { join } from "path";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TerserPlugin from "terser-webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";

const markdownConfig = {
  target: "web",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        exclude: /\.lazy\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.lazy\.css$/i,
        use: [
          {
            loader: "style-loader",
            options: {
              injectType: "lazyStyleTag",
            },
          },
          "css-loader",
        ],
      },
      {
        test: /\.s[ac]ss$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
      {
        test: /\.svg/,
        type: "asset/inline",
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          mangle: {
            properties: {
              regex: /_$/,
            },
          },
          compress: {
            passes: 3,
          },
        },
      }),
      new CssMinimizerPlugin(),
    ],
  },
  plugins: [new MiniCssExtractPlugin()],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  entry: {
    markdownPreview: join(
      __dirname,
      "..",
      "src",
      "markdown",
      "markdownPreview.ts"
    ),
    pgnPreview: join(__dirname, "..", "src", "markdown", "pgnPreview.ts"),
  },
  output: {
    path: join(__dirname, "..", "dist"),
    filename: "[name].bundle.js",
  },
};

export default markdownConfig;
