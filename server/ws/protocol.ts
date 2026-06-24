import type { JoinResult } from '../application/index.js';
import type { JoinedMessage, ServerMessage } from '../contracts/index.js';
import type { ProtocolErrorCode } from '../contracts/index.js';
import { isRecoverableError } from './errors.js';

export function toJoinedMessage(result: JoinResult): JoinedMessage {
  if (result.kind === 'player') {
    return {
      type: 'joined',
      role: 'player',
      seat: result.seat,
      seatToken: result.seatToken,
      game: result.game,
    };
  }

  return {
    type: 'joined',
    role: 'spectator',
    game: result.game,
  };
}

export function toErrorMessage(code: ProtocolErrorCode, message: string): ServerMessage {
  return {
    type: 'error',
    code,
    message,
    recoverable: isRecoverableError(code),
  };
}

export type ClientMessage =
  | { type: 'join'; gameId: string; displayName?: string }
  | { type: 'reconnect'; gameId: string; seatToken: string }
  | { type: 'watch'; gameId: string; displayName?: string }
  | { type: 'make_move'; index: number }
  | { type: 'ping' };

export function parseClientMessage(raw: unknown): ClientMessage {
  if (typeof raw !== 'object' || raw === null || !('type' in raw)) {
    throw new Error('Invalid message');
  }

  const message = raw as Record<string, unknown>;

  switch (message.type) {
    case 'join':
      return {
        type: 'join',
        gameId: requireString(message.gameId, 'gameId'),
        displayName: optionalString(message.displayName),
      };
    case 'reconnect':
      return {
        type: 'reconnect',
        gameId: requireString(message.gameId, 'gameId'),
        seatToken: requireString(message.seatToken, 'seatToken'),
      };
    case 'watch':
      return {
        type: 'watch',
        gameId: requireString(message.gameId, 'gameId'),
        displayName: optionalString(message.displayName),
      };
    case 'make_move':
      return {
        type: 'make_move',
        index: requireIndex(message.index),
      };
    case 'ping':
      return { type: 'ping' };
    default:
      throw new Error(`Unknown message type: ${String(message.type)}`);
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid ${field}`);
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error('Invalid displayName');
  }
  return value;
}

function requireIndex(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error('Invalid index');
  }
  return value;
}
