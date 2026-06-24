import type { PublicGameState } from './public-state.js';
import type { Symbol } from '../domain/index.js';

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

export interface PongMessage {
  type: 'pong';
}

export interface SupersededMessage {
  type: 'superseded';
  reason: 'reconnected_elsewhere';
}

export type ServerMessage =
  | JoinedMessage
  | GameStateMessage
  | ErrorMessage
  | PongMessage
  | SupersededMessage;
