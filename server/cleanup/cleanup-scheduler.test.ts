import { describe, expect, it, vi } from 'vitest';
import type { GameService } from '../application/index.js';
import { ConnectionManager } from '../ws/connection-manager.js';
import { startCleanupScheduler } from './cleanup-scheduler.js';

describe('startCleanupScheduler', () => {
  it('purges games and evicts websocket connections for deleted games', async () => {
    vi.useFakeTimers();

    const gameService = {
      purgeExpiredGames: vi.fn().mockResolvedValue(['game-1']),
    } as unknown as GameService;

    const connectionManager = new ConnectionManager({
      handshakeTimeoutMs: 0,
      idleTimeoutMs: 0,
    });
    const socket = {
      readyState: 1,
      OPEN: 1,
      send: vi.fn(),
      close: vi.fn(),
    };
    connectionManager.create('conn-1', socket as never);
    connectionManager.setPlayer('conn-1', 'game-1', 'X');

    const stop = startCleanupScheduler({
      gameService,
      connectionManager,
      gameTtlMs: 1_000,
      intervalMs: 5_000,
      purgeBatchSize: 10,
    });

    await Promise.resolve();

    expect(gameService.purgeExpiredGames).toHaveBeenCalledWith(1_000, 10);
    expect(connectionManager.has('conn-1')).toBe(false);
    expect(socket.close).toHaveBeenCalled();

    stop();
    vi.useRealTimers();
  });
});
