import { renderAllChessBlocksInElement } from "./chessgroundRenderer";

function initializeChessGroundInMarkdown() {
  renderAllChessBlocksInElement(document.body);
}

window.addEventListener(
  "vscode.markdown.updateContent",
  initializeChessGroundInMarkdown
);

initializeChessGroundInMarkdown();
