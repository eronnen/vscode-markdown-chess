import { renderAllChessBlocksInElement } from "./chessRenderer";

function initializeChessGroundInDocument() {
  renderAllChessBlocksInElement(document.body);
}

window.addEventListener(
  "vscode.markdown.updateContent",
  initializeChessGroundInDocument
);

initializeChessGroundInDocument();
