import type { Config } from "chessground/config";
import type { Color, Key } from "chessground/types";
import type { DrawShape } from "chessground/draw";
import type { Api } from "chessground/api";

import { Chessground } from "chessground";
import { colors } from "chessground/types";

import { makeFen, parseFen } from "chessops/fen";
import { Chess } from "chessops/chess";
import { chessgroundDests } from "chessops/compat";
import { parseSquare } from "chessops/util";

import {
  CHESSGROUND_CLASS,
  CHESSGROUND_INFO_CLASS,
  DEFAULT_BOARD_GEOMETRY,
  DEFAULT_PIECE_SET,
  DEFAULT_ARROW_COLOR,
  DEFAULT_SQUARE_COLOR,
} from "./constants";

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

function parseBoolean(value: string): boolean | null {
  if (value.toLowerCase() === "true") {
    return true;
  } else if (value.toLowerCase() === "false") {
    return false;
  }

  return null;
}

function parseSquares(line: string): Key[] {
  const result: Key[] = [];

  let currentFile: string | null = null;
  for (const char of line) {
    if (currentFile === null) {
      if (char.toLowerCase() >= "a" && char.toLowerCase() <= "h") {
        currentFile = char.toLowerCase();
      }
    } else {
      if (char >= "1" && char <= "8") {
        result.push(`${currentFile}${char}` as Key);
        currentFile = null;
      }
    }
  }

  return result;
}

