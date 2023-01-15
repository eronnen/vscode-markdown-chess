import MarkdownIt = require('markdown-it');

const chessgroundClass = 'chessground-markdown';

export function markdownItChessgroundPlugin(md: MarkdownIt) {
  const highlight = md.options.highlight;
  md.options.highlight = (code: string, lang: string, attrs: string) => {
    if (lang === 'chess') {
      return `<pre><div class="${chessgroundClass}">${code.trim()}</div></pre>`;
    }
    else if (highlight) {
      return highlight(code, lang, attrs);
    }
    else {
      return ''; // let the parser handle this code
    }
  };
}