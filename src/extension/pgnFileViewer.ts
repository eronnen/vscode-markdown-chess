import { Game, PgnError } from "chessops/pgn";

import vscode from "vscode";
import { Utils } from "vscode-uri";
import { PgnNodeData, PgnParser } from "chessops/pgn";

import {
  CHESSGROUND_CONTAINER_CLASS,
  CHESSGROUND_CLASS,
  PGN_FILE_WEBVIEW_TYPE,
} from "../shared/constants";

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 64; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function escapeAttribute(value: string | vscode.Uri): string {
  return value.toString().replace(/"/g, "&quot;");
}

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
  return {
    // Enable javascript in the webview
    enableScripts: true,

    // And restrict the webview to only loading content from our extension's `media` directory.
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, "dist")],
  };
}

function isPgnDocument(document: vscode.TextDocument): boolean {
  return document.languageId === "pgn" || Utils.extname(document.uri) == "pgn";
}

class PgnFileViewer {
  public static currentPreview_: PgnFileViewer | undefined;

  private resource_: vscode.Uri;
  private disposables_: vscode.Disposable[] = [];
  private disposed_ = false;

  private games_: (Game<PgnNodeData> | PgnError)[] = [];
  private chessConfig_: ChessgroundConfig;

  private constructor(
    private context_: vscode.ExtensionContext,
    private chessConfigGetter_: ChessgroundConfigGetter,
    private webviewPanel_: vscode.WebviewPanel,
    resource: vscode.Uri
  ) {
    this.disposables_.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        // Only allow previewing normal text editors which have a viewColumn: See #101514
        if (typeof editor?.viewColumn === "undefined") {
          return;
        }

        if (
          isPgnDocument(editor.document) &&
          editor.document.uri.toString() !== this.resource_.toString()
        ) {
          this.updateResource_(editor.document.uri);
        }
      })
    );

    this.disposables_.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.uri.toString() === this.resource_.toString()) {
          this.updateContent_();
        }
      })
    );

    this.webviewPanel_.onDidDispose(
      () => this.dispose_(),
      null,
      this.disposables_
    );

    this.updateResource_(resource);
  }

  public static createOrShowPgnViewer(
    context: vscode.ExtensionContext,
    resource: vscode.Uri,
    previewColumn: vscode.ViewColumn,
    chessConfigGetter: ChessgroundConfigGetter
  ) {
    if (PgnFileViewer.currentPreview_) {
      if (
        resource.toString() ===
        PgnFileViewer.currentPreview_.resource_.toString()
      ) {
        PgnFileViewer.currentPreview_.webviewPanel_.reveal(previewColumn);
      } else {
        PgnFileViewer.currentPreview_.updateResource_(resource);
      }

      return;
    }

    const webviewPanel = vscode.window.createWebviewPanel(
      PGN_FILE_WEBVIEW_TYPE,
      "PGN Preview",
      previewColumn,
      getWebviewOptions(context.extensionUri)
    );

    PgnFileViewer.currentPreview_ = new PgnFileViewer(
      context,
      chessConfigGetter,
      webviewPanel,
      resource
    );
  }

  public static restorePgnViewer(
    context: vscode.ExtensionContext,
    chessConfigGetter: ChessgroundConfigGetter,
    webviewPanel: vscode.WebviewPanel,
    state: PgnViewerState
  ) {
    const resource = vscode.Uri.parse(state.resource);
    webviewPanel.webview.options = getWebviewOptions(context.extensionUri);

    PgnFileViewer.currentPreview_ = new PgnFileViewer(
      context,
      chessConfigGetter,
      webviewPanel,
      resource
    );
  }

  public static update() {
    if (PgnFileViewer.currentPreview_) {
      PgnFileViewer.currentPreview_.updateContent_();
    }
  }

  private dispose_() {
    this.disposed_ = true;

    this.webviewPanel_.dispose();
    while (this.disposables_.length) {
      const x = this.disposables_.pop();
      if (x) {
        x.dispose();
      }
    }

    PgnFileViewer.currentPreview_ = undefined;
  }

  private updateResource_(resource: vscode.Uri) {
    this.resource_ = resource;
    this.webviewPanel_.title = `PGN Preview: ${Utils.basename(this.resource_)}`;
    this.updateContent_();
  }

  private async updateContent_() {
    if (this.disposed_) {
      return;
    }

    await this.parsePgnFile_();

    if (this.disposed_) {
      return;
    }

    this.chessConfig_ = this.chessConfigGetter_();
    this.webviewPanel_.webview.html = this.getContentHTML_();
  }

  private getGameHTML_(game: Game<PgnNodeData> | PgnError) {
    if (game instanceof PgnError) {
      return `<h1 style="color: red">Error: ${game.message}</h1>`;
    }

    const moves: string[] = [];
    for (const node of game.moves.mainline()) {
      moves.push(node.san);
    }

    const headersHTML = `<p>
Event: ${game.headers.get("Event")}<br/>
${game.headers.get("Date")}<br/>
Round ${game.headers.get("Round")}<br/>
Result: ${game.headers.get("Result")}<br/>
</p>`;

    let chessBlockContent =
      moves.length > 0
        ? `moves: ${moves.join(" ")}`
        : `movable: false\ndrawable: false`;

    if (this.chessConfig_.mainPlayerName) {
      if (game.headers.get("Black") === this.chessConfig_.mainPlayerName) {
        chessBlockContent = "orientation: black\n" + chessBlockContent;
      }
    }

    return `<h2>${game.headers.get("White")} - ${game.headers.get("Black")}</h2>
${headersHTML}
<code><div class="${CHESSGROUND_CONTAINER_CLASS} ${
      this.chessConfig_.boardTheme
    } ${this.chessConfig_.pieceSet}" data-lang="chess" data-pieceset="${
      this.chessConfig_.pieceSet
    }" data-playback-speed="${
      this.chessConfig_.playbackSpeed
    }"><div class="${CHESSGROUND_CLASS}">
${chessBlockContent}
</div></div></code>`;
  }

  private getContentHTML_(): string {
    const nonce = getNonce();
    const gamesHtml = this.games_.map((g) => this.getGameHTML_(g)).join("\n");
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta id="pgn-file-viewer-data" data-state="${escapeAttribute(
      JSON.stringify({ resource: this.resource_.toString() })
    )}">
    <link rel="stylesheet" type="text/css" href="${this.extensionResourcePath_(
      "pgnPreview.css"
    )}" />
