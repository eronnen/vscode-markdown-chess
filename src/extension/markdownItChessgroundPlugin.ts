import type MarkdownIt from "markdown-it";

import {
  CHESSGROUND_CONTAINER_CLASS,
  CHESSGROUND_CLASS,
} from "../shared/constants";

const vscodeElementClass = "code-line";
const chessgroundConfigDefaultGetter = () => {
  return { boardTheme: "brown", pieceSet: "cburnett" };
};

export function markdownItChessgroundPlugin(
  md: MarkdownIt,
  configGetter: ChessgroundConfigGetter = chessgroundConfigDefaultGetter
) {
  const highlight = md.options.highlight;
  md.options.highlight = (code: string, lang: string, attrs: string) => {
    if (lang === "chess") {
      // wrapping in another div so we can later add a column right to the chess board
      const config = configGetter();
      return `<pre style="all:unset;"><div class="${CHESSGROUND_CONTAINER_CLASS} ${vscodeElementClass} ${
        config.boardTheme
      } ${config.pieceSet}" data-pieceset="${
        config.pieceSet
      }"><div class="${CHESSGROUND_CLASS}">${code.trim()}</div></div></pre>`;
    } else if (highlight) {
      return highlight(code, lang, attrs);
    } else {
      return ""; // let the parser handle this code
    }
  };
}
