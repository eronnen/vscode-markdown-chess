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

abstract class Disposable {
  protected disposables_: vscode.Disposable[] = [];
  protected isDisposed_ = false;

  public dispose() {
    if (this.isDisposed_) {
      return;
    }

    this.isDisposed_ = true;
    while (this.disposables_.length) {
      const x = this.disposables_.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}

class PgnViewerRenderer extends Disposable {
  private games_: (Game<PgnNodeData> | PgnError)[] = [];
  private chessConfig_: ChessgroundConfig;

  constructor(
    private readonly context_: vscode.ExtensionContext,
    private readonly chessConfigGetter_: ChessgroundConfigGetter,
    private readonly webviewPanel_: vscode.WebviewPanel,
    private resource_: vscode.Uri,
    private state_: unknown = {}
  ) {
    super();

    this.disposables_.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.uri.toString() === this.resource_.toString()) {
          this.updateContent_();
        }
      })
    );
  }

  public update(resource: vscode.Uri | undefined = undefined) {
    if (resource) {
      this.resource_ = resource;
    }

    this.updateContent_();
  }

  public setState(state: unknown) {
    this.state_ = state;
  }

  private async updateContent_() {
    if (this.isDisposed_) {
      return;
    }

    await this.parsePgnFile_();

    if (this.isDisposed_) {
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

    if (game.headers.get("Variant")) {
      chessBlockContent =
        `variant: ${game.headers.get("Variant")}\n` + chessBlockContent;
    }

    if (game.headers.get("FEN")) {
      chessBlockContent =
        `fen: ${game.headers.get("FEN")}\n` + chessBlockContent;
    }

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
      JSON.stringify(this.state_)
    )}">
    <link rel="stylesheet" type="text/css" href="${this.extensionResourcePath_(
      "pgnPreview.css"
    )}" />
