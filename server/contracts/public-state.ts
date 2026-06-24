import type { Board, GameOutcome, GameStatus, Symbol } from '../domain/index.js';

/** Client-safe view of an occupied seat (no token hash). */
export interface PublicSeat {
  displayName: string | null;
  connected: boolean;
}

/** Authoritative game snapshot safe to broadcast to players and spectators. */
export interface PublicGameState {
  id: string;
  status: GameStatus;
  board: Board;
  currentTurn: Symbol;
  winner: GameOutcome;
  winningLine: number[] | null;
  version: number;
  players: {
    X: PublicSeat | null;
    O: PublicSeat | null;
  };
}

export interface PresencePayload {
  players: {
    X: PublicSeat;
    O: PublicSeat;
  };
}
