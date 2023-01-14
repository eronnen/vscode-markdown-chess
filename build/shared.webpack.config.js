const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  target: 'web',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
            MiniCssExtractPlugin.loader,
            "css-loader"
        ]
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin()
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
}
