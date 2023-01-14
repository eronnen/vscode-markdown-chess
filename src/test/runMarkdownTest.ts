import * as path from 'path';

import MarkdownIt = require("markdown-it");
import {markdownItChessgroundPlugin} from "../markdownItChessgroundPlugin";

const markdownItGenerate = require("markdown-it-testgen");


describe('Markdown chess sanity', function () {
  const md = MarkdownIt().use(markdownItChessgroundPlugin);
  markdownItGenerate(path.join(__dirname, 'suite/sanity.txt'), { header: true }, md);
});