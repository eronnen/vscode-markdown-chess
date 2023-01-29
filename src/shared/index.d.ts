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
