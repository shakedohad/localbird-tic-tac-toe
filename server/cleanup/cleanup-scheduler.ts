import type { GameService } from '../application/index.js';
import type { ConnectionManager } from '../ws/connection-manager.js';

export function startCleanupScheduler(deps: {
  gameService: GameService;
  connectionManager: ConnectionManager;
  gameTtlMs: number;
  intervalMs: number;
  purgeBatchSize: number;
}): () => void {
  const runCleanup = () => {
    void deps.gameService
      .purgeExpiredGames(deps.gameTtlMs, deps.purgeBatchSize)
      .then((deletedGameIds) => {
        for (const gameId of deletedGameIds) {
          deps.connectionManager.evictGame(gameId);
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to purge expired games', error);
      });
  };

  runCleanup();
  const timer = setInterval(runCleanup, deps.intervalMs);

  return () => {
    clearInterval(timer);
  };
}
