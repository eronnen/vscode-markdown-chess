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

  private buttonFirstMove_: HTMLButtonElement;
  private buttonPreviousMove_: HTMLButtonElement;
  private buttonPlayMove_: HTMLButtonElement;
  private buttonNextMove_: HTMLButtonElement;
  private buttonLastMove_: HTMLButtonElement;

  private initialPosition_: Setup;
  private sanMoves_: string[];
  private currentMove_: number;
  private boardApi_: Api;
  private chess_: Chess;

  private currentNextMoveCallback_: ReturnType<typeof setTimeout> | null;

  constructor(
    chessElement: HTMLElement,
    chessOptions: ChessBlockOptions,
    isPgn: boolean
  ) {
    this.chessElement_ = chessElement;
    this.containerElement_ = chessElement.parentElement!;

    this.sanMoves_ = [];
    this.currentMove_ = 0;

    if (isPgn) {
      this.parsePgnGame_();
    } else {
      this.parseFenWithMoves_(chessOptions);
    }

    this.initializeChess_();
    this.createMovesElement_();
    this.updateMoveButtons_();
    this.createChessBoard_(chessOptions);
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

  private createMovesElement_() {
    const movesContainer = document.createElement("div");
    movesContainer.classList.add(CHESSGROUND_MOVES_CLASS);

    this.buttonFirstMove_ = document.createElement("button");
    this.buttonFirstMove_.textContent = "";
    this.buttonFirstMove_.onclick = this.goToFirstMove_.bind(this);

    this.buttonPreviousMove_ = document.createElement("button");
    this.buttonPreviousMove_.textContent = "";

    this.buttonPlayMove_ = document.createElement("button");
    this.buttonPlayMove_.textContent = "";
    this.buttonPlayMove_.onclick = this.playMove_.bind(
      this,
      DEFAULT_MOVE_DELAY_MILLISECONDS
    );

    this.buttonNextMove_ = document.createElement("button");
    this.buttonNextMove_.textContent = "";
    this.buttonNextMove_.onclick = () => {
      this.cancelOngoingAnimation_();
      this.playMove_(-1);
    };

    this.buttonLastMove_ = document.createElement("button");
    this.buttonLastMove_.textContent = "";
    this.buttonLastMove_.onclick = this.goToLastMove_.bind(this);

    const buttonsContainer = document.createElement("div");
    buttonsContainer.classList.add(CHESSGROUND_MOVE_BUTTONS_CLASS);
    buttonsContainer.appendChild(this.buttonFirstMove_);
    buttonsContainer.appendChild(this.buttonPreviousMove_);
    buttonsContainer.appendChild(this.buttonPlayMove_);
    buttonsContainer.appendChild(this.buttonNextMove_);
    buttonsContainer.appendChild(this.buttonLastMove_);

    movesContainer.appendChild(buttonsContainer);
    this.containerElement_.appendChild(movesContainer);
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
      turnColor: this.chess_.turn,
      check: this.chess_.isCheck(),
    };

    if (chessOptions.orientation) {
      config.orientation = chessOptions.orientation as Color;
    }

    this.boardApi_ = Chessground(this.chessElement_, config);
  }

  private initializeChess_() {
    // TODO: log errors?
    let initializedChess = false;
    try {
      if (this.initialPosition_) {
        this.chess_ = Chess.fromSetup(this.initialPosition_).unwrap(); // TODO: handle errors
        initializedChess = true;
      }
    } finally {
      if (!initializedChess) {
        this.initialPosition_ = defaultSetup();
        this.chess_ = Chess.default();
      }
    }
  }

  private updateMoveButtons_() {
    if (this.currentMove_ == 0) {
      this.buttonFirstMove_.disabled = true;
      this.buttonPreviousMove_.disabled = true;
    } else {
      this.buttonFirstMove_.disabled = false;
      this.buttonPreviousMove_.disabled = false;
    }

    if (this.currentMove_ >= this.sanMoves_.length) {
      this.buttonPlayMove_.disabled = true;
      this.buttonNextMove_.disabled = true;
      this.buttonLastMove_.disabled = true;
    } else {
      this.buttonPlayMove_.disabled = false;
      this.buttonNextMove_.disabled = false;
      this.buttonLastMove_.disabled = false;
    }
  }

  private updateBoardPosition_() {
    this.boardApi_.set({
      fen: makeFen(this.chess_.toSetup()),
      turnColor: this.chess_.turn,
      check: this.chess_.isCheck(),
    });
  }

  private cancelOngoingAnimation_() {
    if (this.currentNextMoveCallback_) {
      clearTimeout(this.currentNextMoveCallback_);
    }
    this.boardApi_.state.animation.current = undefined;
  }

  private goToFirstMove_() {
    this.cancelOngoingAnimation_();
    this.currentMove_ = 0;
    this.initializeChess_();
    this.updateBoardPosition_();
    this.updateMoveButtons_();
  }

  private goToLastMove_() {
    this.cancelOngoingAnimation_();
    for (; this.currentMove_ < this.sanMoves_.length; this.currentMove_++) {
      const move = parseSan(this.chess_, this.sanMoves_[this.currentMove_]);
      if (!move) {
        // TODO: log error
        break;
      }

      this.chess_.play(move);
    }

    this.updateBoardPosition_();
    this.updateMoveButtons_();
  }

  private playMove_(nextMoveDelay: number = -1) {
    this.currentNextMoveCallback_ = null;
    if (this.currentMove_ >= this.sanMoves_.length) {
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
      this.currentNextMoveCallback_ = setTimeout(
        this.playMove_.bind(this),
        this.boardApi_.state.animation.duration + nextMoveDelay,
        nextMoveDelay
      );
    }

    this.updateMoveButtons_();
  }
}

export function createChessGame(
  chessElement: HTMLElement,
  chessOptions: ChessBlockOptions,
  isPgn: boolean
) {
  new ChessGame(chessElement, chessOptions, isPgn);
}
