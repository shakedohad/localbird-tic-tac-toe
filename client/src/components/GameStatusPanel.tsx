import type { PublicGameState, Symbol } from '../types';

interface GameStatusProps {
  game: PublicGameState;
  role: 'player' | 'spectator' | null;
  seat: Symbol | null;
}

function finishedHeadline(
  game: PublicGameState,
  role: 'player' | 'spectator' | null,
  seat: Symbol | null,
): string {
  if (game.winner === 'draw') {
    return 'Draw';
  }

  if (game.winner === null) {
    return 'Game over';
  }

  if (role === 'player' && seat !== null) {
    return game.winner === seat ? 'You win!' : 'You lose';
  }

  return `${game.winner} won`;
}

export function GameStatusPanel({ game, role, seat }: GameStatusProps) {
  let headline = 'Waiting for opponent…';

  if (game.status === 'active') {
    if (role === 'player' && seat === game.currentTurn) {
      headline = 'Your turn';
    } else if (role === 'player') {
      headline = "Opponent's turn";
    } else {
      headline = `${game.currentTurn}'s turn`;
    }
  }

  if (game.status === 'finished') {
    headline = finishedHeadline(game, role, seat);
  }

  const xConnected = game.players.X?.connected ?? false;
  const oConnected = game.players.O?.connected ?? false;

  return (
    <div className="game-status">
      <h2>{headline}</h2>
      <div className="game-status-meta">
        <div>
        {role === 'spectator' ? (
          'Spectating'
        ) : seat === 'X' ? (
          <>
            You are <span className="mark-x">X</span>
          </>
        ) : seat === 'O' ? (
          <>
            You are <span className="mark-o">O</span>
          </>
        ) : (
          'Joining…'
        )}
        </div>
        <div>
        <span className="mark-x">X</span> {xConnected ? 'online' : 'offline'}
        {' • '}
        <span className="mark-o">O</span> {oConnected ? 'online' : 'offline'}
        </div>
      </div>
    </div>
  );
}
