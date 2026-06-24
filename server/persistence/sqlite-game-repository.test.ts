import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createInitialState } from '../domain/index.js';
import { SqliteGameRepository } from './sqlite-game-repository.js';

describe('SqliteGameRepository', () => {
  it('persists and reloads game state', async () => {
    const databasePath = join(mkdtempSync(join(tmpdir(), 'tictactoe-')), 'games.db');
    const repository = new SqliteGameRepository(databasePath);
    const state = createInitialState('game-1', '2026-06-24T00:00:00.000Z');

    await repository.save(state);
    const loaded = await repository.findById('game-1');

    expect(loaded).toEqual(state);
    repository.close();
  });

  it('deletes games older than a cutoff timestamp', async () => {
    const databasePath = join(mkdtempSync(join(tmpdir(), 'tictactoe-')), 'games.db');
    const repository = new SqliteGameRepository(databasePath);

    await repository.save(createInitialState('old-game', '2026-06-01T00:00:00.000Z'));
    await repository.save(createInitialState('new-game', '2026-06-20T00:00:00.000Z'));

    const deleted = await repository.deleteOlderThan('2026-06-10T00:00:00.000Z', 500);

    expect(deleted).toEqual(['old-game']);
    expect(await repository.findById('old-game')).toBeNull();
    expect(await repository.findById('new-game')).not.toBeNull();
    repository.close();
  });

  it('respects the delete batch limit', async () => {
    const databasePath = join(mkdtempSync(join(tmpdir(), 'tictactoe-')), 'games.db');
    const repository = new SqliteGameRepository(databasePath);

    await repository.save(createInitialState('game-a', '2026-06-01T00:00:00.000Z'));
    await repository.save(createInitialState('game-b', '2026-06-02T00:00:00.000Z'));

    const deleted = await repository.deleteOlderThan('2026-06-10T00:00:00.000Z', 1);

    expect(deleted).toHaveLength(1);
    expect(await repository.count()).toBe(1);
    repository.close();
  });
});
