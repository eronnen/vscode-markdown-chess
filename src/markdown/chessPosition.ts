import type { Api } from "chessground/api";
import type { Config } from "chessground/config";
import type { Color, Key } from "chessground/types";
import type { DrawShape } from "chessground/draw";

import { Chessground } from "chessground";
import { Chess } from "chessops/chess";
import { chessgroundDests } from "chessops/compat";
import { makeFen, parseFen } from "chessops/fen";
import { parseSquare } from "chessops/util";

import { parseSquaresString } from "./chessUtils";
import {
  DEFAULT_ARROW_COLOR,
  DEFAULT_SQUARE_COLOR,
  CHESSGROUND_INFO_CLASS,
  DEFAULT_BOARD_GEOMETRY,
} from "../shared/constants";

class ChessPosition {
  private chessElement_: HTMLElement;
  private containerElement_: HTMLElement;
  private infoElement_: HTMLElement | null;
  private infoCopyElement_: HTMLElement | null;

  private movable_: boolean | null;
  private drawable_: boolean | null;

  private boardApi_: Api | null;
  private chess_: Chess | null;
  private lastMove_: [Key, Key] | null;

  constructor(chessElement: HTMLElement, chessOptions: ChessBlockOptions) {
    this.chessElement_ = chessElement;
    this.containerElement_ = chessElement.parentElement!;
    this.infoElement_ = null;
    this.infoCopyElement_ = null;

    this.movable_ = null;
    this.drawable_ = null;

    this.boardApi_ = null;
    this.chess_ = null;
    this.lastMove_ = null;

    const config = this.parseOptions_(chessOptions);
    this.initializePosition_(config);
    this.createInfoElement_();
    this.setBoardCallbacks_(config);
    this.createHTMLBoard_(config);
  }

  private parseOptions_(chessOptions: ChessBlockOptions): Config {
    const config: Config = {
      disableContextMenu: true,
    };
    const shapes: DrawShape[] = [];

    if (chessOptions.orientation) {
      config.orientation = chessOptions.orientation as Color;
    }

    if (chessOptions.fen) {
      config.fen = chessOptions.fen;
    }

    if (chessOptions.lastMove) {
      const lastMoveSquares = parseSquaresString(chessOptions.lastMove);
      if (lastMoveSquares.length >= 2) {
        config.lastMove = lastMoveSquares.slice(0, 2);
      }
    }

    if (chessOptions.arrows) {
      const arrowSquares = parseSquaresString(chessOptions.arrows);
      for (let i = 0; i < arrowSquares.length - 1; i += 2) {
        shapes.push({
          orig: arrowSquares[i],
          dest: arrowSquares[i + 1],
          brush: DEFAULT_ARROW_COLOR,
        });
      }
    }

    if (chessOptions.squares) {
      const squares = parseSquaresString(chessOptions.squares);
      for (const square of squares) {
        shapes.push({
          orig: square,
          brush: DEFAULT_SQUARE_COLOR,
        });
      }
    }

    // movable if specified and if not then only if no fen supplied
    this.movable_ =
      chessOptions.movable === true ||
      (!config.fen && chessOptions.movable !== false);

    // drawable if specified and if not then only if no drawing supplied
    this.drawable_ =
      chessOptions.drawable === true ||
      (shapes.length === 0 && chessOptions.drawable !== false);

    config.draggable = { enabled: this.movable_, showGhost: true };
    config.selectable = { enabled: this.movable_ };
    config.drawable = { enabled: this.drawable_, shapes: shapes };
    config.viewOnly = !this.drawable_ && !this.movable_;
    return config;
  }

  private initializePosition_(config: Config) {
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

export function createChessPosition(
  chessElement: HTMLElement,
  chessOptions: ChessBlockOptions
) {
  new ChessPosition(chessElement, chessOptions);
}
