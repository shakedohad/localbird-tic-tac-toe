import { describe, expect, it } from 'vitest';
import { ApplicationError } from './errors.js';
import { toPublicGameState } from './public-state-mapper.js';
import { createInitialState } from '../domain/index.js';
import { createTestHarness } from './test/fakes.js';

describe('toPublicGameState', () => {
  it('strips seat token hashes from the public view', () => {
    const state = createInitialState('game-1', '2026-06-24T00:00:00.000Z');
    state.players.X = {
      seatTokenHash: 'secret-hash',
      displayName: 'Alice',
      connected: true,
      lastConnectedAt: '2026-06-24T00:00:00.000Z',
    };

    expect(toPublicGameState(state)).toEqual({
      id: 'game-1',
      status: 'waiting',
      board: state.board,
      currentTurn: 'X',
      winner: null,
      winningLine: null,
      version: 0,
      players: {
        X: { displayName: 'Alice', connected: true },
        O: null,
      },
    });
  });
});

describe('GameService', () => {
  it('creates a game in waiting status', async () => {
    const { service, repository } = createTestHarness();

    const { gameId } = await service.createGame();

    expect(gameId).toBe('game-1');
    const state = await repository.findById(gameId);
    expect(state?.status).toBe('waiting');
  });

  it('assigns X then O and activates the game on join', async () => {
    const { service } = createTestHarness();
    const { gameId } = await service.createGame();

    const playerX = await service.join({
      gameId,
      connectionId: 'conn-x',
      displayName: 'Alice',
    });
    expect(playerX).toMatchObject({
      kind: 'player',
      seat: 'X',
      seatToken: 'token-1',
    });
    expect(playerX.kind === 'player' && playerX.game.status).toBe('waiting');

    const playerO = await service.join({
      gameId,
      connectionId: 'conn-o',
      displayName: 'Bob',
    });
    expect(playerO).toMatchObject({
      kind: 'player',
      seat: 'O',
      seatToken: 'token-2',
    });
    expect(playerO.kind === 'player' && playerO.game.status).toBe('active');
  });

  it('falls back to spectator when both seats are taken', async () => {
    const { service } = createTestHarness();
    const { gameId } = await service.createGame();

    await service.join({ gameId, connectionId: 'conn-x' });
    await service.join({ gameId, connectionId: 'conn-o' });

    const spectator = await service.join({ gameId, connectionId: 'conn-s1' });

    expect(spectator).toEqual({
      kind: 'spectator',
      game: expect.objectContaining({ status: 'active' }),
    });
  });

  it('reconnects a player with a valid seat token', async () => {
    const { service, clock } = createTestHarness();
    const { gameId } = await service.createGame();

    const joined = await service.join({ gameId, connectionId: 'conn-x' });
    if (joined.kind !== 'player') {
      throw new Error('expected player');
    }

    await service.handleDisconnect({ connectionId: 'conn-x' });
    clock.set('2026-06-24T00:00:05.000Z');

    const reconnected = await service.reconnect({
      gameId,
      seatToken: joined.seatToken,
      connectionId: 'conn-x2',
    });

    expect(reconnected.seat).toBe('X');
    expect(reconnected.game.players.X?.connected).toBe(true);
  });

  it('rejects reconnect with an invalid seat token', async () => {
    const { service } = createTestHarness();
    const { gameId } = await service.createGame();
    await service.join({ gameId, connectionId: 'conn-x' });

    await expect(
      service.reconnect({
        gameId,
        seatToken: 'bad-token',
        connectionId: 'conn-x2',
      }),
    ).rejects.toThrowError(
      new ApplicationError('INVALID_SEAT_TOKEN', 'Seat token is invalid for this game'),
    );
  });

  it('enforces the global spectator limit', async () => {
    const { service } = createTestHarness({ config: { maxSpectators: 1 } });
    const { gameId } = await service.createGame();

    await service.join({ gameId, connectionId: 'conn-x' });
    await service.join({ gameId, connectionId: 'conn-o' });
    await service.watch({ gameId, connectionId: 'conn-s1' });

    await expect(
      service.watch({ gameId, connectionId: 'conn-s2' }),
    ).rejects.toThrowError(
      new ApplicationError('SPECTATOR_LIMIT_REACHED', 'Spectator limit reached for this game'),
    );
  });

  it('allows moves while the opponent is disconnected under continue policy', async () => {
    const { service, clock } = createTestHarness();
    const { gameId } = await service.createGame();

    await service.join({ gameId, connectionId: 'conn-x' });
    await service.join({ gameId, connectionId: 'conn-o' });

    await service.handleDisconnect({ connectionId: 'conn-o' });
    clock.set('2026-06-24T00:00:05.000Z');

    const afterMove = await service.applyMove({ gameId, seat: 'X', index: 4 });

    expect(afterMove.board[4]).toBe('X');
    expect(afterMove.players.O?.connected).toBe(false);
  });

  it('pauses moves when disconnect policy is pause and current player is offline', async () => {
    const { service, clock } = createTestHarness({
      config: { disconnectPolicy: 'pause' },
    });
    const { gameId } = await service.createGame();

    await service.join({ gameId, connectionId: 'conn-x' });
    await service.join({ gameId, connectionId: 'conn-o' });

    await service.handleDisconnect({ connectionId: 'conn-x' });
    clock.set('2026-06-24T00:00:05.000Z');

    await expect(service.applyMove({ gameId, seat: 'O', index: 4 })).rejects.toThrowError(
      new ApplicationError(
        'GAME_NOT_ACTIVE',
        'Game is paused until the current player reconnects',
      ),
    );
  });

  it('marks a player offline on disconnect and broadcasts the update', async () => {
    const { service, broadcaster } = createTestHarness();
    const { gameId } = await service.createGame();

    await service.join({ gameId, connectionId: 'conn-x' });
    await service.join({ gameId, connectionId: 'conn-o' });

    await service.handleDisconnect({ connectionId: 'conn-x' });

    expect(broadcaster.lastGameState(gameId)?.players.X?.connected).toBe(false);
  });

  it('removes spectators on disconnect without touching game state', async () => {
    const { service } = createTestHarness({ config: { maxSpectators: 1 } });
    const { gameId } = await service.createGame();

    await service.join({ gameId, connectionId: 'conn-x' });
    await service.join({ gameId, connectionId: 'conn-o' });
    await service.watch({ gameId, connectionId: 'conn-s1' });

    await service.handleDisconnect({ connectionId: 'conn-s1' });

    await expect(
      service.watch({ gameId, connectionId: 'conn-s2' }),
    ).resolves.toMatchObject({ game: expect.objectContaining({ id: gameId }) });
  });

  it('purges expired games and clears live connections for them', async () => {
    const { service, repository, clock } = createTestHarness({
      startTime: '2026-06-01T00:00:00.000Z',
    });

    const { gameId } = await service.createGame();
    await service.join({ gameId, connectionId: 'conn-x' });

    clock.set('2026-06-10T00:00:00.000Z');
    const deleted = await service.purgeExpiredGames(7 * 24 * 60 * 60 * 1000, 500);

    expect(deleted).toEqual(['game-1']);
    expect(repository.size()).toBe(0);
    await expect(service.getPublicState(gameId)).resolves.toBeNull();
  });

  it('maps domain move errors to protocol-facing application errors', async () => {
    const { service } = createTestHarness();
    const { gameId } = await service.createGame();

    await service.join({ gameId, connectionId: 'conn-x' });
    await service.join({ gameId, connectionId: 'conn-o' });

    await expect(service.applyMove({ gameId, seat: 'O', index: 0 })).rejects.toThrowError(
      new ApplicationError('NOT_YOUR_TURN', "It is not O's turn"),
    );
  });

  it('returns null from getPublicState when the game does not exist', async () => {
    const { service } = createTestHarness();

    await expect(service.getPublicState('missing')).resolves.toBeNull();
  });
});
