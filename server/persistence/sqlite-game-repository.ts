import Database from 'better-sqlite3';
import type { GameRepository } from '../contracts/index.js';
import type { GameState } from '../domain/index.js';
import { SCHEMA } from './schema.js';

export class SqliteGameRepository implements GameRepository {
  private readonly db: Database.Database;

  constructor(databasePath: string) {
    this.db = new Database(databasePath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(SCHEMA);
  }

  async save(state: GameState): Promise<void> {
    this.db
      .prepare(
        `
        INSERT INTO games (id, state, updated_at)
        VALUES (@id, @state, @updatedAt)
        ON CONFLICT(id) DO UPDATE SET
          state = excluded.state,
          updated_at = excluded.updated_at
      `,
      )
      .run({
        id: state.id,
        state: JSON.stringify(state),
        updatedAt: state.updatedAt,
      });
  }

  async findById(gameId: string): Promise<GameState | null> {
    const row = this.db
      .prepare('SELECT state FROM games WHERE id = ?')
      .get(gameId) as { state: string } | undefined;

    if (row === undefined) {
      return null;
    }

    return JSON.parse(row.state) as GameState;
  }

  async count(): Promise<number> {
    const row = this.db.prepare('SELECT COUNT(*) AS count FROM games').get() as {
      count: number;
    };
    return row.count;
  }

  async deleteOlderThan(isoTimestamp: string, limit: number): Promise<string[]> {
    const rows = this.db
      .prepare('SELECT id FROM games WHERE updated_at < ? ORDER BY updated_at ASC LIMIT ?')
      .all(isoTimestamp, limit) as Array<{ id: string }>;

    if (rows.length === 0) {
      return [];
    }

    const deleteStatement = this.db.prepare('DELETE FROM games WHERE id = ?');
    const deleteMany = this.db.transaction((ids: string[]) => {
      for (const id of ids) {
        deleteStatement.run(id);
      }
    });

    const ids = rows.map((row) => row.id);
    deleteMany(ids);
    return ids;
  }

  close(): void {
    this.db.close();
  }
}
