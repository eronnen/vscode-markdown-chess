# VSCode Chess Viewer

Visualize your chess notes in vscode!

**Features:**

1. [Markdown chess viewer](#markdown-usage)
2. [PGN file viewer](#pgn-viewer)

## Markdown Usage

![vscode-markdown-chess demo](./images/demo/demo.jpg)

### Chess Positions

Create an empty chess board by writing a chess code block:

````markdown
```chess

```
````

On an empty board you can move pieces and draw arrows/squares and copy it back to the chess code block, as shown in the [demo GIF](./images/demo/demo.gif).

You can supply an initial FEN, and arrows/squares to mark on the board:

````markdown
```chess
fen: r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1
arrows: f3->e5 b5->c6
squares: g5 f7
```
````

### Chess Games

You can view full chess games by using the pgn code block and copying a game in pgn format:

````markdown
```pgn
orientation: black
[Event "India"]
[Date "1984.??.??"]
[Result "0-1"]
[White "Srinivas"]
[Black "Vaidyanathan Ravikumar"]
[PlyCount "28"]

1. d4 e5 2. dxe5 d6 3. exd6 Bxd6 4. c3 Nf6 5. Bg5 Nc6 6. e3
O-O 7. Bxf6 Qxf6 8. Qf3 Qg6 9. Ne2 Re8 10. Ng3 Nd4 11. cxd4
Bg4 12. Qxb7 Rab8 13. Qxa7 Qxb1+ 14. Kd2 Bb4# 0-1
```
````

Alternatively, you can supply a starting position and a move sequence:

````markdown
```chess
fen: r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4
moves: Ba4 Nf6 O-O b5 Bb3 Be7 Re1 d6
```
````

### Properties

You can set various properties inside the code block, each one in a separate line in the format `name: value`.

#### Supported properties for chess and pgn blocks

These properties are available both for chess and pgn blocks. when using in a pgn block, the properties must come before the pgn itself.

| **Property**    | **Description**                         | **Possible values** | **Default** |
| --------------- | --------------------------------------- | ------------------- | ----------- |
| **orientation** | Which side to view the board            | white / black       | white       |
| **size**        | Board width/height size in px (150-600) | 400px               | 280px       |

#### Supported properties for chess blocks

These properties are only available for chess blocks.

| **Property**    | **Description**                                      | **Possible values**  | **Default**                         |
| --------------- | ---------------------------------------------------- | -------------------- | ----------------------------------- |
| **fen**         | The initial position                                 | Any valid FEN string | Initial                             |
| **arrows**      | Series of arrows to draw                             | e2->e4 d2->d4        | Empty                               |
| **squares**     | Series of squares to mark                            | e5 d5                | Empty                               |
| **movable**     | Force to enable/disable movement                     | true / false         | false if FEN supplied               |
| **drawable**    | Force to enable/disable drawing                      | true / false         | false if arrows or squares supplied |
| **lastMove**    | Highlight last move                                  | e2 e4                | Undefined                           |
| **moves**       | Sequence of moves to view in the position            | e4 e5 Nf3 Nf6 Nxe5   | Undefined                           |
| **initialMove** | Move to display as the initial position. -1 for last | -1,0,1,2,3,...       | 0                                   |
| **variant**     | Variant name                                         | Chess960             | Undefined                           |

## PGN Viewer

This extension also implements a viewer to PGN files. When you open a pgn file, simply click the preview icon in order to view the PGN games.

![PGN demo](./images/demo/demo-pgn.gif)

## Themes

Multiple board themes and piece sets are supported. Currently the extension has limited resources available, because they already increase the extension's size significantly.

You can change themes in the extension's settings, or via the `Markdown: Open Chess Settings` command.

### Piece sets

- [merida](https://github.com/lichess-org/lila/blob/master/public/piece/merida/bK.svg) (default)
- [cburnett](https://github.com/lichess-org/lila/blob/master/public/piece/cburnett/bK.svg)
- [alpha](https://github.com/lichess-org/lila/blob/master/public/piece/alpha/bK.svg)

### Boards

- [brown](https://github.com/lichess-org/lila/blob/master/public/images/board/svg/brown.svg) (default)
- [blue](https://github.com/lichess-org/lila/blob/master/public/images/board/svg/blue.svg)
- [green](https://github.com/lichess-org/lila/blob/master/public/images/board/svg/green.svg)
- [ic](https://github.com/lichess-org/lila/blob/master/public/images/board/svg/ic.svg)
- [purple](https://github.com/lichess-org/lila/blob/master/public/images/board/svg/purple.svg)

## License

This project is based on the [Chessground](https://github.com/lichess-org/chessground) and [Chessops](https://github.com/niklasf/chessops) libraries by lichess in order to render the chess board and play moves, so I had to use the GPL-3.0 license for this project too.

## TODO

- [ ] show move number in PGN viewer
- [ ] update PGN current move when clicking on move in editor
- [ ] load themes and piece sets CSS in runtime
- [ ] show FEN/PGN errors
- [ ] in a capture of a black piece by a white piece, when animating previous move show the white on top of the black piece
- [ ] handle en passant and promotion in chessPosition.ts
- [ ] Support jpg/png board backgrounds
- [ ] Support 3d pieces

## Contributing

`vscode-markdown-chess` is developed on GitHub at [eronne/vscode-mardown-chess](https://github.com/eronnen/vscode-markdown-chess). Feel free to add PRs, issues and feature request on the [issues](https://github.com/eronnen/vscode-markdown-chess/issues) page.

---
