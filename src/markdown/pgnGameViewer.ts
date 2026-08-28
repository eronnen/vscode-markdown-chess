import type { Color } from "@lichess-org/chessground/types";

import PgnViewer from "@lichess-org/pgn-viewer";

import {
  CHESSGROUND_PGN_VIEWER_CLASS,
  CHESSGROUND_PGN_VIEWER_WIDE_CLASS,
} from "../shared/constants";

import "./css/pgnViewer.scss";

function extractPgn(blockText: string): string {
  let pgnStart = blockText.indexOf("[");
  if (pgnStart === -1) {
    pgnStart = blockText.search(/^\s*1\./m);
  }

  return pgnStart === -1 ? "*" : blockText.substring(pgnStart);
}

export function createPgnGameViewer(
  chessElement: HTMLElement,
  chessOptions: ChessBlockOptions,
) {
  const isFilePreview = window.chessViewerContext === "pgn";
  const pgn = extractPgn(chessElement.textContent || "");

  chessElement.classList.add(CHESSGROUND_PGN_VIEWER_CLASS);
  if (isFilePreview) {
    chessElement.classList.add(CHESSGROUND_PGN_VIEWER_WIDE_CLASS);
  }

  const viewerElement = document.createElement("div");
  chessElement.textContent = "";
  chessElement.appendChild(viewerElement);

  try {
    PgnViewer(viewerElement, {
      pgn,
      orientation: chessOptions.orientation as Color | undefined,
      initialPly:
        chessOptions.initialMove === undefined
          ? 0
          : chessOptions.initialMove < 0
            ? "last"
            : chessOptions.initialMove,
      showMoves: isFilePreview ? "auto" : "bottom",
      scrollToMove: false,
      drawArrows: chessOptions.drawable !== false,
      menu: {
        getPgn: { enabled: isFilePreview },
        practiceWithComputer: { enabled: false },
        analysisBoard: { enabled: false },
      },
      lichess: false,
    });
  } catch (error) {
    viewerElement.className = "chessPgnViewerError";
    viewerElement.textContent =
      error instanceof Error ? `Invalid PGN: ${error.message}` : "Invalid PGN";
  }
}
