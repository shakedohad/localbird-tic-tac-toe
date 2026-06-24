import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE,
  WINNING_LINES,
  createEmptyBoard,
  detectDraw,
  detectWin,
  getOpponent,
  isBoardFull,
  isValidCellIndex,
  withCell,
} from './board.js';

describe('board', () => {
  it('creates an empty board with nine cells', () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(BOARD_SIZE);
    expect(board.every((cell) => cell === null)).toBe(true);
  });

  it('validates cell indices', () => {
    expect(isValidCellIndex(0)).toBe(true);
    expect(isValidCellIndex(8)).toBe(true);
    expect(isValidCellIndex(-1)).toBe(false);
    expect(isValidCellIndex(9)).toBe(false);
    expect(isValidCellIndex(1.5)).toBe(false);
  });

  it('returns the opponent symbol', () => {
    expect(getOpponent('X')).toBe('O');
    expect(getOpponent('O')).toBe('X');
  });

  it('detects wins on every winning line', () => {
    for (const line of WINNING_LINES) {
      const board = createEmptyBoard();
      let next = board;
      for (const index of line) {
        next = withCell(next, index, 'X');
      }

      expect(detectWin(next)).toEqual({
        winner: 'X',
        winningLine: [...line],
      });
    }
  });

  it('returns null when there is no win', () => {
    const board = withCell(withCell(createEmptyBoard(), 0, 'X'), 1, 'O');
    expect(detectWin(board)).toBeNull();
  });

  it('detects a full board with no winner as a draw', () => {
    const board = withCell(createEmptyBoard(), 0, 'X');
    const filled = [
      'X', 'O', 'X',
      'X', 'O', 'O',
      'O', 'X', 'X',
    ] as const;

    let next = board;
    for (let index = 1; index < filled.length; index += 1) {
      next = withCell(next, index, filled[index]!);
    }

    expect(isBoardFull(next)).toBe(true);
    expect(detectWin(next)).toBeNull();
    expect(detectDraw(next)).toBe(true);
  });

  it('does not treat an incomplete board as a draw', () => {
    expect(detectDraw(createEmptyBoard())).toBe(false);
  });
});
