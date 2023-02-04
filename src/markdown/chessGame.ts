import type { Api } from "chessground/api";
import type { Config } from "chessground/config";
import type { Color } from "chessground/types";
import type { Setup } from "chessops/setup";
import type { NormalMove, DropMove } from "chessops/types";

import { Chessground } from "chessground";
import { chessgroundMove } from "chessops/compat";
import { Chess } from "chessops/chess";
import { PgnParser, startingPosition } from "chessops/pgn";
import { makeFen } from "chessops/fen";
import { parseSan } from "chessops/san";
import { defaultSetup } from "chessops/setup";
import { isDrop } from "chessops/types";
import { makeSquare, opposite } from "chessops/util";

import {
  DEFAULT_MOVE_DELAY_MILLISECONDS,
  CHESSGROUND_MOVES_CLASS,
  CHESSGROUND_MOVE_BUTTONS_CLASS,
} from "../shared/constants";

function logFuck(s: string) {
  const fuck = document.createElement("p");
  fuck.textContent = s;
  document.body.appendChild(fuck);
  return;
}

class ChessGame {
  private chessElement_: HTMLElement;
  private containerElement_: HTMLElement;

  private initialPosition_: Setup | null;
  private sanMoves_: string[];
  private currentMove_: number;
  private boardApi_: Api | null;
  private chess_: Chess | null;

  constructor(
    chessElement: HTMLElement,
    chessOptions: ChessBlockOptions,
    isPgn: boolean
  ) {
    this.chessElement_ = chessElement;
    this.containerElement_ = chessElement.parentElement!;

    this.initialPosition_ = null;
    this.sanMoves_ = [];
    this.currentMove_ = 0;
    this.boardApi_ = null;
    this.chess_ = null;

    if (isPgn) {
      this.parsePgnGame_();
    } else {
      this.parseFenWithMoves_(chessOptions);
    }

    if (this.initialPosition_) {
      this.chess_ = Chess.fromSetup(this.initialPosition_).unwrap(); // TODO: handle errors
    } else {
      this.initialPosition_ = defaultSetup();
      this.chess_ = Chess.default();
    }

    this.createChessBoard_(chessOptions);
    this.createMovesElement_();
    this.playMove_(DEFAULT_MOVE_DELAY_MILLISECONDS);
  }

  private parsePgnGame_() {
    const blockText = this.chessElement_.textContent || "";
    let pgnStart = blockText.indexOf("[");
    if (pgnStart == -1) {
      pgnStart = blockText.indexOf("1.");
    }

    if (pgnStart == -1) {
      // No PGN
      return null;
    }

    new PgnParser((game, err) => {
      if (err) {
        // Error parsing pgn
        this.chessElement_.textContent = `Error Parsing PGN: ${err}`;
        return;
      }

      this.initialPosition_ = startingPosition(game.headers).unwrap().toSetup(); // TODO: handle errors
      for (const move of game.moves.mainline()) {
        this.sanMoves_.push(move.san);
      }
    }).parse(blockText.substring(pgnStart));
  }

  private parseFenWithMoves_(chessOptions: ChessBlockOptions) {
    return null;
  }

  private createChessBoard_(chessOptions: ChessBlockOptions) {
    const config: Config = {
      fen: makeFen(this.initialPosition_!),
      disableContextMenu: true,
      draggable: {
        enabled: false,
      },
      selectable: {
        enabled: false,
      },
      viewOnly: true,
      turnColor: this.chess_?.turn,
      check: this.chess_?.isCheck(),
    };

    if (chessOptions.orientation) {
      config.orientation = chessOptions.orientation as Color;
    }

    this.boardApi_ = Chessground(this.chessElement_, config);
  }

  private playMove_(nextMoveDelay: number = -1) {
    if (
      this.currentMove_ >= this.sanMoves_.length ||
      !this.chess_ ||
      !this.boardApi_
    ) {
      return;
    }

    const move = parseSan(this.chess_, this.sanMoves_[this.currentMove_]);
    this.currentMove_++;
    if (!move) {
      logFuck("FUCK1");
      return;
    }

    // TODO: catch errors
    this.chess_.play(move);
    const moveSquares = chessgroundMove(move);

    if (isDrop(move)) {
      this.boardApi_.newPiece(
        {
          role: (move as DropMove).role,
          color: opposite(this.chess_.turn),
        },
        makeSquare((move as DropMove).to)
      );
    } else {
      this.boardApi_.move(moveSquares[0], moveSquares[1]);
      if ((move as NormalMove).promotion) {
        this.boardApi_.setPieces(
          new Map([
            [
              makeSquare((move as NormalMove).to),
              {
                color: opposite(this.chess_.turn),
                role: (move as NormalMove).promotion!,
                promoted: true,
              },
            ],
          ])
        );
      }
    }

    this.boardApi_.set({
      turnColor: this.chess_.turn,
      check: this.chess_.isCheck(),
    });

    if (nextMoveDelay >= 0) {
      setTimeout(
        this.playMove_.bind(this),
        this.boardApi_.state.animation.duration + nextMoveDelay,
        nextMoveDelay
      );
    }
  }

  private createMovesElement_() {
    const movesContainer = document.createElement("div");
    movesContainer.classList.add(CHESSGROUND_MOVES_CLASS);

    const buttonFirst = document.createElement("button");
    buttonFirst.textContent = "";

    const buttonPrev = document.createElement("button");
    buttonPrev.textContent = "";

    const buttonPlay = document.createElement("button");
    buttonPlay.textContent = "";

    const buttonNext = document.createElement("button");
    buttonNext.textContent = "";

    const buttonLast = document.createElement("button");
    buttonLast.textContent = "";

    const buttonsContainer = document.createElement("div");
    buttonsContainer.classList.add(CHESSGROUND_MOVE_BUTTONS_CLASS);
    buttonsContainer.appendChild(buttonFirst);
    buttonsContainer.appendChild(buttonPrev);
    buttonsContainer.appendChild(buttonPlay);
    buttonsContainer.appendChild(buttonNext);
    buttonsContainer.appendChild(buttonLast);

    movesContainer.appendChild(buttonsContainer);
    this.containerElement_.appendChild(movesContainer);
  }
}

export function createChessGame(
  chessElement: HTMLElement,
  chessOptions: ChessBlockOptions,
  isPgn: boolean
) {
  new ChessGame(chessElement, chessOptions, isPgn);
}
