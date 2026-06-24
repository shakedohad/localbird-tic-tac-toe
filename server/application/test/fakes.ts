import { GameService } from '../game-service.js';
import type { GameServiceConfig } from '../config.js';
import type { GameBroadcaster } from '../../contracts/index.js';
import type { GameRepository } from '../../contracts/index.js';
import type { IdGenerator } from '../../contracts/index.js';
import type { ServerMessage } from '../../contracts/index.js';
import type { PresencePayload, PublicGameState } from '../../contracts/index.js';
import type { TokenGenerator } from '../../contracts/index.js';
import type { GameState } from '../../domain/index.js';

export class InMemoryGameRepository implements GameRepository {
  private readonly games = new Map<string, GameState>();

  async save(state: GameState): Promise<void> {
    this.games.set(state.id, structuredClone(state));
  }

  async findById(gameId: string): Promise<GameState | null> {
    const state = this.games.get(gameId);
    return state === undefined ? null : structuredClone(state);
  }

  async count(): Promise<number> {
    return this.games.size;
  }

  async deleteOlderThan(isoTimestamp: string, limit: number): Promise<string[]> {
    const cutoff = Date.parse(isoTimestamp);
    const stale = [...this.games.entries()]
      .filter(([, state]) => Date.parse(state.updatedAt) < cutoff)
      .sort(([, a], [, b]) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt))
      .slice(0, limit);

    const deleted: string[] = [];
    for (const [id] of stale) {
      this.games.delete(id);
      deleted.push(id);
    }

    return deleted;
  }

  size(): number {
    return this.games.size;
  }
}

export class RecordingBroadcaster implements GameBroadcaster {
  readonly gameStates: Array<{ gameId: string; state: PublicGameState }> = [];
  readonly presence: Array<{ gameId: string; payload: PresencePayload }> = [];
  readonly direct: Array<{ connectionId: string; message: ServerMessage }> = [];

  broadcastGameState(gameId: string, state: PublicGameState): void {
    this.gameStates.push({ gameId, state: structuredClone(state) });
  }

  broadcastPresence(gameId: string, payload: PresencePayload): void {
    this.presence.push({ gameId, payload: structuredClone(payload) });
  }

  sendToConnection(connectionId: string, message: ServerMessage): void {
    this.direct.push({ connectionId, message: structuredClone(message) });
  }

  lastGameState(gameId: string): PublicGameState | undefined {
    const entries = this.gameStates.filter((entry) => entry.gameId === gameId);
    return entries.at(-1)?.state;
  }
}

export class SequentialIdGenerator implements IdGenerator {
  constructor(private readonly ids: string[]) {}

  private index = 0;

  generate(): string {
    const id = this.ids[this.index];
    this.index += 1;
    if (id === undefined) {
      throw new Error('No more ids');
    }
    return id;
  }
}

export class FakeTokenGenerator implements TokenGenerator {
  private counter = 0;

  generate(): string {
    this.counter += 1;
    return `token-${this.counter}`;
  }

  hash(token: string): string {
    return `hash:${token}`;
  }

  verify(token: string, hash: string): boolean {
    return this.hash(token) === hash;
  }
}

export class MutableClock {
  constructor(private current: string) {}

  set(value: string): void {
    this.current = value;
  }

  now = (): string => this.current;
}

export interface TestHarness {
  repository: InMemoryGameRepository;
  broadcaster: RecordingBroadcaster;
  tokenGenerator: FakeTokenGenerator;
  clock: MutableClock;
  service: GameService;
}

export function createTestHarness(
  options: {
    ids?: string[];
    startTime?: string;
    config?: Partial<GameServiceConfig>;
  } = {},
): TestHarness {
  const repository = new InMemoryGameRepository();
  const broadcaster = new RecordingBroadcaster();
  const tokenGenerator = new FakeTokenGenerator();
  const clock = new MutableClock(options.startTime ?? '2026-06-24T00:00:00.000Z');

  const service = new GameService({
    repository,
    broadcaster,
    idGenerator: new SequentialIdGenerator(options.ids ?? ['game-1']),
    tokenGenerator,
    clock: clock.now,
    config: options.config,
  });

  return { repository, broadcaster, tokenGenerator, clock, service };
}
