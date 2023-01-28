import type { Key } from "chessground/types";

export function parseBoolean(value: string): boolean | null {
  if (value.toLowerCase() === "true") {
    return true;
  } else if (value.toLowerCase() === "false") {
    return false;
  }

  return null;
}

export function parseSquaresString(line: string): Key[] {
  const result: Key[] = [];

  let currentFile: string | null = null;
  for (const char of line) {
    if (currentFile === null) {
      if (char.toLowerCase() >= "a" && char.toLowerCase() <= "h") {
        currentFile = char.toLowerCase();
      }
    } else {
      if (char >= "1" && char <= "8") {
        result.push(`${currentFile}${char}` as Key);
        currentFile = null;
      }
    }
  }

  return result;
}