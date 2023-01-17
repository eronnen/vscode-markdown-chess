import MarkdownIt = require('markdown-it');

const chessgroundClass = 'chessground-markdown';

export function markdownItChessgroundPlugin(md: MarkdownIt) {
  const highlight = md.options.highlight;
  md.options.highlight = (code: string, lang: string, attrs: string) => {
    if (lang === 'chess') {
      // wrapping in another div so we can later add a column right to the chess board
      return `<pre style="all:unset;"><div><div class="${chessgroundClass}">${code.trim()}</div></div></pre>`;
    }
    else if (highlight) {
      return highlight(code, lang, attrs);
    }
    else {
      return ''; // let the parser handle this code
    }
  };
}