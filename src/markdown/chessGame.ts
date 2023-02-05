import type { Api } from "chessground/api";
import type { Config } from "chessground/config";
import type { Color, PiecesDiff } from "chessground/types";
import type { Setup } from "chessops/setup";
import type { Move } from "chessops/types";

import { Chessground } from "chessground";
import { castlingSide, Chess } from "chessops/chess";
import { PgnParser, startingPosition } from "chessops/pgn";
import { makeFen } from "chessops/fen";
import { parseSan } from "chessops/san";
import { defaultSetup } from "chessops/setup";
import { isDrop, isNormal } from "chessops/types";
import {
  makeSquare,
  kingCastlesTo,
  rookCastlesTo,
  opposite,
} from "chessops/util";

import {
  DEFAULT_MOVE_DELAY_MILLISECONDS,
  CHESSGROUND_MOVES_CLASS,
  CHESSGROUND_MOVE_BUTTONS_CLASS,
} from "../shared/constants";

function log(s: string) {
  const logElement = document.createElement("p");
  logElement.textContent = s;
  document.body.appendChild(logElement);
  return;
}

const ROOK_CASTLE_FROM = {
  white: { a: 0, h: 7 },
  black: { a: 56, h: 63 },
};

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
    this.buttonPreviousMove_.onclick = this.playPreviousMove_.bind(this);

    this.buttonPlayMove_ = document.createElement("button");
    this.buttonPlayMove_.textContent = "";
    this.buttonPlayMove_.onclick = this.playNextMove_.bind(
      this,
      DEFAULT_MOVE_DELAY_MILLISECONDS
    );

    this.buttonNextMove_ = document.createElement("button");
    this.buttonNextMove_.textContent = "";
    this.buttonNextMove_.onclick = () => {
      this.cancelOngoingAnimation_();
      this.playNextMove_(-1);
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
    };

    if (chessOptions.orientation) {
      config.orientation = chessOptions.orientation as Color;
    }

    this.boardApi_ = Chessground(this.chessElement_, config);
    this.updateBoard_();
  }

  private reinitializeChess_() {
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
  }

  private updateBoard_(
    updateFen: boolean = true,
    lastMove: Move | undefined = undefined
  ) {
    this.boardApi_.set({
      ...(updateFen ? { fen: makeFen(this.chess_.toSetup()) } : {}),
      ...(lastMove && isNormal(lastMove)
        ? { lastMove: [makeSquare(lastMove.from), makeSquare(lastMove.to)] }
        : this.currentMove_ == 0
        ? { lastMove: undefined }
        : {}),
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

  private playNextMove_(nextMoveDelay: number = -1) {
    this.currentNextMoveCallback_ = null;
    if (this.currentMove_ >= this.sanMoves_.length) {
      return;
    }

    const move = parseSan(this.chess_, this.sanMoves_[this.currentMove_]);
    this.currentMove_++;
    if (!move) {
      return;
    }

    this.playMove_(move);

    if (nextMoveDelay >= 0) {
      this.currentNextMoveCallback_ = setTimeout(
        this.playNextMove_.bind(this),
        this.boardApi_.state.animation.duration + nextMoveDelay,
        nextMoveDelay
      );
    }

    this.updateMoveButtons_();
  }

  private playMove_(move: Move) {
    // TODO: catch errors
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
            [
              makeSquare(move.from),
              undefined
            ]
          ])
        );
      } else if (move.to == this.chess_.epSquare && this.chess_.board.get(move.from)?.role === 'pawn') {
        // en passant
        this.boardApi_.setPieces(
          new Map([
            [
              makeSquare(move.from),
              undefined
            ],
            [
              makeSquare(move.to),
              {
                color: this.chess_.turn,
                role: 'pawn'
              }
            ],
            [
              makeSquare(move.to + (this.chess_.turn === 'white' ? -8 : 8)),
              undefined
            ]
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
      this.boardApi_.setPieces(
        new Map([[makeSquare(move.to), undefined]])
      );
    } else {
      const pieceMovements: PiecesDiff = new Map();

      if (move.promotion) {
        pieceMovements.set(makeSquare(move.from), {
          color: this.chess_.turn,
          role: "pawn",
        });
        pieceMovements.set(
          makeSquare(move.to),
          this.chess_.board.get(move.to)
        );
      } else if (
        this.chess_.board.get(move.from)?.role === "king" && castlingSide(this.chess_, move)
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
      } else if (this.chess_.epSquare == move.to && this.chess_.board.get(move.from)?.role === "pawn") {
        pieceMovements.set(makeSquare(move.to), undefined);
        pieceMovements.set(makeSquare(move.from), {
          color: this.chess_.turn,
          role: "pawn"
        });
        pieceMovements.set(makeSquare(move.to + (this.chess_.turn === "white" ? -8 : 8)), {
          color: opposite(this.chess_.turn),
          role: "pawn"
        })
      } else {
        // regular move/capture
        pieceMovements.set(
          makeSquare(move.from),
          this.chess_.board.get(move.from)
        );
        pieceMovements.set(
          makeSquare(move.to),
          this.chess_.board.get(move.to)
        );
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
  isPgn: boolean
) {
  new ChessGame(chessElement, chessOptions, isPgn);
}
