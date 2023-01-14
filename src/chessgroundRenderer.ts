import { Chessground } from "chessground";
import type { Config } from "chessground/config";

import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";

const chessgroundClass = 'chessground-markdown';

function renderChessgroundBlock(element: HTMLElement) {
  element.style.width = "50%";
  element.style.aspectRatio = "1/1";
  const config : Config = {
    // viewOnly: true,
    disableContextMenu: true,
    draggable: {
      enabled: false
    },
    selectable: {
      enabled: false
    }
  };
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