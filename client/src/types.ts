export type Symbol = 'X' | 'O';
export type Cell = Symbol | null;
export type Board = readonly Cell[];
export type GameStatus = 'waiting' | 'active' | 'finished';
export type GameOutcome = Symbol | 'draw' | null;

export interface PublicSeat {
  displayName: string | null;
  connected: boolean;
}

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

export type ProtocolErrorCode =
  | 'GAME_NOT_FOUND'
  | 'GAME_EXPIRED'
  | 'INVALID_MESSAGE'
  | 'UNAUTHENTICATED'
  | 'NOT_A_PLAYER'
  | 'NOT_YOUR_TURN'
  | 'GAME_NOT_ACTIVE'
  | 'INVALID_MOVE'
  | 'INVALID_SEAT_TOKEN'
  | 'SPECTATOR_LIMIT_REACHED'
  | 'ALREADY_CONNECTED'
  | 'INTERNAL_ERROR';

export interface JoinedMessage {
  type: 'joined';
  role: 'player' | 'spectator';
  seat?: Symbol;
  seatToken?: string;
  game: PublicGameState;
}

export interface GameStateMessage {
  type: 'game_state';
  game: PublicGameState;
}

export interface ErrorMessage {
  type: 'error';
  code: ProtocolErrorCode;
  message: string;
  recoverable: boolean;
}

export interface SupersededMessage {
  type: 'superseded';
  reason: 'reconnected_elsewhere';
}

export interface PongMessage {
  type: 'pong';
}

export type ServerMessage =
  | JoinedMessage
  | GameStateMessage
  | ErrorMessage
  | SupersededMessage
  | PongMessage;

export type ClientMessage =
  | { type: 'join'; gameId: string; displayName?: string }
  | { type: 'reconnect'; gameId: string; seatToken: string }
  | { type: 'watch'; gameId: string }
  | { type: 'make_move'; index: number }
  | { type: 'ping' };

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'superseded'
  | 'ended';

export type PlayerRole = 'player' | 'spectator';
