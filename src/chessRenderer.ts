import { Chessboard } from "./chessBoard";

import { CHESSGROUND_CLASS, DEFAULT_PIECE_SET } from "./constants";

import "./css/markdownChess.css";

import "./css/chessboard/_coords.scss";
import "./css/chessboard/_chessground.scss";

import alphaPieces from "./css/chessboard/assets/pieces/alpha.lazy.css";
import cburnettPieces from "./css/chessboard/assets/pieces/cburnett.lazy.css";
import meridaPieces from "./css/chessboard/assets/pieces/merida.lazy.css";

const pieceSetsStyles: Record<PieceSet, StyleLoaderImport> = {
  alpha: alphaPieces,
  cburnett: cburnettPieces,
  merida: meridaPieces,
};

export function renderAllChessBlocksInElement(root: HTMLElement) {
  let chessExists = false;
  let usedPieces = false;
  for (const chessElement of root.getElementsByClassName(CHESSGROUND_CLASS)) {
    if (chessElement instanceof HTMLElement) {
      chessExists = true;
      if (!usedPieces) {
        const pieceSet = chessElement.parentElement!.dataset.pieceset;
        if (pieceSet) {
          usedPieces = true;
          pieceSetsStyles[pieceSet as PieceSet].use();
        }
      }

      new Chessboard(chessElement);
    } else {
      console.error("Non-HTML chess object");
    }
  }

  if (chessExists && !usedPieces) {
    pieceSetsStyles[DEFAULT_PIECE_SET].use();
  }
}
