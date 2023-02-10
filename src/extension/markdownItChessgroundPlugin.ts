import type MarkdownIt from "markdown-it";

import {
  CHESSGROUND_CONTAINER_CLASS,
  CHESSGROUND_CLASS,
  DEFAULT_MOVE_DELAY_MILLISECONDS,
} from "../shared/constants";

const chessgroundConfigDefaultGetter = () => {
  return {
    boardTheme: "brown",
    pieceSet: "cburnett",
    playbackSpeed: DEFAULT_MOVE_DELAY_MILLISECONDS,
  };
};

export function markdownItChessgroundPlugin(
  md: MarkdownIt,
  configGetter: ChessgroundConfigGetter = chessgroundConfigDefaultGetter
) {
  const highlight = md.options.highlight;
  md.options.highlight = (code: string, lang: string, attrs: string) => {
    if (lang.toLowerCase() === "chess" || lang.toLowerCase() == "pgn") {
      // wrapping in another div so we can later add a column right to the chess board
      const config = configGetter();
      return `<div class="${CHESSGROUND_CONTAINER_CLASS} ${config.boardTheme} ${
        config.pieceSet
      }" data-lang="${lang.toLowerCase()}" data-pieceset="${
        config.pieceSet
      }" data-playback-speed="${
        config.playbackSpeed
      }"><div class="${CHESSGROUND_CLASS}">${code.trim()}</div></div>`;
    } else if (highlight) {
      return highlight(code, lang, attrs);
    } else {
      return ""; // let the parser handle this code
    }
  };
}
