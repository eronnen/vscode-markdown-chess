import * as path from 'path';

import MarkdownIt = require("markdown-it");
import {markdownItChessPlugin} from "../markdownItChessPlugin";

const markdownItGenerate = require("markdown-it-testgen");


describe('Markdown chess sanity', function () {
  const md = MarkdownIt().use(markdownItChessPlugin);
  markdownItGenerate(path.join(__dirname, 'suite/sanity.txt'), { header: true }, md);
});