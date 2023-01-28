import type MarkdownIt from "markdown-it";
import vscode from "vscode";
import { markdownItChessgroundPlugin } from "./markdownItChessgroundPlugin";

const configSection = "markdown-chess";
const openSettingsCommand = `${configSection}.openSettings`;

const validBoardThemes = ["brown", "blue", "green", "ic", "purple"];
const validPieceSets = ["cburnett", "alpha", "merida"];
const validBrushed = ["green", "red", "blue", "yellow"]; // TODO: use chessground type when available in next version

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

function sanitizeBrushColor(color: string | undefined) {
  return typeof color === "string" && validBrushed.includes(color)
    ? color
    : validBrushed[0]; 
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(openSettingsCommand, () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        configSection
      );
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
      const configGetter: ChessgroundConfigGetter = () => {
        const boardTheme = sanitizeBoardTheme(
          vscode.workspace.getConfiguration(configSection).get("boardTheme")
        );
        const pieceSet = sanitizePieceSet(
          vscode.workspace.getConfiguration(configSection).get("pieceSet")
        );
        const arrowsBrushColor = sanitizeBrushColor(
          vscode.workspace.getConfiguration(configSection).get("arrowsBrushColor")
        );
        const squaresBrushColor = sanitizeBrushColor(
          vscode.workspace.getConfiguration(configSection).get("squaresBrushColor")
        );

        return {
          boardTheme: boardTheme,
          pieceSet: pieceSet,
          arrowsBrushColor: arrowsBrushColor,
          squaresBrushColor: squaresBrushColor
        };
      };

      return md.use(markdownItChessgroundPlugin, configGetter);
    },
  };
}

// This method is called when your extension is deactivated
// export function deactivate() {}
