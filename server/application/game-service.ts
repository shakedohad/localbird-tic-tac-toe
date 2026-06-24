import type { GameBroadcaster } from '../contracts/index.js';
import type { GameRepository } from '../contracts/index.js';
import type { IdGenerator } from '../contracts/index.js';
import type { TokenGenerator } from '../contracts/index.js';
import type { PublicGameState } from '../contracts/index.js';
import { DomainError } from '../domain/index.js';
import {
  applyMove as domainApplyMove,
  assignSeat,
  createInitialState,
  setSeatConnected,
} from '../domain/index.js';
import type { GameState, Symbol } from '../domain/index.js';
import type { GameServiceConfig } from './config.js';
import { DEFAULT_GAME_SERVICE_CONFIG } from './config.js';
import { ConnectionRegistry } from './connection-registry.js';
import { ApplicationError } from './errors.js';
import { toPublicGameState } from './public-state-mapper.js';

export interface GameServiceDeps {
  repository: GameRepository;
  broadcaster: GameBroadcaster;
  idGenerator: IdGenerator;
  tokenGenerator: TokenGenerator;
  clock: () => string;
  config?: Partial<GameServiceConfig>;
}

export type JoinResult =
  | { kind: 'player'; seat: Symbol; seatToken: string; game: PublicGameState }
  | { kind: 'spectator'; game: PublicGameState };

export interface ReconnectResult {
  seat: Symbol;
  game: PublicGameState;
}

export interface WatchResult {
  game: PublicGameState;
}

export class GameService {
  private readonly repository: GameRepository;
  private readonly broadcaster: GameBroadcaster;
  private readonly idGenerator: IdGenerator;
  private readonly tokenGenerator: TokenGenerator;
  private readonly clock: () => string;
  private readonly config: GameServiceConfig;
  private readonly connections = new ConnectionRegistry();

  constructor(deps: GameServiceDeps) {
    this.repository = deps.repository;
    this.broadcaster = deps.broadcaster;
    this.idGenerator = deps.idGenerator;
    this.tokenGenerator = deps.tokenGenerator;
    this.clock = deps.clock;
    this.config = { ...DEFAULT_GAME_SERVICE_CONFIG, ...deps.config };
  }

  async createGame(): Promise<{ gameId: string }> {
    const now = this.clock();
    const gameId = this.idGenerator.generate();
    const state = createInitialState(gameId, now);
    await this.repository.save(state);
    return { gameId };
  }

  async join(params: {
    gameId: string;
    connectionId: string;
    displayName?: string;
  }): Promise<JoinResult> {
    const state = await this.requireGame(params.gameId);

    if (state.players.X === null) {
      return this.assignPlayerSeat(state, 'X', params.connectionId, params.displayName);
    }

    if (state.players.O === null) {
      return this.assignPlayerSeat(state, 'O', params.connectionId, params.displayName);
    }

    return {
      kind: 'spectator',
      game: (await this.watch({
        gameId: params.gameId,
        connectionId: params.connectionId,
        displayName: params.displayName,
      })).game,
    };
  }

  async reconnect(params: {
    gameId: string;
    seatToken: string;
    connectionId: string;
  }): Promise<ReconnectResult> {
    const state = await this.requireGame(params.gameId);
    const seat = this.findSeatByToken(state, params.seatToken);

    if (seat === null) {
      throw new ApplicationError('INVALID_SEAT_TOKEN', 'Seat token is invalid for this game');
    }

    this.connections.register(params.connectionId, {
      role: 'player',
      gameId: params.gameId,
      seat,
    });

    const next = setSeatConnected(state, seat, true, this.clock());
    await this.persistAndBroadcast(params.gameId, next);

    return {
      seat,
      game: toPublicGameState(next),
    };
  }

  async watch(params: {
    gameId: string;
    connectionId: string;
    displayName?: string;
  }): Promise<WatchResult> {
    const state = await this.requireGame(params.gameId);
    this.assertSpectatorCapacity(params.gameId);

    this.connections.register(params.connectionId, {
      role: 'spectator',
      gameId: params.gameId,
    });

    return { game: toPublicGameState(state) };
  }

  async applyMove(params: {
    gameId: string;
    seat: Symbol;
    index: number;
  }): Promise<PublicGameState> {
    const state = await this.requireGame(params.gameId);
    this.assertMoveAllowed(state, params.seat);

    const next = this.runDomain(() =>
      domainApplyMove(state, params.seat, params.index, this.clock()),
    );
    await this.persistAndBroadcast(params.gameId, next);
    return toPublicGameState(next);
  }

