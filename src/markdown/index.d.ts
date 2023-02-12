declare type ChessViewerContext = "markdown" | "pgn";

interface Window {
  chessViewerContext: ChessViewerContext;
}
