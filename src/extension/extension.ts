import type MarkdownIt from "markdown-it";

import vscode from "vscode";
import { markdownItChessgroundPlugin } from "./markdownItChessgroundPlugin";
import { showPgnPreview } from "./pgnFileViewer";
import { DEFAULT_MOVE_DELAY_MILLISECONDS } from "../shared/constants";

const configSection = "chess-viewer";
const openSettingsCommand = `${configSection}.openSettings`;
const openPgnPreviewCommand = `${configSection}.showPreviewToSide`;

const validBoardThemes = ["brown", "blue", "green", "ic", "purple"];
const validPieceSets = ["cburnett", "alpha", "merida"];

function sanitizeBoardTheme(theme: string | undefined) {
  return typeof theme === "string" && validBoardThemes.includes(theme)
    ? theme
    : validBoardThemes[0];
}

function sanitizePieceSet(theme: string | undefined) {
  return typeof theme === "string" && validPieceSets.includes(theme)
    ? theme
    : validPieceSets[0];
}

const extensionConfigGetter: ChessgroundConfigGetter = () => {
  const boardTheme = sanitizeBoardTheme(
    vscode.workspace.getConfiguration(configSection).get("boardTheme")
  );
  const pieceSet = sanitizePieceSet(
    vscode.workspace.getConfiguration(configSection).get("pieceSet")
  );
  const playbackSpeed: number =
    vscode.workspace
      .getConfiguration(configSection)
      .get("playbackSpeed") || DEFAULT_MOVE_DELAY_MILLISECONDS;
  return {
    boardTheme: boardTheme,
    pieceSet: pieceSet,
    playbackSpeed: playbackSpeed,
  };
}

export function activate(context: vscode.ExtensionContext) {
  console.warn("FUCK0: chess activate");
  context.subscriptions.push(
    vscode.commands.registerCommand(openSettingsCommand, () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        configSection
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(openPgnPreviewCommand, () => {
      console.warn("FUCK1: open PGN preview to the side");
      showPgnPreview(context, true, extensionConfigGetter);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(configSection)) {
        vscode.commands.executeCommand("markdown.preview.refresh");
      }
    })
  );

  return {
    extendMarkdownIt(md: MarkdownIt) {
      return md.use(markdownItChessgroundPlugin, extensionConfigGetter);
    },
  };
}

// This method is called when your extension is deactivated
// export function deactivate() {
//   console.warn("FUCK3: deactivate()");
//   closeAllPgnPreviews();
// }
