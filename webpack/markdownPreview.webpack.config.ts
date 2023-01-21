import { join } from "path";
import shared from "./markdown.shared.webpack.config";

module.exports = {
  ...shared,
  entry: {
    markdownPreview: join(
      __dirname,
      "..",
      "src",
      "markdownPreview",
      "markdownPreview.ts"
    ),
  },
  output: {
    path: join(__dirname, "..", "dist"),
    filename: "[name].bundle.js",
  },
};
