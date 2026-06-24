export { DomainError, type DomainErrorCode } from './errors.js';
export {
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
export {
  applyMove,
  assignSeat,
  createInitialState,
  findSeatByTokenHash,
  setSeatConnected,
  type AssignSeatParams,
} from './game.js';
export type {
  Board,
  Cell,
  GameOutcome,
  GameState,
  GameStatus,
  SeatState,
  Symbol,
  WinResult,
} from './types.js';
