import { Chess, SQUARES } from "chess.js";
import type {Color, Key} from 'chessground/types';
import type { Api } from 'chessground/api';

export function getTurnColor(chess: Chess): Color {
  return (chess.turn() === 'w') ? 'white' : 'black';
}

export function getLegalMoves(chess: Chess): Map<Key, Key[]> {
  const legalMoves = new Map<Key, Key[]>();
  SQUARES.forEach(s => {
    const moves = chess.moves({square: s, verbose: true});
    if (moves.length > 0) {
      legalMoves.set(s, moves.map(m => m.to) as Key[]);
    }
  });
  return legalMoves;
}
