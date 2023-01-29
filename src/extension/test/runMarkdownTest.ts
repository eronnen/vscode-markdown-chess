import { join } from "path";

import markdownItGenerate from "markdown-it-testgen";
import MarkdownIt from "markdown-it";

import { markdownItChessgroundPlugin } from "../markdownItChessgroundPlugin";

describe("Markdown chess sanity", function () {
  const md = MarkdownIt().use(markdownItChessgroundPlugin);
  markdownItGenerate(join(__dirname, "sanity.txt"), { header: true }, md);
});
