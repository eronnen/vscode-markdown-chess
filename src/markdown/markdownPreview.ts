import { renderAllChessBlocksInElement } from "./chessRenderer";

function initializeChessGroundInDocument() {
  renderAllChessBlocksInElement(document.body);
}

window.chessViewerContext = "markdown";

window.addEventListener(
  "vscode.markdown.updateContent",
  initializeChessGroundInDocument
);

initializeChessGroundInDocument();
