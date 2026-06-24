import { describe, expect, it } from 'vitest';
import { DomainError } from './errors.js';
import {
  applyMove,
  assignSeat,
  createInitialState,
  findSeatByTokenHash,
  setSeatConnected,
} from './game.js';
import type { GameState } from './types.js';

const GAME_ID = 'game-1';
const T0 = '2026-06-24T00:00:00.000Z';
const T1 = '2026-06-24T00:00:01.000Z';
const T2 = '2026-06-24T00:00:02.000Z';
const HASH_X = 'hash-x';
const HASH_O = 'hash-o';

function withBothPlayers(state: GameState, updatedAt: string = T1): GameState {
  const withX = assignSeat(state, { seat: 'X', seatTokenHash: HASH_X }, updatedAt);
  return assignSeat(withX, { seat: 'O', seatTokenHash: HASH_O }, updatedAt);
}

function finishedGame(): GameState {
  let state = withBothPlayers(createInitialState(GAME_ID, T0), T1);
  state = applyMove(state, 'X', 0, T2);
  state = applyMove(state, 'O', 3, T2);
  state = applyMove(state, 'X', 1, T2);
  state = applyMove(state, 'O', 4, T2);
  state = applyMove(state, 'X', 2, T2);
  return state;
}

describe('createInitialState', () => {
  it('starts in waiting status with an empty board', () => {
    const state = createInitialState(GAME_ID, T0);

    expect(state).toEqual({
      id: GAME_ID,
      status: 'waiting',
      board: [null, null, null, null, null, null, null, null, null],
      currentTurn: 'X',
      winner: null,
      winningLine: null,
      version: 0,
      updatedAt: T0,
      players: { X: null, O: null },
    });
  });
});

describe('assignSeat', () => {
  it('assigns X while the game remains waiting', () => {
    const state = createInitialState(GAME_ID, T0);
    const next = assignSeat(
      state,
      { seat: 'X', seatTokenHash: HASH_X, displayName: 'Alice' },
      T1,
    );

    expect(next.status).toBe('waiting');
    expect(next.players.X).toEqual({
      seatTokenHash: HASH_X,
      displayName: 'Alice',
      connected: true,
      lastConnectedAt: T1,
    });
    expect(next.version).toBe(1);
    expect(next.updatedAt).toBe(T1);
  });

  it('assigns O and activates the game', () => {
    const state = assignSeat(
      createInitialState(GAME_ID, T0),
      { seat: 'X', seatTokenHash: HASH_X },
      T1,
    );
    const next = assignSeat(state, { seat: 'O', seatTokenHash: HASH_O }, T2);

    expect(next.status).toBe('active');
    expect(next.players.O?.seatTokenHash).toBe(HASH_O);
    expect(next.version).toBe(2);
  });

  it('rejects assigning O before X', () => {
    const state = createInitialState(GAME_ID, T0);

    expect(() =>
      assignSeat(state, { seat: 'O', seatTokenHash: HASH_O }, T1),
    ).toThrowError(new DomainError('INVALID_SEAT_ORDER', 'Seat X must be assigned before seat O'));
  });

  it('rejects assigning a seat that is already taken', () => {
    const state = assignSeat(
      createInitialState(GAME_ID, T0),
      { seat: 'X', seatTokenHash: HASH_X },
      T1,
    );

    expect(() =>
      assignSeat(state, { seat: 'X', seatTokenHash: 'other-hash' }, T2),
    ).toThrowError(new DomainError('SEAT_ALREADY_TAKEN', 'Seat X is already taken'));
  });

  it('rejects seat assignment on a finished game', () => {
    const state = finishedGame();

    expect(state.status).toBe('finished');
    expect(() =>
      assignSeat(state, { seat: 'O', seatTokenHash: 'new-hash' }, T2),
    ).toThrowError(new DomainError('GAME_FINISHED', 'Cannot assign a seat on a finished game'));
  });
});

describe('setSeatConnected', () => {
  it('updates connection state for an assigned seat', () => {
    const state = assignSeat(
      createInitialState(GAME_ID, T0),
      { seat: 'X', seatTokenHash: HASH_X },
      T1,
    );

    const disconnected = setSeatConnected(state, 'X', false, T2);
    expect(disconnected.players.X?.connected).toBe(false);
    expect(disconnected.players.X?.lastConnectedAt).toBe(T1);

    const reconnected = setSeatConnected(disconnected, 'X', true, T2);
    expect(reconnected.players.X?.connected).toBe(true);
    expect(reconnected.players.X?.lastConnectedAt).toBe(T2);
  });

  it('rejects updates for an unassigned seat', () => {
    const state = createInitialState(GAME_ID, T0);

    expect(() => setSeatConnected(state, 'X', true, T1)).toThrowError(
      new DomainError('SEAT_NOT_ASSIGNED', 'Seat X is not assigned'),
    );
  });
});