function renderChessgroundBlock(chessElement: HTMLElement) {
  chessElement.parentElement!.classList.toggle(DEFAULT_BOARD_GEOMETRY, true);

  const config: Config = {
    disableContextMenu: true,
    draggable: {
      enabled: false,
    },
    selectable: {
      enabled: false,
    },
    drawable: {
      enabled: false,
    },
  };

  const shapes: DrawShape[] = [];
  let movable: boolean | null = null;
  let drawable: boolean | null = null;

  // I think yaml library here is an overkill
  for (const line of (chessElement.textContent || "").split("\n")) {
    const delimeterPosition = line.indexOf(":");
    if (-1 === delimeterPosition) {
      // ignore invalid lines
      continue;
    }

    const option = line.substring(0, delimeterPosition);
    const value = line.substring(delimeterPosition + 1).trim();

    switch (option.toLowerCase()) {
      case "fen":
        config.fen = value;
        break;
      case "orientation":
        if (colors.includes(value as Color)) {
          config.orientation = value as Color;
        }
        break;
      case "lastmove": {
        const lastMoveSquares = parseSquares(value);
        if (lastMoveSquares.length >= 2) {
          config.lastMove = lastMoveSquares.slice(0, 2);
        }
        break;
      }
      case "arrows": {
        const arrowSquares = parseSquares(value);
        for (let i = 0; i < arrowSquares.length - 1; i += 2) {
          shapes.push({
            orig: arrowSquares[i],
            dest: arrowSquares[i + 1],
            brush: DEFAULT_ARROW_COLOR,
          });
        }
        break;
      }
      case "squares": {
        const squares = parseSquares(value);
        for (const square of squares) {
          shapes.push({
            orig: square,
            brush: DEFAULT_SQUARE_COLOR,
          });
        }
        break;
      }
      case "movable":
        movable = parseBoolean(value);
        break;
      case "drawable":
        drawable = parseBoolean(value);
        break;
      case "size":
        if (value.match(/^\d+/g)) {
          chessElement.style.width = parseFloat(value) + "px";
        }
        break;
    }
  }

  // movable if specified and if not then only if no fen supplied
  movable = movable === true || (!config.fen && movable !== false);

  // drawable if specified and if not then only if no drawing supplied
  drawable = drawable === true || (shapes.length === 0 && drawable !== false);

  let boardApi: Api | null = null;
  let chess: Chess | null = null;

  if (config.fen) {
    chess = parseFen(config.fen).unwrap(
      (setup) =>
        Chess.fromSetup(setup).unwrap(
          (value) => value,
          () => null // TODO: log FEN error
        ),
      () => null // TODO: log FEN error
    );
  } else {
    chess = Chess.default();
  }

  if (chess) {
    config.turnColor = chess.turn;
    config.check = chess.isCheck();
  }

  // If the user can move or draw then track the moves/shapes that he user does
  // and show them in a right column to the board.
  if (movable || drawable) {
    const rightColumn = document.createElement("div");
    rightColumn.classList.add(CHESSGROUND_INFO_CLASS);

    const infoElement = document.createElement("p");
    const copyButton = document.createElement("button");
    copyButton.innerHTML = "Copy";
    copyButton.hidden = true;
    copyButton.onclick = () => {
      const info = infoElement.innerText;
      if (info) {
        navigator.clipboard.writeText(info);
      }
    };

    rightColumn.appendChild(infoElement);
    rightColumn.appendChild(copyButton);
    chessElement.parentElement!.appendChild(rightColumn); // we add empty parent div in the markdown parser

    const updateInfoElementCallback = function (shapes: DrawShape[]) {
      let infoText = "";
      if (movable && chess) {
        infoText += `fen: ${makeFen(chess.toSetup())}\n`;
      }
      if (drawable && shapes.length > 0) {
        let arrows = "";
        let squares = "";
        for (const shape of shapes) {
          if (shape.orig && shape.dest) {
            arrows += `${shape.orig}->${shape.dest} `;
          } else {
            squares += `${shape.orig} `;
          }
        }

        if (arrows) {
          infoText += `arrows: ${arrows.trim()}\n`;
        }
        if (squares) {
          infoText += `squares: ${squares.trim()}`;
        }
      }

      const updatedText = infoText.trim();
      infoElement.innerText = updatedText;
      if (updatedText) {
        copyButton.hidden = false;
      } else {
        copyButton.hidden = true;
      }
    };

    if (movable) {
      if (chess) {
        // Allow only legal moves
        config.draggable!.showGhost = true;
        config.movable = {
          color: chess.turn,
          free: false,
          dests: chessgroundDests(chess),
          events: {
            after: (orig, dest) => {
              if (chess) {
                chess.play({
                  from: parseSquare(orig) || 0,
                  to: parseSquare(dest) || 0,
                });
              }

              updateInfoElementCallback([]);

              // TODO: change state instead of whole config?
              if (boardApi && chess) {
                boardApi.set({
                  turnColor: chess.turn,
                  check: chess.isCheck(),
                  movable: {
                    color: chess.turn,
                    dests: chessgroundDests(chess),
                  },
                });
              }
            },
          },
        };
      }

      config.draggable!.enabled = true;
      config.selectable!.enabled = true;
    }
    if (drawable) {
      config.drawable!.enabled = true;
      config.drawable!.onChange = updateInfoElementCallback;
    }
  }

  if (!movable && !drawable) {
    config.viewOnly = true;
  }

  boardApi = Chessground(chessElement, config);

  // for some reason giving shapes in config doesn't work when configured a fen too
  if (shapes.length > 0) {
    boardApi.setShapes(shapes);
  }
}

export function renderAllChessBlocksInElement(root: HTMLElement) {
  let chessExists = false;
  let usedPieces = false;
  for (const chessgroundContainer of root.getElementsByClassName(
    CHESSGROUND_CLASS
  )) {
    if (chessgroundContainer instanceof HTMLElement) {
      chessExists = true;
      if (!usedPieces) {
        const pieceSet = chessgroundContainer.parentElement!.dataset.pieceset;
        if (pieceSet) {
          usedPieces = true;
          pieceSetsStyles[pieceSet as PieceSet].use();
        }
      }

      renderChessgroundBlock(chessgroundContainer);
    } else {
      console.error("Non-HTML chessground object");
    }
  }

  if (chessExists && !usedPieces) {
    pieceSetsStyles[DEFAULT_PIECE_SET].use();
  }
}
