import type { Board, Cell, Symbol, WinResult } from './types.js';

export const BOARD_SIZE = 9;

export const WINNING_LINES: readonly number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createEmptyBoard(): Board {
  return [null, null, null, null, null, null, null, null, null];
}

export function isValidCellIndex(index: number): index is 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 {
  return Number.isInteger(index) && index >= 0 && index < BOARD_SIZE;
}

export function getOpponent(symbol: Symbol): Symbol {
  return symbol === 'X' ? 'O' : 'X';
}

export function isBoardFull(board: Board): boolean {
  return board.every((cell) => cell !== null);
}

export function detectWin(board: Board): WinResult | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line as [number, number, number];
    const first = board[a];
    if (first != null && first === board[b] && first === board[c]) {
      return { winner: first, winningLine: [...line] };
    }
  }

  return null;
}

export function detectDraw(board: Board): boolean {
  return detectWin(board) === null && isBoardFull(board);
}

export function withCell(board: Board, index: number, value: Cell): Board {
  const next: [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell] = [...board];
  next[index as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8] = value;
  return next;
}
