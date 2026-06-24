import { describe, expect, it } from 'vitest';
import { parseClientMessage } from './protocol.js';

describe('parseClientMessage', () => {
  it('parses join messages', () => {
    expect(parseClientMessage({ type: 'join', gameId: 'game-1', displayName: 'Alice' })).toEqual({
      type: 'join',
      gameId: 'game-1',
      displayName: 'Alice',
    });
  });

  it('parses reconnect messages', () => {
    expect(
      parseClientMessage({ type: 'reconnect', gameId: 'game-1', seatToken: 'token' }),
    ).toEqual({
      type: 'reconnect',
      gameId: 'game-1',
      seatToken: 'token',
    });
  });

  it('parses watch and make_move messages', () => {
    expect(parseClientMessage({ type: 'watch', gameId: 'game-1' })).toEqual({
      type: 'watch',
      gameId: 'game-1',
      displayName: undefined,
    });
    expect(parseClientMessage({ type: 'make_move', index: 4 })).toEqual({
      type: 'make_move',
      index: 4,
    });
    expect(parseClientMessage({ type: 'ping' })).toEqual({ type: 'ping' });
  });

  it('rejects invalid payloads', () => {
    expect(() => parseClientMessage(null)).toThrow('Invalid message');
    expect(() => parseClientMessage({ type: 'join' })).toThrow('Invalid gameId');
    expect(() => parseClientMessage({ type: 'make_move', index: 1.5 })).toThrow('Invalid index');
    expect(() => parseClientMessage({ type: 'unknown' })).toThrow('Unknown message type');
  });
});
