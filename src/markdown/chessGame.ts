import type { Api } from "chessground/api";
import type { Config } from "chessground/config";
import type { Color, PiecesDiff, Key } from "chessground/types";
import type { Move } from "chessops/types";
import type { Position } from "chessops/chess";

import { Chessground } from "chessground";
import { castlingSide, Chess } from "chessops/chess";
import { PgnParser, startingPosition } from "chessops/pgn";
import { makeFen, parseFen } from "chessops/fen";
import { parseSan } from "chessops/san";
import { isDrop, isNormal } from "chessops/types";
import {
  makeSquare,
  kingCastlesTo,
  rookCastlesTo,
  opposite,
} from "chessops/util";

import { parseSquaresString } from "./chessUtils";

import {
  CHESSGROUND_MOVES_CLASS,
  CHESSGROUND_MOVE_BUTTONS_CLASS,
} from "../shared/constants";

const ROOK_CASTLE_FROM = {
  white: { a: 0, h: 7 },
  black: { a: 56, h: 63 },
};

class ChessGame {
  private containerElement_: HTMLElement;

  private buttonFirstMove_: HTMLButtonElement;
  private buttonPreviousMove_: HTMLButtonElement;
  private buttonPlayMove_: HTMLButtonElement;
  private buttonNextMove_: HTMLButtonElement;
  private buttonLastMove_: HTMLButtonElement;

  private initialPosition_: Position;
  private initialLastMove_: Key[] | undefined = undefined;
  private sanMoves_: string[] = [];
  private currentMove_ = 0;
  private boardApi_: Api;
  private chess_: Position;

  private currentNextMoveCallback_: ReturnType<typeof setTimeout> | null;