</head>
<body>
<h1>${Utils.basename(this.resource_)}</h1>
${gamesHtml}
<script async src="${this.extensionResourcePath_(
      "pgnPreview.bundle.js"
    )}" nonce="${nonce}" charset="UTF-8"></script>
</body>
</html>`;
  }

  private extensionResourcePath_(fileName: string): string {
    return this.webviewPanel_.webview
      .asWebviewUri(
        vscode.Uri.joinPath(this.context_.extensionUri, "dist", fileName)
      )
      .toString();
  }

  private async parsePgnFile_() {
    this.games_ = [];
    const document = await vscode.workspace.openTextDocument(this.resource_);
    new PgnParser((game, err) => {
      if (this.disposed_) {
        throw new Error("PgnFileViewer disposed");
      }

      if (err) {
        this.games_.push(err);
        return;
      }

      this.games_.push(game);
    }).parse(document.getText());
  }
}

export function createOrShowPgnPreview(
  context: vscode.ExtensionContext,
  chessConfigGetter: ChessgroundConfigGetter,
  sideBySide: boolean
) {
  const resource = vscode.window.activeTextEditor?.document.uri;
  if (!resource) {
    return;
  }

  if (!sideBySide) {
    return;
  }

  const resourceColumn =
    (vscode.window.activeTextEditor &&
      vscode.window.activeTextEditor.viewColumn) ||
    vscode.ViewColumn.One;
  const previewColumn = sideBySide ? vscode.ViewColumn.Beside : resourceColumn;

  PgnFileViewer.createOrShowPgnViewer(
    context,
    resource,
    previewColumn,
    chessConfigGetter
  );
}

export function restorePgnPreview(
  context: vscode.ExtensionContext,
  chessConfigGetter: ChessgroundConfigGetter,
  webviewPanel: vscode.WebviewPanel,
  state: PgnViewerState
) {
  PgnFileViewer.restorePgnViewer(
    context,
    chessConfigGetter,
    webviewPanel,
    state
  );
}

export function updateExistingPgnPreview() {
  PgnFileViewer.update();
}
