import { Chessground } from "chessground";
import { colors} from "chessground/types";
import type { Config } from "chessground/config";
import type {Color, Key} from 'chessground/types';
import type { DrawShape } from "chessground/draw";

import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";

const chessgroundClass = 'chessground-markdown';
const configDefaultArrowColor = 'green';
const configDefaultSquareColor = 'blue';

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
        result.push((currentFile + char) as Key);
        currentFile = null;
      }
    }
  }

  return result;
}

function parseChessBlock(element: HTMLElement, config: Config) : DrawShape[] {
  const shapes : DrawShape[] = [];

  // I think yaml library here is an overkill
  for (const line of element.innerHTML.split('\n')) {
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
        config.drawable!.enabled = true;
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
        config.drawable!.enabled = true;
        const squares = parseSquares(value);
        for (const square of squares) {
          shapes.push({
            orig: square,
            brush: configDefaultSquareColor
          });
        }
      }
      case "moveable":
        if (value.toLowerCase() === "true") {
          config.draggable!.enabled = true;
          config.selectable!.enabled = true;
        }
        break;
      case "drawable":
        if (value.toLowerCase() === "true") {
          config.drawable!.enabled = true;
        }
        break;
    }
  }

  return shapes;
}

function renderChessgroundBlock(element: HTMLElement) {
  element.style.width = "50%";
  element.style.aspectRatio = "1/1";

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
      shapes: []
    }
  };
  
  const shapes = parseChessBlock(element, config);
  const boardApi = Chessground(element, config);

  if (shapes.length > 0) {
    boardApi.setShapes(shapes);
  }

  if (!config.drawable!.enabled && !config.selectable!.enabled && !config.draggable!.enabled) {
    boardApi.state.dom.elements.board.style.cursor = "default";
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