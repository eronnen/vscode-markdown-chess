import type { Api } from "chessground/api";
import type { Config } from "chessground/config";
import type { Color, Key } from "chessground/types";
import type { DrawShape } from "chessground/draw";

import { Chessground } from "chessground";
import { colors } from "chessground/types";
import { Chess } from "chessops/chess";
import { chessgroundDests } from "chessops/compat";
import { makeFen, parseFen } from "chessops/fen";
import { parseSquare } from "chessops/util";

import { parseBoolean, parseSquaresString } from "./chessUtils";
import {
  DEFAULT_ARROW_COLOR,
  DEFAULT_SQUARE_COLOR,
  CHESSGROUND_INFO_CLASS,
  DEFAULT_BOARD_GEOMETRY,
} from "./constants";

class Chessboard {
  private chessElement: HTMLElement;
  private containerElement: HTMLElement;
  private infoElement: HTMLElement | null;
  private infoCopyElement: HTMLElement | null;

  private movable: boolean | null;
  private drawable: boolean | null;

  private boardApi: Api | null;
  private chess: Chess | null;
  private lastMove: [Key, Key] | null;
  private initialShapes: DrawShape[];

  constructor(chessElement: HTMLElement) {
    this.chessElement = chessElement;
    this.containerElement = chessElement.parentElement!;
    this.infoElement = null;
    this.infoCopyElement = null;

    this.movable = null;
    this.drawable = null;

    this.boardApi = null;
    this.chess = null;
    this.lastMove = null;
    this.initialShapes = [];

    const config = this.parseChessCodeblock();
    this.initializeChessPosition(config);
    this.createInfoElement();
    this.setBoardCallbacks(config);
    this.createHTMLBoard(config);
  }

  private parseChessCodeblock(): Config {
    const config: Config = {
      disableContextMenu: true,
    };

    // I think yaml library here is an overkill here
    for (const line of (this.chessElement.textContent || "").split("\n")) {
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
          const lastMoveSquares = parseSquaresString(value);
          if (lastMoveSquares.length >= 2) {
            config.lastMove = lastMoveSquares.slice(0, 2);
          }
          break;
        }
        case "arrows": {
          const arrowSquares = parseSquaresString(value);
          for (let i = 0; i < arrowSquares.length - 1; i += 2) {
            this.initialShapes.push({
              orig: arrowSquares[i],
              dest: arrowSquares[i + 1],
              brush: DEFAULT_ARROW_COLOR,
            });
          }
          break;
        }
        case "squares": {
          const squares = parseSquaresString(value);
          for (const square of squares) {
            this.initialShapes.push({
              orig: square,
              brush: DEFAULT_SQUARE_COLOR,
            });
          }
          break;
        }
        case "movable":
          this.movable = parseBoolean(value);
          break;
        case "drawable":
          this.drawable = parseBoolean(value);
          break;
        case "size":
          if (value.match(/^\d+/g)) {
            this.chessElement.style.width = parseFloat(value) + "px";
          }
          break;
      }
    }

    // movable if specified and if not then only if no fen supplied
    this.movable =
      this.movable === true || (!config.fen && this.movable !== false);

    // drawable if specified and if not then only if no drawing supplied
    this.drawable =
      this.drawable === true ||
      (this.initialShapes.length === 0 && this.drawable !== false);

    config.draggable = { enabled: this.movable, showGhost: true };
    config.selectable = { enabled: this.movable };
    config.drawable = { enabled: this.drawable };
    return config;
  }

  private initializeChessPosition(config: Config) {
    if (config.fen) {
      this.chess = parseFen(config.fen).unwrap(
        (setup) =>
          Chess.fromSetup(setup).unwrap(
            (value) => value,
            () => null // TODO: log FEN error
          ),
        () => null // TODO: log FEN error
      );
    } else {
      this.chess = Chess.default();
    }

    if (this.chess) {
      config.turnColor = this.chess.turn;
      config.check = this.chess.isCheck();
    }
  }

  private createInfoElement() {
    // Only if the user can move or draw then track the moves/shapes that he user does
    // and show them in a right column to the board.
    if (!this.movable && !this.drawable) {
      return;
    }

    const infoContainer = document.createElement("div");
    infoContainer.classList.add(CHESSGROUND_INFO_CLASS);
    this.infoElement = document.createElement("p");
    this.infoCopyElement = document.createElement("button");
    this.infoCopyElement.innerHTML = "Copy";
    this.infoCopyElement.hidden = true;
    this.infoCopyElement.onclick = () => {
      const info = this.infoElement!.innerText;
      if (info) {
        navigator.clipboard.writeText(info);
      }
    };

    infoContainer.appendChild(this.infoElement);
    infoContainer.appendChild(this.infoCopyElement);
    this.containerElement.appendChild(infoContainer);
  }

  private setBoardCallbacks(config: Config) {
    if (this.movable && this.chess) {
      // Allow only legal moves, I think it's more convenient for the user
      // because the typical use case of the extension is opening notes and not random boards.

      config.movable = {
        color: this.chess.turn,
        free: false,
        dests: chessgroundDests(this.chess),
        events: {
          after: this.updateChessMove.bind(this),
        },
      };
    }

    if (this.drawable) {
      config.drawable!.onChange = this.updateInfoElementText.bind(this);
    }
  }

  private createHTMLBoard(config: Config) {
    this.containerElement.classList.toggle(DEFAULT_BOARD_GEOMETRY, true);
    this.boardApi = Chessground(this.chessElement, config);

    // for some reason giving shapes in config doesn't work when configured a fen too
    // waiting for https://github.com/lichess-org/chessground/pull/247 to be merged
    if (this.initialShapes.length > 0) {
      this.boardApi.setShapes(this.initialShapes);
      this.initialShapes = [];
    }
  }

  private updateChessMove(orig: Key, dest: Key) {
    if (this.chess) {
      this.lastMove = [orig, dest];
      this.chess.play({
        from: parseSquare(orig) || 0,
        to: parseSquare(dest) || 0,
      });
    }

    this.updateInfoElementText([]);

    if (this.boardApi && this.chess) {
      this.boardApi.set({
        turnColor: this.chess.turn,
        check: this.chess.isCheck(),
        movable: {
          color: this.chess.turn,
          dests: chessgroundDests(this.chess),
        },
      });
    }
  }

  private updateInfoElementText(shapes: DrawShape[]) {
    let infoText = "";

    if (this.movable && this.chess) {
      infoText += `fen: ${makeFen(this.chess.toSetup())}\n`;

      if (this.lastMove) {
        infoText += `lastMove: ${this.lastMove[0]} ${this.lastMove[1]}\n`;
      }
    }

    if (this.drawable && shapes.length > 0) {
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
    this.infoElement!.innerText = updatedText;
    if (updatedText) {
      this.infoCopyElement!.hidden = false;
    } else {
      this.infoCopyElement!.hidden = true;
    }
  }
}

export function createChessboard(chessElement: HTMLElement) {
  new Chessboard(chessElement);
}
