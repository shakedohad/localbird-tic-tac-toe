import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { WebSocket } from 'ws';
import { ConnectionManager } from './connection-manager.js';

function createMockSocket() {
  const OPEN = 1;
  return {
    readyState: OPEN,
    OPEN,
    send: vi.fn(),
    close: vi.fn(),
  } as unknown as WebSocket;
}

describe('ConnectionManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tracks connections and game membership', () => {
    const manager = new ConnectionManager({
      handshakeTimeoutMs: 0,
      idleTimeoutMs: 0,
    });
    const socket = createMockSocket();

    manager.create('conn-1', socket);
    manager.setPlayer('conn-1', 'game-1', 'X');

    expect(manager.size()).toBe(1);
    expect(manager.getStats()).toEqual({
      totalConnections: 1,
      gamesWithConnections: 1,
    });
    expect(manager.listGameConnectionIds('game-1')).toEqual(['conn-1']);
  });

  it('closes connections that never complete the handshake', () => {
    const onHandshakeTimeout = vi.fn();
    const manager = new ConnectionManager({
      handshakeTimeoutMs: 1_000,
      idleTimeoutMs: 0,
      onHandshakeTimeout,
    });
    const socket = createMockSocket();

    manager.create('conn-1', socket);
    vi.advanceTimersByTime(1_000);

    expect(onHandshakeTimeout).toHaveBeenCalledWith('conn-1');
    expect(socket.close).toHaveBeenCalled();
    expect(manager.has('conn-1')).toBe(false);
  });

  it('closes idle connections after activity stops', () => {
    const onIdleTimeout = vi.fn();
    const manager = new ConnectionManager({
      handshakeTimeoutMs: 0,
      idleTimeoutMs: 2_000,
      onIdleTimeout,
    });
    const socket = createMockSocket();

    manager.create('conn-1', socket);
    manager.setSpectator('conn-1', 'game-1');
    manager.touch('conn-1');

    vi.advanceTimersByTime(1_999);
    expect(onIdleTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onIdleTimeout).toHaveBeenCalledWith('conn-1');
    expect(socket.close).toHaveBeenCalled();
  });

  it('evicts every connection for a game', () => {
    const manager = new ConnectionManager({
      handshakeTimeoutMs: 0,
      idleTimeoutMs: 0,
    });
    const socketA = createMockSocket();
    const socketB = createMockSocket();

    manager.create('conn-a', socketA);
    manager.create('conn-b', socketB);
    manager.setPlayer('conn-a', 'game-1', 'X');
    manager.setSpectator('conn-b', 'game-1');

    const evicted = manager.evictGame('game-1');

    expect(evicted).toEqual(['conn-a', 'conn-b']);
    expect(manager.size()).toBe(0);
    expect(socketA.close).toHaveBeenCalled();
    expect(socketB.close).toHaveBeenCalled();
  });

  it('returns the existing player connection id for supersede checks', () => {
    const manager = new ConnectionManager({
      handshakeTimeoutMs: 0,
      idleTimeoutMs: 0,
    });

    manager.create('conn-old', createMockSocket());
    manager.create('conn-new', createMockSocket());
    manager.setPlayer('conn-old', 'game-1', 'X');

    expect(manager.supersedePlayerConnection('game-1', 'X', 'conn-new')).toBe('conn-old');
    expect(manager.supersedePlayerConnection('game-1', 'X', 'conn-old')).toBeUndefined();
  });
});
