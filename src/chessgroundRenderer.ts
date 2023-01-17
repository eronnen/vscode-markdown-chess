import { Chessground } from "chessground";
import { colors} from "chessground/types";
import type { Config } from "chessground/config";
import type {Color, Key} from 'chessground/types';
import type { DrawShape } from "chessground/draw";
import type { Api } from "chessground/api";

import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";

const chessgroundClass = 'chessground-markdown';
const configDefaultArrowColor = 'green';
const configDefaultSquareColor = 'blue';
const configMaxBoardSize = 80;
const configMinBoardSize = 20;

function parseBoolean(value: string) : boolean | null {
  if (value.toLowerCase() === "true") {
    return true;
  }
  else if  (value.toLowerCase() === "false") {
    return false;
  }

  return null;
}

function parseSquares(line: string) : Key[] {
  const result : Key[] = [];

  let currentFile : string | null = null;
  for (const char of line) {
    if (currentFile === null) {
      if (char.toLowerCase() >= 'a' && char.toLowerCase() <= 'h') {
        currentFile = char.toLowerCase();
      }
    }
    else {
      if (char >= '1' && char <= '8') {
        result.push(`${currentFile}${char}` as Key);
        currentFile = null;
      }
    }
  }

  return result;
}

function renderChessgroundBlock(chessElement: HTMLElement) {
  chessElement.style.width = "50%";
  chessElement.style.aspectRatio = "1/1";

  const config : Config = {
    disableContextMenu: true,
    draggable: {
      enabled: false
    },
    selectable: {
      enabled: false
    },
    drawable: {
      enabled: false,
    }
  };

  const shapes : DrawShape[] = [];
  let movable : boolean | null = null;
  let drawable : boolean | null = null;

  // I think yaml library here is an overkill
  for (const line of (chessElement.textContent || '').split('\n')) {
    const delimeterPosition = line.indexOf(':');
    if (-1 === delimeterPosition) {
      // ignore invalid lines
      continue;
    }

    const option = line.substring(0, delimeterPosition);
    const value = line.substring(delimeterPosition + 1).trim();

    switch (option.toLowerCase()) {
      case "fen":
        config.fen = value;
        break;
      case "orientation":
        if (colors.includes(value as Color)) {
          config.orientation = value as Color;
        }
        break;
      case "lastmove": {
        const lastMoveSquares = parseSquares(value);
        if (lastMoveSquares.length >= 2) {
          config.lastMove = lastMoveSquares.slice(0, 2);
        }
        break;
      }
      case "arrows": {
        const arrowSquares = parseSquares(value);
        for (let i = 0; i < arrowSquares.length - 1; i += 2) {
          shapes.push({
            orig: arrowSquares[i],
            dest: arrowSquares[i+1],
            brush: configDefaultArrowColor
          });
        }
        break;
      }
      case "squares": {
        const squares = parseSquares(value);
        for (const square of squares) {
          shapes.push({
            orig: square,
            brush: configDefaultSquareColor
          });
        }
      }
      case "movable":
        movable = parseBoolean(value);
        break;
      case "drawable":
        drawable = parseBoolean(value);
        break;
      case "size":
        if (value.match(/^\d+/g)) {
          const boardSize = Math.max(configMinBoardSize, Math.min(configMaxBoardSize, parseFloat(value)));
          chessElement.style.width = boardSize.toString() + '%';
        }
        break;
    }
  }
  
  // movable if specified and if not then only if no fen supplied
  movable = (movable === true) || (!config.fen && movable !== false);

  // drawable if specified and if not then only if no drawing supplied
  drawable = (drawable === true) || (shapes.length === 0 && drawable !== false);

  if (movable) {
    config.draggable!.enabled = true;
    config.selectable!.enabled = true;
  }

  if (drawable) {
    config.drawable!.enabled = true;
  }

  let boardApi: Api | null = null;

  if (movable || drawable) {
    // track moves/shapes that the user does and show them in a right column to the board.
    const infoElement = document.createElement('p');
    infoElement.style.width = (95 - parseFloat(chessElement.style.width)).toString() + "%";
    infoElement.style.paddingLeft = '5%';
    infoElement.style.float = 'left';
    infoElement.style.fontSize = '0.8em';
    chessElement.style.float = 'left';
    chessElement.parentElement!.style.display = 'flex';
    chessElement.parentElement!.style.flexDirection = 'row';
    chessElement.parentElement!.appendChild(infoElement); // we add empty parent div in the markdown parser

    const updateInfoElementCallback = function(shapes: DrawShape[]) {
      let infoText = '';
      if (movable && boardApi) {
        infoText += `fen: ${boardApi.getFen()}<br>`;
      }
      if (drawable && shapes.length > 0) {
        let arrows = '';
        let squares = '';
        for (const shape of shapes) {
          if (shape.orig && shape.dest) {
            arrows += `${shape.orig}->${shape.dest} `;
          }
          else {
            squares += `${shape.orig} `;
          }
        }

        if (arrows) {
          infoText += `arrows: ${arrows.trim()}<br>`;
        }
        if (squares) {
          infoText += `squares: ${squares.trim()}`;
        }
      }
      infoElement.innerHTML = infoText.trim();
    };

    if (movable) {
      config.events = {
        change: function() {updateInfoElementCallback([]);}
      };
    }
    if (drawable) {
      config.drawable!.onChange = updateInfoElementCallback;
    }
  }

  boardApi = Chessground(chessElement, config);

  // if it's readonly board it makes more sense to have it with regular cursor.
  if (!movable && !drawable) {
    // TODO: find non internal way to change it
    boardApi.state.dom.elements.board.style.cursor = "default";
  }

  // for some reason giving shapes in config doesn't work when configured a fen too
  if (shapes.length > 0) {
    boardApi.setShapes(shapes);
  } 
}

export function renderAllChessBlocksInElement(root: HTMLElement) {
  for (const chessgroundContainer of root.getElementsByClassName(chessgroundClass)) {
    if (chessgroundContainer instanceof HTMLElement) {
      renderChessgroundBlock(chessgroundContainer);
    }
    else {
      console.error('Non-HTML chessground object');
    }
  }
}