"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const node_fetch_1 = require("node-fetch");
const svgo_1 = require("svgo");
const lilaBoardsDir = "https://raw.githubusercontent.com/lichess-org/lila/master/public/images/board/svg/";
const localBoardsDir = path.join('..', 'src', 'css', 'chessboard', 'assets', 'boards');
const availableSvgBoards = ["blue", "brown", "green", "ic", "purple"];
async function fetchAllBoards() {
    for (const boardName of availableSvgBoards) {
        const response = await (0, node_fetch_1.default)(`${lilaBoardsDir}${boardName}.svg`);
        const svgData = await response.text();
        const svgDataOptimized = (0, svgo_1.optimize)(svgData);
        fs.writeFile(path.join(localBoardsDir, `${boardName}.svg`), svgDataOptimized.data, 'utf-8', (err) => {
            if (err)
                console.error(`got errpr while writing board ${boardName}: ${err}`);
        });
    }
}
fetchAllBoards();
console.log('finished fetching boards');
//# sourceMappingURL=fetch-boards.js.map