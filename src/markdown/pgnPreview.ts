import { renderAllChessBlocksInElement } from "./chessRenderer";

function getData<T = object>(key: string): T {
  const element = document.getElementById("pgn-file-viewer-data");
  if (element) {
    const data = element.getAttribute(key);
    if (data) {
      return JSON.parse(data);
    }
  }

  throw new Error(`Could not load data for ${key}`);
}

const vscode = acquireVsCodeApi();
const originalState = vscode.getState();
const state = {
  ...(typeof originalState === "object" ? originalState : {}),
  ...getData<PgnViewerState>("data-state"),
};

vscode.setState(state);

function initializeChessGroundInDocument() {
  renderAllChessBlocksInElement(document.body);
}

window.addEventListener(
  "vscode.chess-viewer.pgn.updateContent",
  initializeChessGroundInDocument
);

initializeChessGroundInDocument();
