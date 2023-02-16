# Tools

## lichess-minimal.sfd

This is lichess special font, copied from https://github.com/lichess-org/lila/blob/master/public/font/lichess.sfd. This file is a FontForge project file, which is used in order to generate the lichess woff2 font file. This font contains all of the special characters that lichess uses.

The lichess-minimal.sfd contains only the needed characters for this extension, in order to reduce the package size.

**TODO**: auomate this with `fantasticon`

## fetch-boards.ts

This script is used to fetch the board resources from lichess project in order to ship them with the extension.

## fetch-pieces.ts

This script is used to fetch the pieces resources from lichess project in order to ship them with the extension.
