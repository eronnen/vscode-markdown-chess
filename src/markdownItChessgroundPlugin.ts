import type MarkdownIt from "markdown-it";

import { CHESSGROUND_CONTAINER_CLASS, CHESSGROUND_CLASS, DEFAULT_ARROW_COLOR, DEFAULT_SQUARE_COLOR, DEFAULT_PIECE_SET, DEFAULT_BOARD_THEME } from "./constants";

const vscodeElementClass = "code-line";
const chessgroundConfigDefaultGetter : ChessgroundConfigGetter = () => {
  return { boardTheme: DEFAULT_BOARD_THEME, pieceSet: DEFAULT_PIECE_SET, arrowsBrushColor: DEFAULT_ARROW_COLOR, squaresBrushColor: DEFAULT_SQUARE_COLOR };
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
      }" data-arrows-brush-color="${config.arrowsBrushColor}" data-squares-brush-color="${config.squaresBrushColor}"><div class="${CHESSGROUND_CLASS}">${code.trim()}</div></div></pre>`;
    } else if (highlight) {
      return highlight(code, lang, attrs);
    } else {
      return ""; // let the parser handle this code
    }
  };
}