describe('applyMove', () => {
  it('applies valid alternating moves', () => {
    let state = withBothPlayers(createInitialState(GAME_ID, T0), T1);

    state = applyMove(state, 'X', 4, T2);
    expect(state.board[4]).toBe('X');
    expect(state.currentTurn).toBe('O');
    expect(state.status).toBe('active');
    expect(state.version).toBe(3);

    state = applyMove(state, 'O', 0, T2);
    expect(state.board[0]).toBe('O');
    expect(state.currentTurn).toBe('X');
  });

  it('finishes with a winner and winning line', () => {
    let state = withBothPlayers(createInitialState(GAME_ID, T0), T1);

    state = applyMove(state, 'X', 0, T2);
    state = applyMove(state, 'O', 3, T2);
    state = applyMove(state, 'X', 1, T2);
    state = applyMove(state, 'O', 4, T2);
    state = applyMove(state, 'X', 2, T2);

    expect(state.status).toBe('finished');
    expect(state.winner).toBe('X');
    expect(state.winningLine).toEqual([0, 1, 2]);
  });

  it('finishes with a draw', () => {
    let state = withBothPlayers(createInitialState(GAME_ID, T0), T1);

    const moves: Array<[typeof state.currentTurn, number]> = [
      ['X', 0],
      ['O', 1],
      ['X', 2],
      ['O', 4],
      ['X', 3],
      ['O', 5],
      ['X', 7],
      ['O', 6],
      ['X', 8],
    ];

    for (const [seat, index] of moves) {
      state = applyMove(state, seat, index, T2);
    }

    expect(state.status).toBe('finished');
    expect(state.winner).toBe('draw');
    expect(state.winningLine).toBeNull();
  });

  it('rejects moves when the game is not active', () => {
    const waiting = createInitialState(GAME_ID, T0);

    expect(() => applyMove(waiting, 'X', 0, T1)).toThrowError(
      new DomainError('GAME_NOT_ACTIVE', 'Moves are only allowed while the game is active'),
    );
  });

  it('rejects moves on a finished game', () => {
    const state = finishedGame();

    expect(state.status).toBe('finished');
    expect(() => applyMove(state, 'X', 5, T2)).toThrowError(
      new DomainError('GAME_NOT_ACTIVE', 'Moves are only allowed while the game is active'),
    );
  });

  it('rejects moves from an unassigned seat', () => {
    const state = withBothPlayers(createInitialState(GAME_ID, T0), T1);
    const withoutO = {
      ...state,
      players: { ...state.players, O: null },
    };

    expect(() => applyMove(withoutO, 'O', 0, T2)).toThrowError(
      new DomainError('SEAT_NOT_ASSIGNED', 'Seat O is not assigned'),
    );
  });

  it('rejects out-of-turn moves', () => {
    const state = withBothPlayers(createInitialState(GAME_ID, T0), T1);

    expect(() => applyMove(state, 'O', 0, T2)).toThrowError(
      new DomainError('NOT_YOUR_TURN', "It is not O's turn"),
    );
  });

  it('rejects invalid cell indices', () => {
    const state = withBothPlayers(createInitialState(GAME_ID, T0), T1);

    expect(() => applyMove(state, 'X', 9, T2)).toThrowError(
      new DomainError('INVALID_MOVE', 'Cell index must be between 0 and 8, got 9'),
    );
  });

  it('rejects moves onto occupied cells', () => {
    let state = withBothPlayers(createInitialState(GAME_ID, T0), T1);
    state = applyMove(state, 'X', 0, T2);

    expect(() => applyMove(state, 'O', 0, T2)).toThrowError(
      new DomainError('CELL_OCCUPIED', 'Cell 0 is already occupied'),
    );
  });
});

describe('immutability', () => {
  it('does not mutate the input state when assigning a seat', () => {
    const before = createInitialState(GAME_ID, T0);
    const snapshot = structuredClone(before);

    assignSeat(before, { seat: 'X', seatTokenHash: HASH_X }, T1);

    expect(before).toEqual(snapshot);
  });

  it('does not mutate the input state when applying a move', () => {
    const before = withBothPlayers(createInitialState(GAME_ID, T0), T1);
    const snapshot = structuredClone(before);

    applyMove(before, 'X', 4, T2);

    expect(before).toEqual(snapshot);
  });
});

describe('findSeatByTokenHash', () => {
  it('finds the seat matching a token hash', () => {
    const state = withBothPlayers(createInitialState(GAME_ID, T0), T1);

    expect(findSeatByTokenHash(state, HASH_X)).toBe('X');
    expect(findSeatByTokenHash(state, HASH_O)).toBe('O');
    expect(findSeatByTokenHash(state, 'missing')).toBeNull();
  });
});
