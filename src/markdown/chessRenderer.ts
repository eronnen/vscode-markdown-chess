import type { Color } from "chessground/types";
import { colors } from "chessground/types";

import { parseBoolean } from "./chessUtils";
import {
  CHESSGROUND_CLASS,
  DEFAULT_PIECE_SET,
  DEFAULT_BOARD_GEOMETRY,
  DEFAULT_MOVE_DELAY_MILLISECONDS,
  CHESSGROUND_CHESS_GAME_CLASS,
  CHESSGROUND_CHESS_POSITION_CLASS,
} from "../shared/constants";

import { createChessPosition } from "./chessPosition";
import { createChessGame } from "./chessGame";

import "./css/markdownChess.css";
import "./css/lichessFont.css";

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

function parseChessBlockOptions(chessElement: HTMLElement): ChessBlockOptions {
  const options: ChessBlockOptions = {
    size: undefined,
    orientation: undefined,
    fen: undefined,
    arrows: undefined,
    squares: undefined,
    movable: undefined,
    drawable: undefined,
    lastMove: undefined,
    moves: undefined,
    initialMove: undefined,
    variant: undefined,
  };

  // I think yaml library here is an overkill here, also won't mix well with PGN
  for (const line of (chessElement.textContent || "").split("\n")) {
    if (line.startsWith("1.") || line.startsWith("[")) {
      // it's the start of a PGN, finish parsing block
      break;
    }

    const delimeterPosition = line.indexOf(":");
    if (-1 === delimeterPosition) {
      // ignore invalid lines
      continue;
    }

    const option = line.substring(0, delimeterPosition);
    const value = line.substring(delimeterPosition + 1).trim();

    switch (option.toLowerCase()) {
      case "size":
        if (value.match(/^\d+/g)) {
          chessElement.style.width = parseFloat(value) + "px";
        }
        break;
      case "orientation":
        if (colors.includes(value as Color)) {
          options.orientation = value as Color;
        }
        break;
      case "fen":
        options.fen = value;
        break;
      case "lastmove":
        options.lastMove = value;
        break;
      case "arrows":
        options.arrows = value;
        break;
      case "squares":
        options.squares = value;
        break;
      case "movable":
        options.movable = parseBoolean(value);
        break;
      case "drawable":
        options.drawable = parseBoolean(value);
        break;
      case "moves":
        options.moves = value.trim();
        break;
      case "initialmove":
        if (value.match(/^-?\d+/g)) {
          options.initialMove = parseInt(value);
        }
        break;
      case "variant":
        options.variant = value.trim();
        break;
    }
  }

  return options;
}

export function renderAllChessBlocksInElement(root: HTMLElement) {
  let chessExists = false;
  let usedPieces = false;
  for (const chessElement of root.getElementsByClassName(CHESSGROUND_CLASS)) {
    if (chessElement instanceof HTMLElement) {
      chessExists = true;

      const preParent = chessElement.closest("pre");
      if (preParent) {
        preParent.style.all = "unset";
      }

      if (!usedPieces) {
        const pieceSet = chessElement.parentElement!.dataset.pieceset;
        if (pieceSet) {
          usedPieces = true;
          pieceSetsStyles[pieceSet as PieceSet].use();
        }
      }

      let playbackSpeed = DEFAULT_MOVE_DELAY_MILLISECONDS;
      if (chessElement.parentElement!.dataset.playbackSpeed) {
        playbackSpeed = parseInt(
          chessElement.parentElement!.dataset.playbackSpeed
        );
      }

      const chessOptions = parseChessBlockOptions(chessElement);

      if (chessElement.parentElement!.dataset.lang == "pgn") {
        chessElement.classList.add(CHESSGROUND_CHESS_GAME_CLASS);
        createChessGame(chessElement, chessOptions, true, playbackSpeed);
      } else if (chessOptions.moves) {
        chessElement.classList.add(CHESSGROUND_CHESS_GAME_CLASS);
        createChessGame(chessElement, chessOptions, false, playbackSpeed);
      } else {
        chessElement.classList.add(CHESSGROUND_CHESS_POSITION_CLASS);
        createChessPosition(chessElement, chessOptions);
      }

      chessElement.parentElement!.classList.toggle(
        DEFAULT_BOARD_GEOMETRY,
        true
      );
    } else {
      // Error
    }
  }

  if (chessExists && !usedPieces) {
    pieceSetsStyles[DEFAULT_PIECE_SET].use();
  }
}