  constructor(
    private chessElement_: HTMLElement,
    chessOptions: ChessBlockOptions,
    isPgn: boolean,
    private playbackSpeedMilliseconds_: number
  ) {
    this.containerElement_ = chessElement_.parentElement!;

    try {
      if (isPgn) {
        this.parsePgnGame_();
      } else {
        this.parseFenWithMoves_(chessOptions);
      }
    } finally {
      // TODO: show error
      if (!this.initialPosition_) {
        this.initialPosition_ = Chess.default();
      }
    }

    this.reinitializeChess_();
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

      this.initialPosition_ = startingPosition(game.headers).unwrap();
      for (const move of game.moves.mainline()) {
        this.sanMoves_.push(move.san);
      }
    }).parse(blockText.substring(pgnStart));
  }

  private parseFenWithMoves_(chessOptions: ChessBlockOptions) {
    this.initialPosition_ = chessOptions.fen
      ? Chess.fromSetup(parseFen(chessOptions.fen).unwrap()).unwrap()
      : Chess.default();
    if (chessOptions.moves) {
      this.sanMoves_ = chessOptions.moves.split(" ");
    }

    if (chessOptions.lastMove) {
      const lastMoveSquares = parseSquaresString(chessOptions.lastMove);
      if (lastMoveSquares.length >= 2) {
        this.initialLastMove_ = lastMoveSquares.slice(0, 2);
      }
    }
  }

  private createMovesElement_() {
    const movesContainer = document.createElement("div");
    movesContainer.classList.add(CHESSGROUND_MOVES_CLASS);

    this.buttonFirstMove_ = document.createElement("button");
    this.buttonFirstMove_.textContent = "";
    this.buttonFirstMove_.addEventListener(
      "click",
      this.goToFirstMove_.bind(this)
    );

    this.buttonPreviousMove_ = document.createElement("button");
    this.buttonPreviousMove_.textContent = "";
    this.buttonPreviousMove_.addEventListener(
      "click",
      this.playPreviousMove_.bind(this)
    );

    this.buttonPlayMove_ = document.createElement("button");
    this.buttonPlayMove_.textContent = "";
    this.buttonPlayMove_.addEventListener(
      "click",
      this.playNextMove_.bind(this, this.playbackSpeedMilliseconds_, true)
    );

    this.buttonNextMove_ = document.createElement("button");
    this.buttonNextMove_.textContent = "";
    this.buttonNextMove_.addEventListener(
      "click",
      this.playNextMove_.bind(this, -1, true)
    );

    this.buttonLastMove_ = document.createElement("button");
    this.buttonLastMove_.textContent = "";
    this.buttonLastMove_.addEventListener(
      "click",
      this.goToLastMove_.bind(this)
    );

    this.containerElement_.addEventListener(
      "keydown",
      (e) => {
        switch (e.key) {
          case "ArrowLeft":
            this.playPreviousMove_();
            e.preventDefault();
            break;
          case "ArrowRight":
            this.playNextMove_();
            e.preventDefault();
            break;
          case "ArrowUp":
          case "Home":
            this.goToFirstMove_();
            e.preventDefault();
            break;
          case "ArrowDown":
          case "End":
            this.goToLastMove_();
            e.preventDefault();
            break;
        }
      },
      true
    );

    this.containerElement_.addEventListener("click", () => {
      this.containerElement_.focus();
    });
    this.containerElement_.tabIndex = 0;

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
      fen: makeFen(this.initialPosition_.toSetup()),
      disableContextMenu: true,
      draggable: {
        enabled: false,
      },
      selectable: {
        enabled: false,
      },
      viewOnly: true,
    };

    if (chessOptions.orientation) {
      config.orientation = chessOptions.orientation as Color;
    }

    this.boardApi_ = Chessground(this.chessElement_, config);
    this.updateBoard_();
  }

  private reinitializeChess_() {
    this.chess_ = this.initialPosition_.clone();
  }

  private playMovesUntil_(untilMove: number) {
    let move: Move | undefined = undefined;
    for (; this.currentMove_ < untilMove; this.currentMove_++) {
      move = parseSan(this.chess_, this.sanMoves_[this.currentMove_]);
      if (!move) {
        // TODO: log error
        break;
      }

      this.chess_.play(move);
    }

    return move;
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

    if (!this.currentNextMoveCallback_) {
      this.buttonPlayMove_.textContent = "";
    }
  }

  private updateBoard_(
    updateFen = true,
    lastMove: Move | undefined = undefined
  ) {
    this.boardApi_.set({
      ...(updateFen ? { fen: makeFen(this.chess_.toSetup()) } : {}),
      ...(lastMove && isNormal(lastMove)
        ? { lastMove: [makeSquare(lastMove.from), makeSquare(lastMove.to)] }
        : this.currentMove_ == 0
        ? { lastMove: this.initialLastMove_ }
        : {}),
      turnColor: this.chess_.turn,
      check: this.chess_.isCheck(),
    });
  }

  private cancelOngoingAnimation_() {
    if (this.currentNextMoveCallback_) {
      clearTimeout(this.currentNextMoveCallback_);
      this.currentNextMoveCallback_ = null;
    }
    this.boardApi_.state.animation.current = undefined;
    this.buttonPlayMove_.textContent = "";
  }

  private goToFirstMove_() {
    this.cancelOngoingAnimation_();
    this.currentMove_ = 0;
    this.reinitializeChess_();
    this.updateBoard_();
    this.updateMoveButtons_();
  }

  private goToLastMove_() {
    this.cancelOngoingAnimation_();
    const lastMove = this.playMovesUntil_(this.sanMoves_.length);
    this.updateBoard_(true, lastMove);
    this.updateMoveButtons_();
  }

  private playNextMove_(nextMoveDelay = -1, isUiClick = false) {
    if (nextMoveDelay <= 0) {
      // play only one move, so cancel the current play
      this.cancelOngoingAnimation_();
    } else {
      if (isUiClick) {
        if (!this.currentNextMoveCallback_) {
          // Click while not playing - start
          this.buttonPlayMove_.textContent = ""; // pause symbol
        } else {
          // Click while playing - stop
          this.cancelOngoingAnimation_();
          this.updateMoveButtons_();
          return;
        }
      }
    }

    this.currentNextMoveCallback_ = null;
    const move = parseSan(this.chess_, this.sanMoves_[this.currentMove_]);
    if (!move) {
      this.updateMoveButtons_();
      return;
    }

    this.currentMove_++;
    this.playMove_(move);

    if (nextMoveDelay >= 0 && this.currentMove_ < this.sanMoves_.length) {
      this.currentNextMoveCallback_ = setTimeout(
        this.playNextMove_.bind(this),
        this.boardApi_.state.animation.duration + nextMoveDelay,
        nextMoveDelay
      );
    }

    this.updateMoveButtons_();
  }

  private playMove_(move: Move) {
    if (isNormal(move)) {
      if (move.promotion) {
        this.boardApi_.setPieces(
          new Map([
            [
              makeSquare(move.to),
              {
                color: this.chess_.turn,
                role: move.promotion!,
                promoted: true,
              },
            ],
            [makeSquare(move.from), undefined],
          ])
        );
      } else if (
        move.to == this.chess_.epSquare &&
        this.chess_.board.get(move.from)?.role === "pawn"
      ) {
        // en passant
        this.boardApi_.setPieces(
          new Map([
            [makeSquare(move.from), undefined],
            [
              makeSquare(move.to),
              {
                color: this.chess_.turn,
                role: "pawn",
              },
            ],
            [
              makeSquare(move.to + (this.chess_.turn === "white" ? -8 : 8)),
              undefined,
            ],
          ])
        );
      } else {
        this.boardApi_.move(makeSquare(move.from), makeSquare(move.to));
      }
    } else {
      // drop move
      this.boardApi_.newPiece(
        {
          role: move.role,
          color: this.chess_.turn,
        },
        makeSquare(move.to)
      );
    }

    this.chess_.play(move);
    this.updateBoard_(false);
  }

  private playPreviousMove_() {
    this.cancelOngoingAnimation_();
    if (this.currentMove_ == 0) {
      return;
    }

    const currentMoveTemp = this.currentMove_ - 1;
    this.currentMove_ = 0;
    this.reinitializeChess_();
    const lastMove = this.playMovesUntil_(currentMoveTemp);

    const move = parseSan(this.chess_, this.sanMoves_[this.currentMove_]);
    if (!move) {
      // TODO: log error
      return;
    }

    if (isDrop(move)) {
      this.boardApi_.setPieces(new Map([[makeSquare(move.to), undefined]]));
    } else {
      const pieceMovements: PiecesDiff = new Map();

      if (move.promotion) {
        pieceMovements.set(makeSquare(move.from), {
          color: this.chess_.turn,
          role: "pawn",
        });
        pieceMovements.set(makeSquare(move.to), this.chess_.board.get(move.to));
      } else if (
        this.chess_.board.get(move.from)?.role === "king" &&
        castlingSide(this.chess_, move)
      ) {
        const castling = castlingSide(this.chess_, move);
        pieceMovements.set(
          makeSquare(kingCastlesTo(this.chess_.turn, castling!)),
          undefined
        );
        pieceMovements.set(makeSquare(move.from), {
          color: this.chess_.turn,
          role: "king",
        });

        pieceMovements.set(
          makeSquare(rookCastlesTo(this.chess_.turn, castling!)),
          undefined
        );
        pieceMovements.set(
          makeSquare(ROOK_CASTLE_FROM[this.chess_.turn][castling!]),
          {
            color: this.chess_.turn,
            role: "rook",
          }
        );
      } else if (
        this.chess_.epSquare == move.to &&
        this.chess_.board.get(move.from)?.role === "pawn"
      ) {
        pieceMovements.set(makeSquare(move.to), undefined);
        pieceMovements.set(makeSquare(move.from), {
          color: this.chess_.turn,
          role: "pawn",
        });
        pieceMovements.set(
          makeSquare(move.to + (this.chess_.turn === "white" ? -8 : 8)),
          {
            color: opposite(this.chess_.turn),
            role: "pawn",
          }
        );
      } else {
        // regular move/capture
        pieceMovements.set(
          makeSquare(move.from),
          this.chess_.board.get(move.from)
        );
        pieceMovements.set(makeSquare(move.to), this.chess_.board.get(move.to));
      }

      // TODO: restore pieces for atomic chess?
      this.boardApi_.setPieces(pieceMovements);
    }

    this.updateBoard_(false, lastMove);
    this.updateMoveButtons_();
  }
}

export function createChessGame(
  chessElement: HTMLElement,
  chessOptions: ChessBlockOptions,
  isPgn: boolean,
  playbackSpeedMilliseconds: number
) {
  new ChessGame(chessElement, chessOptions, isPgn, playbackSpeedMilliseconds);
}