</head>
<body style="text-align: center; margin-left: auto; margin-right: auto;">
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
      if (this.isDisposed_) {
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

interface PgnPreview {
  dispose(): void;
  update(): void;
  showSource(): void;
}

class PgnFilePreview extends Disposable implements PgnPreview {
  public static current: PgnFilePreview | undefined;

  private renderer_: PgnViewerRenderer;

  private constructor(
    context: vscode.ExtensionContext,
    chessConfigGetter: ChessgroundConfigGetter,
    private readonly webviewPanel_: vscode.WebviewPanel,
    private resource_: vscode.Uri,
    private readonly resourceColumn_: vscode.ViewColumn
  ) {
    super();

    this.renderer_ = new PgnViewerRenderer(
      context,
      chessConfigGetter,
      webviewPanel_,
      resource_,
      this.getStateObject_()
    );
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

    this.webviewPanel_.onDidDispose(
      () => this.dispose(),
      null,
      this.disposables_
    );

    this.updateResource_(resource_);
  }

  public static createOrShowPgnViewer(
    context: vscode.ExtensionContext,
    resource: vscode.Uri,
    resourceColumn: vscode.ViewColumn,
    previewColumn: vscode.ViewColumn,
    chessConfigGetter: ChessgroundConfigGetter
  ) {
    if (PgnFilePreview.current) {
      if (resource.toString() === PgnFilePreview.current.resource_.toString()) {
        PgnFilePreview.current.webviewPanel_.reveal(previewColumn);
      } else {
        PgnFilePreview.current.updateResource_(resource);
      }

      return;
    }

    const webviewPanel = vscode.window.createWebviewPanel(
      PGN_FILE_WEBVIEW_TYPE,
      "PGN Preview",
      previewColumn,
      getWebviewOptions(context.extensionUri)
    );

    PgnFilePreview.current = new PgnFilePreview(
      context,
      chessConfigGetter,
      webviewPanel,
      resource,
      resourceColumn
    );
  }

  public static restorePgnViewer(
    context: vscode.ExtensionContext,
    chessConfigGetter: ChessgroundConfigGetter,
    webviewPanel: vscode.WebviewPanel,
    state: PgnViewerState
  ) {
    const resource = vscode.Uri.parse(state.resource);
    const resourceColumn = state.resourceColumn;
    webviewPanel.webview.options = getWebviewOptions(context.extensionUri);

    PgnFilePreview.current = new PgnFilePreview(
      context,
      chessConfigGetter,
      webviewPanel,
      resource,
      resourceColumn
    );
  }

  public update() {
    this.renderer_.update();
  }

  public override dispose() {
    super.dispose();
    this.renderer_.dispose();
    this.webviewPanel_.dispose();
    PgnFilePreview.current = undefined;
  }

  public showSource() {
    vscode.workspace.openTextDocument(this.resource_).then((document) => {
      vscode.window.showTextDocument(document, this.resourceColumn_);
    });
  }

  private updateResource_(resource: vscode.Uri) {
    this.resource_ = resource;
    this.webviewPanel_.title = `PGN Preview: ${Utils.basename(this.resource_)}`;
    this.renderer_.setState(this.getStateObject_());
    this.renderer_.update(resource);
  }

  private getStateObject_(): PgnViewerState {
    return {
      resource: this.resource_.toString(),
      resourceColumn: this.resourceColumn_,
    };
  }
}

class StaticPgnFilePreview extends Disposable implements PgnPreview {
  private renderer_: PgnViewerRenderer;

  private readonly onDispose_: vscode.EventEmitter<void>;
  public readonly onDispose: vscode.Event<void>;

  constructor(
    context: vscode.ExtensionContext,
    chessConfigGetter: ChessgroundConfigGetter,
    private readonly webviewPanel_: vscode.WebviewPanel,
    private resource_: vscode.Uri
  ) {
    super();
    this.onDispose_ = new vscode.EventEmitter<void>();
    this.disposables_.push(this.onDispose_);
    this.onDispose = this.onDispose_.event;

    webviewPanel_.webview.options = getWebviewOptions(context.extensionUri);
    this.renderer_ = new PgnViewerRenderer(
      context,
      chessConfigGetter,
      webviewPanel_,
      resource_,
      {}
    );

    this.webviewPanel_.onDidDispose(
      () => this.dispose(),
      null,
      this.disposables_
    );

    this.update();
  }

  public update(): void {
    this.renderer_.update();
  }

  public override dispose(): void {
    this.onDispose_.fire();
    super.dispose();
    this.renderer_.dispose();
    this.webviewPanel_.dispose();
  }

  public showSource(): void {
    vscode.workspace.openTextDocument(this.resource_).then((document) => {
      vscode.window.showTextDocument(document);
    });
  }

  public isActive(): boolean {
    return this.webviewPanel_.active;
  }
}

export class PgnCustomEditorManager implements vscode.CustomTextEditorProvider {
  public static currents: Set<StaticPgnFilePreview> = new Set();

  public constructor(
    private context_: vscode.ExtensionContext,
    private chessConfigGetter_: ChessgroundConfigGetter
  ) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel
  ): Promise<void> {
    const preview = new StaticPgnFilePreview(
      this.context_,
      this.chessConfigGetter_,
      webviewPanel,
      document.uri
    );
    PgnCustomEditorManager.currents.add(preview);
    preview.onDispose(() => {
      PgnCustomEditorManager.currents.delete(preview);
    });
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

  const resourceColumn =
    (vscode.window.activeTextEditor &&
      vscode.window.activeTextEditor.viewColumn) ||
    vscode.ViewColumn.One;
  const previewColumn = sideBySide ? vscode.ViewColumn.Beside : resourceColumn;

  PgnFilePreview.createOrShowPgnViewer(
    context,
    resource,
    resourceColumn,
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
  PgnFilePreview.restorePgnViewer(
    context,
    chessConfigGetter,
    webviewPanel,
    state
  );
}

export function showPreviewSource() {
  for (const preview of PgnCustomEditorManager.currents) {
    if (preview.isActive()) {
      preview.showSource();
      return;
    }
  }

  PgnFilePreview.current?.showSource();
}

export function updateExistingPgnPreview() {
  PgnFilePreview.current?.update();
  PgnCustomEditorManager.currents.forEach((preview) => preview.update());
}
