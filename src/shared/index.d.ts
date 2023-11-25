declare module "markdown-it-testgen";
declare module "*.lazy.css" {
  const value: any;
  export default value;
}

declare const pieceSets: readonly ["alpha", "cburnett", "merida"];
declare type PieceSet = (typeof pieceSets)[number];

declare interface StyleLoaderImport {
  use: Function;
  unuse: Function;
}

declare interface ChessgroundConfig {
  boardTheme: string;
  pieceSet: string;
  playbackSpeed: number;
  mainPlayerName?: string;
}

declare type ChessgroundConfigGetter = () => ChessgroundConfig;

declare interface ChessBlockOptions {
  size: number | undefined;
  orientation: string | undefined;

  fen: string | undefined;
  arrows: string | undefined;
  squares: string | undefined;
  movable: boolean | undefined;
  drawable: boolean | undefined;
  lastMove: string | undefined;

  moves: string | undefined;
  initialMove: number | undefined;
  variant: string | undefined;
}

declare interface PgnViewerState {
  resource: string;
  resourceColumn: vscode.ViewColumn;
}
