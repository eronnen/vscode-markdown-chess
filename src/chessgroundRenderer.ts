import { Chessground } from "chessground";
import type { Config } from "chessground/config";
import {Color, colors} from 'chessground/types';

import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";

const chessgroundClass = 'chessground-markdown';

function parseChessBlock(element: HTMLElement, config: Config) {
  // I think yaml library here is an overkill
  for (const line of element.innerHTML.split('\n')) {
    const delimeterPosition = line.indexOf(':');
    if (-1 === delimeterPosition) {
      // ignore invalid lines
      continue;
    }

    const option = line.substring(0, delimeterPosition);
    const value = line.substring(delimeterPosition + 1).trim();

    switch (option.toLocaleLowerCase()) {
      case "fen":
        config.fen = value;
        break;
      case "orientation":
        if (colors.includes(value as Color)) {
          config.orientation = value as Color;
        }
        break;
      case "moveable":
        if (value.toLocaleLowerCase() === "true") {
          config.draggable!.enabled = true;
          config.selectable!.enabled = true;
        }
        break;
    }
  }
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
    }
  };
  
  parseChessBlock(element, config);
  Chessground(element, config);
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