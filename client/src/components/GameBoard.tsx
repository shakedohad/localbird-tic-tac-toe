import type { PublicGameState, Symbol } from '../types';

interface GameBoardProps {
  game: PublicGameState;
  seat: Symbol | null;
  role: 'player' | 'spectator' | null;
  onMove: (index: number) => void;
}

export function GameBoard({ game, seat, role, onMove }: GameBoardProps) {
  const canMove =
    role === 'player' &&
    seat !== null &&
    game.status === 'active' &&
    game.currentTurn === seat;

  return (
    <div className="board" role="grid" aria-label="Tic tac toe board">
      {game.board.map((cell, index) => {
        const isWinner = game.winningLine?.includes(index) ?? false;
        const isPlayable = canMove && cell === null;

        return (
          <button
            key={index}
            type="button"
            className={`cell ${cell !== null ? `cell-${cell.toLowerCase()}` : ''} ${
              isWinner ? 'cell-win' : ''
            }`}
            disabled={!isPlayable}
            aria-label={
              cell === null ? `Empty cell ${index + 1}` : `Cell ${index + 1}, ${cell}`
            }
            onClick={() => onMove(index)}
          >
            {cell ?? ''}
          </button>
        );
      })}
    </div>
  );
}
