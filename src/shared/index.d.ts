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
}

declare type ChessgroundConfigGetter = () => ChessgroundConfig;

declare interface ChessBlockOptions {
  size: number | null;
  orientation: string | null;

  fen: string | null;
  arrows: string | null;
  squares: string | null;
  movable: boolean | null;
  drawable: boolean | null;
  lastMove: string | null;
}