  async handleDisconnect(params: { connectionId: string }): Promise<void> {
    const entry = this.connections.unregister(params.connectionId);
    if (entry === undefined) {
      return;
    }

    if (entry.role === 'spectator') {
      return;
    }

    const state = await this.repository.findById(entry.gameId);
    if (state === null) {
      return;
    }

    const next = setSeatConnected(state, entry.seat, false, this.clock());
    await this.persistAndBroadcast(entry.gameId, next);
  }

  async purgeExpiredGames(olderThanMs: number, batchSize: number): Promise<string[]> {
    const cutoff = new Date(Date.parse(this.clock()) - olderThanMs).toISOString();
    const deletedGameIds = await this.repository.deleteOlderThan(cutoff, batchSize);

    for (const gameId of deletedGameIds) {
      this.connections.clearGame(gameId);
    }

    return deletedGameIds;
  }

  async getPublicState(gameId: string): Promise<PublicGameState | null> {
    const state = await this.repository.findById(gameId);
    if (state === null) {
      return null;
    }
    return toPublicGameState(state);
  }

  private async assignPlayerSeat(
    state: GameState,
    seat: Symbol,
    connectionId: string,
    displayName?: string,
  ): Promise<JoinResult> {
    const seatToken = this.tokenGenerator.generate();
    const seatTokenHash = this.tokenGenerator.hash(seatToken);
    const next = this.runDomain(() =>
      assignSeat(
        state,
        { seat, seatTokenHash, displayName },
        this.clock(),
      ),
    );

    this.connections.register(connectionId, {
      role: 'player',
      gameId: state.id,
      seat,
    });

    await this.persistAndBroadcast(state.id, next);

    return {
      kind: 'player',
      seat,
      seatToken,
      game: toPublicGameState(next),
    };
  }

  private async requireGame(gameId: string): Promise<GameState> {
    const state = await this.repository.findById(gameId);
    if (state === null) {
      throw new ApplicationError('GAME_NOT_FOUND', `Game ${gameId} was not found`);
    }
    return state;
  }

  private assertSpectatorCapacity(gameId: string): void {
    const { maxSpectators } = this.config;
    if (maxSpectators === null) {
      return;
    }

    if (this.connections.spectatorCount(gameId) >= maxSpectators) {
      throw new ApplicationError(
        'SPECTATOR_LIMIT_REACHED',
        'Spectator limit reached for this game',
      );
    }
  }

  private assertMoveAllowed(state: GameState, seat: Symbol): void {
    if (this.config.disconnectPolicy !== 'pause') {
      return;
    }

    const currentSeat = state.currentTurn;
    const currentPlayer = state.players[currentSeat];
    if (currentPlayer !== null && !currentPlayer.connected) {
      throw new ApplicationError(
        'GAME_NOT_ACTIVE',
        'Game is paused until the current player reconnects',
      );
    }

    if (seat !== currentSeat) {
      return;
    }

    const actor = state.players[seat];
    if (actor !== null && !actor.connected) {
      throw new ApplicationError(
        'GAME_NOT_ACTIVE',
        'Game is paused until you reconnect',
      );
    }
  }

  private findSeatByToken(state: GameState, seatToken: string): Symbol | null {
    for (const seat of ['X', 'O'] as const) {
      const player = state.players[seat];
      if (player !== null && this.tokenGenerator.verify(seatToken, player.seatTokenHash)) {
        return seat;
      }
    }
    return null;
  }

  private async persistAndBroadcast(gameId: string, state: GameState): Promise<void> {
    await this.repository.save(state);
    this.broadcaster.broadcastGameState(gameId, toPublicGameState(state));
  }

  private runDomain<T>(action: () => T): T {
    try {
      return action();
    } catch (error) {
      if (error instanceof DomainError) {
        throw mapDomainError(error);
      }
      throw error;
    }
  }
}

function mapDomainError(error: DomainError): ApplicationError {
  const code = DOMAIN_ERROR_TO_PROTOCOL[error.code];
  return new ApplicationError(code, error.message);
}

const DOMAIN_ERROR_TO_PROTOCOL = {
  SEAT_ALREADY_TAKEN: 'ALREADY_CONNECTED',
  SEAT_NOT_ASSIGNED: 'NOT_A_PLAYER',
  INVALID_SEAT_ORDER: 'INTERNAL_ERROR',
  GAME_FINISHED: 'GAME_NOT_ACTIVE',
  GAME_NOT_ACTIVE: 'GAME_NOT_ACTIVE',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  INVALID_MOVE: 'INVALID_MOVE',
  CELL_OCCUPIED: 'INVALID_MOVE',
} as const satisfies Record<DomainError['code'], ApplicationError['code']>;
