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
  private chessElement_: HTMLElement;
  private containerElement_: HTMLElement;
  private infoElement_: HTMLElement | null;
  private infoCopyElement_: HTMLElement | null;

  private movable_: boolean | null;
  private drawable_: boolean | null;

  private boardApi_: Api | null;
  private chess_: Chess | null;
  private lastMove_: [Key, Key] | null;
  private initialShapes_: DrawShape[];

  constructor(chessElement: HTMLElement) {
    this.chessElement_ = chessElement;
    this.containerElement_ = chessElement.parentElement!;
    this.infoElement_ = null;
    this.infoCopyElement_ = null;

    this.movable_ = null;
    this.drawable_ = null;

    this.boardApi_ = null;
    this.chess_ = null;
    this.lastMove_ = null;
    this.initialShapes_ = [];

    const config = this.parseChessCodeblock_();
    this.initializeChessPosition_(config);
    this.createInfoElement_();
    this.setBoardCallbacks_(config);
    this.createHTMLBoard_(config);
  }

  private parseChessCodeblock_(): Config {
    const config: Config = {
      disableContextMenu: true,
    };

    // I think yaml library here is an overkill here
    for (const line of (this.chessElement_.textContent || "").split("\n")) {
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
            this.initialShapes_.push({
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
            this.initialShapes_.push({
              orig: square,
              brush: DEFAULT_SQUARE_COLOR,
            });
          }
          break;
        }
        case "movable":
          this.movable_ = parseBoolean(value);
          break;
        case "drawable":
          this.drawable_ = parseBoolean(value);
          break;
        case "size":
          if (value.match(/^\d+/g)) {
            this.chessElement_.style.width = parseFloat(value) + "px";
          }
          break;
      }
    }

    // movable if specified and if not then only if no fen supplied
    this.movable_ =
      this.movable_ === true || (!config.fen && this.movable_ !== false);

    // drawable if specified and if not then only if no drawing supplied
    this.drawable_ =
      this.drawable_ === true ||
      (this.initialShapes_.length === 0 && this.drawable_ !== false);

    config.draggable = { enabled: this.movable_, showGhost: true };
    config.selectable = { enabled: this.movable_ };
    config.drawable = { enabled: this.drawable_ };
    return config;
  }

  private initializeChessPosition_(config: Config) {
    if (config.fen) {
      this.chess_ = parseFen(config.fen).unwrap(
        (setup) =>
          Chess.fromSetup(setup).unwrap(
            (value) => value,
            () => null // TODO: log FEN error
          ),
        () => null // TODO: log FEN error
      );
    } else {
      this.chess_ = Chess.default();
    }

    if (this.chess_) {
      config.turnColor = this.chess_.turn;
      config.check = this.chess_.isCheck();
    }
  }

  private createInfoElement_() {
    // Only if the user can move or draw then track the moves/shapes that he user does
    // and show them in a right column to the board.
    if (!this.movable_ && !this.drawable_) {
      return;
    }

    const infoContainer = document.createElement("div");
    infoContainer.classList.add(CHESSGROUND_INFO_CLASS);
    this.infoElement_ = document.createElement("p");
    this.infoCopyElement_ = document.createElement("button");
    this.infoCopyElement_.innerHTML = "Copy";
    this.infoCopyElement_.hidden = true;
    this.infoCopyElement_.onclick = () => {
      const info = this.infoElement_!.innerText;
      if (info) {
        navigator.clipboard.writeText(info);
      }
    };

    infoContainer.appendChild(this.infoElement_);
    infoContainer.appendChild(this.infoCopyElement_);
    this.containerElement_.appendChild(infoContainer);
  }

  private setBoardCallbacks_(config: Config) {
    if (this.movable_ && this.chess_) {
      // Allow only legal moves, I think it's more convenient for the user
      // because the typical use case of the extension is opening notes and not random boards.

      config.movable = {
        color: this.chess_.turn,
        free: false,
        dests: chessgroundDests(this.chess_),
        events: {
          after: this.updateChessMove_.bind(this),
        },
      };
    }

    if (this.drawable_) {
      config.drawable!.onChange = this.updateInfoElementText_.bind(this);
    }
  }

  private createHTMLBoard_(config: Config) {
    this.containerElement_.classList.toggle(DEFAULT_BOARD_GEOMETRY, true);
    this.boardApi_ = Chessground(this.chessElement_, config);

    // for some reason giving shapes in config doesn't work when configured a fen too
    // waiting for https://github.com/lichess-org/chessground/pull/247 to be merged
    if (this.initialShapes_.length > 0) {
      this.boardApi_.setShapes(this.initialShapes_);
      this.initialShapes_ = [];
    }
  }

  private updateChessMove_(orig: Key, dest: Key) {
    if (this.chess_) {
      this.lastMove_ = [orig, dest];
      this.chess_.play({
        from: parseSquare(orig) || 0,
        to: parseSquare(dest) || 0,
      });
    }

    this.updateInfoElementText_([]);

    if (this.boardApi_ && this.chess_) {
      this.boardApi_.set({
        turnColor: this.chess_.turn,
        check: this.chess_.isCheck(),
        movable: {
          color: this.chess_.turn,
          dests: chessgroundDests(this.chess_),
        },
      });
    }
  }

  private updateInfoElementText_(shapes: DrawShape[]) {
    let infoText = "";

    if (this.movable_ && this.chess_) {
      infoText += `fen: ${makeFen(this.chess_.toSetup())}\n`;

      if (this.lastMove_) {
        infoText += `lastMove: ${this.lastMove_[0]} ${this.lastMove_[1]}\n`;
      }
    }

    if (this.drawable_ && shapes.length > 0) {
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
    this.infoElement_!.innerText = updatedText;
    if (updatedText) {
      this.infoCopyElement_!.hidden = false;
    } else {
      this.infoCopyElement_!.hidden = true;
    }
  }
}

export function createChessboard(chessElement: HTMLElement) {
  new Chessboard(chessElement);
}
