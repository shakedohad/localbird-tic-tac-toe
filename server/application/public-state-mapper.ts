import type { GameState, SeatState } from '../domain/index.js';
import type { PublicGameState, PublicSeat } from '../contracts/index.js';

function toPublicSeat(seat: SeatState): PublicSeat {
  return {
    displayName: seat.displayName,
    connected: seat.connected,
  };
}

export function toPublicGameState(state: GameState): PublicGameState {
  return {
    id: state.id,
    status: state.status,
    board: state.board,
    currentTurn: state.currentTurn,
    winner: state.winner,
    winningLine: state.winningLine,
    version: state.version,
    players: {
      X: state.players.X ? toPublicSeat(state.players.X) : null,
      O: state.players.O ? toPublicSeat(state.players.O) : null,
    },
  };
}
