import {
  createEmptyBoard,
  detectDraw,
  detectWin,
  getOpponent,
  isValidCellIndex,
  withCell,
} from './board.js';
import { DomainError } from './errors.js';
import type { GameState, SeatState, Symbol } from './types.js';

export interface AssignSeatParams {
  seat: Symbol;
  seatTokenHash: string;
  displayName?: string | null;
}

export function createInitialState(id: string, updatedAt: string): GameState {
  return {
    id,
    status: 'waiting',
    board: createEmptyBoard(),
    currentTurn: 'X',
    winner: null,
    winningLine: null,
    version: 0,
    updatedAt,
    players: {
      X: null,
      O: null,
    },
  };
}

export function assignSeat(
  state: GameState,
  params: AssignSeatParams,
  updatedAt: string,
): GameState {
  if (state.status === 'finished') {
    throw new DomainError('GAME_FINISHED', 'Cannot assign a seat on a finished game');
  }

  if (state.players[params.seat] !== null) {
    throw new DomainError('SEAT_ALREADY_TAKEN', `Seat ${params.seat} is already taken`);
  }

  if (params.seat === 'O' && state.players.X === null) {
    throw new DomainError('INVALID_SEAT_ORDER', 'Seat X must be assigned before seat O');
  }

  const seat: SeatState = {
    seatTokenHash: params.seatTokenHash,
    displayName: params.displayName ?? null,
    connected: true,
    lastConnectedAt: updatedAt,
  };

  const players = {
    ...state.players,
    [params.seat]: seat,
  };

  const status = params.seat === 'O' ? 'active' : state.status;

  return withMeta(state, {
    status,
    players,
    updatedAt,
  });
}

export function setSeatConnected(
  state: GameState,
  seat: Symbol,
  connected: boolean,
  updatedAt: string,
): GameState {
  const existing = state.players[seat];
  if (existing === null) {
    throw new DomainError('SEAT_NOT_ASSIGNED', `Seat ${seat} is not assigned`);
  }

  const lastConnectedAt = connected ? updatedAt : existing.lastConnectedAt;

  return withMeta(state, {
    players: {
      ...state.players,
      [seat]: {
        ...existing,
        connected,
        lastConnectedAt,
      },
    },
    updatedAt,
  });
}

export function applyMove(
  state: GameState,
  seat: Symbol,
  index: number,
  updatedAt: string,
): GameState {
  if (state.status !== 'active') {
    throw new DomainError('GAME_NOT_ACTIVE', 'Moves are only allowed while the game is active');
  }

  if (state.players[seat] === null) {
    throw new DomainError('SEAT_NOT_ASSIGNED', `Seat ${seat} is not assigned`);
  }

  if (seat !== state.currentTurn) {
    throw new DomainError('NOT_YOUR_TURN', `It is not ${seat}'s turn`);
  }

  if (!isValidCellIndex(index)) {
    throw new DomainError('INVALID_MOVE', `Cell index must be between 0 and 8, got ${index}`);
  }

  if (state.board[index] !== null) {
    throw new DomainError('CELL_OCCUPIED', `Cell ${index} is already occupied`);
  }

  const board = withCell(state.board, index, seat);
  const win = detectWin(board);

  if (win !== null) {
    return withMeta(state, {
      status: 'finished',
      board,
      winner: win.winner,
      winningLine: win.winningLine,
      updatedAt,
    });
  }

  if (detectDraw(board)) {
    return withMeta(state, {
      status: 'finished',
      board,
      winner: 'draw',
      winningLine: null,
      updatedAt,
    });
  }

  return withMeta(state, {
    board,
    currentTurn: getOpponent(seat),
    updatedAt,
  });
}

function withMeta(
  state: GameState,
  patch: Partial<
    Pick<
      GameState,
      | 'status'
      | 'board'
      | 'currentTurn'
      | 'winner'
      | 'winningLine'
      | 'players'
      | 'updatedAt'
    >
  >,
): GameState {
  return {
    ...state,
    ...patch,
    version: state.version + 1,
  };
}

export function findSeatByTokenHash(
  state: GameState,
  seatTokenHash: string,
): Symbol | null {
  if (state.players.X?.seatTokenHash === seatTokenHash) {
    return 'X';
  }

  if (state.players.O?.seatTokenHash === seatTokenHash) {
    return 'O';
  }

  return null;
}
