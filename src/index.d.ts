declare module "*.lazy.css" {
  const value: any;
  export default value;
}

declare const pieceSets: readonly ['alpha', 'cburnett', 'merida'];
declare type PieceSet = typeof pieceSets[number];