import type { GameState } from '../domain/index.js';

export interface GameRepository {
  save(state: GameState): Promise<void>;
  findById(gameId: string): Promise<GameState | null>;
  count(): Promise<number>;
  /** Deletes up to `limit` stale games; returns the ids that were removed. */
  deleteOlderThan(isoTimestamp: string, limit: number): Promise<string[]>;
}
