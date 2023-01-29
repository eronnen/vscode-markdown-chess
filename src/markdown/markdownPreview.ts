import { renderAllChessBlocksInElement } from "./chessRenderer";

function initializeChessGroundInMarkdown() {
  renderAllChessBlocksInElement(document.body);
}

window.addEventListener(
  "vscode.markdown.updateContent",
  initializeChessGroundInMarkdown
);

initializeChessGroundInMarkdown();
