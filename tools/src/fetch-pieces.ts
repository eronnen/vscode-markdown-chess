import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

const lilaPiecesDir = "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece-css/";
const localPiecesDir = path.join('..', 'src', 'css', 'chessboard', 'assets', 'pieces');
const availablePiecesSets = ["cburnett", "merida", "alpha"];

async function fetchAllBoards() {
  for (const pieceSetName of availablePiecesSets) {
    const response = await fetch(`${lilaPiecesDir}${pieceSetName}.css`);
    const pieceCssData = await response.text();
    fs.writeFile(path.join(localPiecesDir, `${pieceSetName}.css`), pieceCssData, 'utf-8', (err) => {
      if (err) console.error(`got error while writing board ${pieceSetName}: ${err}`);
    });
  }
}

fetchAllBoards();
console.log('finished fetching pieces');
