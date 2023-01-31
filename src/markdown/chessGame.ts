

class ChessGame {
  private chessElement_: HTMLElement;
  private containerElement_: HTMLElement;

  private initialFen_: string | null;
  private moves_: number[]; 
  
  constructor(chessElement: HTMLElement, chessOptions: ChessBlockOptions, isPgn: boolean) {
    this.chessElement_ = chessElement;
    this.containerElement_ = chessElement.parentElement!;

    this.initialFen_ = null;
    this.moves_ = [];

    if (isPgn) {
      this.parsePgnGame_();
    } else {
      this.parseFenWithMoves(chessOptions);
    }
    
  }

  private parsePgnGame_() {

  }

  private parseFenWithMoves(chessOptions: ChessBlockOptions) {
    
  }
}

export function createChessGame(
  chessElement: HTMLElement,
  chessOptions: ChessBlockOptions,
  isPgn: boolean
) {
  new ChessGame(chessElement, chessOptions, isPgn);
}