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

class PgnFileViewer {
  public static openViewers: Set<PgnFileViewer> = new Set<PgnFileViewer>();

  private resource_: vscode.Uri;
  private webviewPanel_: vscode.WebviewPanel;

  private _disposables: vscode.Disposable[] = [];
  private disposed_: boolean = false;

  private games_: (Game<PgnNodeData> | PgnError)[] = [];
  private chessConfig_: ChessgroundConfig;

  private constructor(
    private context_: vscode.ExtensionContext,
    private chessConfigGetter_: ChessgroundConfigGetter
  ) {}

  public static createNewPgnViewer(
    context: vscode.ExtensionContext,
    resource: vscode.Uri,
    previewColumn: vscode.ViewColumn,
    chessConfigGetter: ChessgroundConfigGetter
  ): PgnFileViewer {
    const viewer = new PgnFileViewer(context, chessConfigGetter);
    viewer.resource_ = resource;
    viewer.webviewPanel_ = vscode.window.createWebviewPanel(
      PGN_FILE_WEBVIEW_TYPE,
      `PGN Preview: ${Utils.basename(viewer.resource_)}`,
      previewColumn,
      getWebviewOptions(viewer.context_.extensionUri)
    );

    viewer.initialize_();
    return viewer;
  }

  public static restorePgnViewer(
    context: vscode.ExtensionContext,
    chessConfigGetter: ChessgroundConfigGetter,
    webviewPanel: vscode.WebviewPanel,
    state: any
  ): PgnFileViewer {
    const viewer = new PgnFileViewer(context, chessConfigGetter);
    viewer.webviewPanel_ = webviewPanel;
    viewer.resource_ = vscode.Uri.parse(state.resource);
    viewer.webviewPanel_.webview.options = getWebviewOptions(
      context.extensionUri
    );

    viewer.initialize_();
    return viewer;
  }

  public dispose() {
    this.disposed_ = true;
    PgnFileViewer.openViewers.delete(this);

    this.webviewPanel_.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private initialize_() {
    PgnFileViewer.openViewers.add(this);
    this.webviewPanel_.onDidDispose(
      () => this.dispose(),
      null,
      this._disposables
    );

    this.updateContent_();
  }

  private async updateContent_() {
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

    return `<h2>${game.headers.get("White")} - ${game.headers.get("Black")}</h2>
${headersHTML}
<code><div class="${CHESSGROUND_CONTAINER_CLASS} ${
      this.chessConfig_.boardTheme
    } ${this.chessConfig_.pieceSet}" data-lang="chess" data-pieceset="${
      this.chessConfig_.pieceSet
    }" data-playback-speed="${
      this.chessConfig_.playbackSpeed
    }"><div class="${CHESSGROUND_CLASS}">
moves: ${moves.join(" ")}
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

export function createNewPgnPreview(
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

  return PgnFileViewer.createNewPgnViewer(
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
  state: any
) {
  return PgnFileViewer.restorePgnViewer(
    context,
    chessConfigGetter,
    webviewPanel,
    state
  );
}

// export function closeAllPgnPreviews() {
//     const currentlyOpenViewers = PgnFileViewer.openViewers.values();
//     for (const viewer of currentlyOpenViewers) {
//         viewer.dispose();
//     }
// }
