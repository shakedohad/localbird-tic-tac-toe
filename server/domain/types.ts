export type Symbol = 'X' | 'O';

export type Cell = Symbol | null;

/** Fixed 3×3 board stored in row-major order (indices 0–8). */
export type Board = readonly [
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
  Cell,
];

export type GameStatus = 'waiting' | 'active' | 'finished';

export type GameOutcome = Symbol | 'draw' | null;

export interface SeatState {
  seatTokenHash: string;
  displayName: string | null;
  connected: boolean;
  lastConnectedAt: string | null;
}

export interface GameState {
  id: string;
  status: GameStatus;
  board: Board;
  currentTurn: Symbol;
  winner: GameOutcome;
  winningLine: number[] | null;
  version: number;
  updatedAt: string;
  players: {
    X: SeatState | null;
    O: SeatState | null;
  };
}

export interface WinResult {
  winner: Symbol;
  winningLine: number[];
}
