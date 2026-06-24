import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame } from '../api';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { GameBoard } from '../components/GameBoard';
import { GameStatusPanel } from '../components/GameStatusPanel';
import { useGameSocket } from '../hooks/useGameSocket';

interface GamePageProps {
  gameId: string;
}

export function GamePage({ gameId }: GamePageProps) {
  const navigate = useNavigate();
  const { status, game, role, seat, error, makeMove, clearError } = useGameSocket(gameId);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const isFinished = game?.status === 'finished';

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  }

  async function handleNewGame() {
    setCreating(true);
    try {
      const { gameId: newGameId } = await createGame();
      setCreating(false);
      navigate(`/game/${newGameId}`);
    } catch {
      setCreating(false);
    }
  }

  return (
    <>
      <ConnectionBanner status={status} />
      <main className="page">
        <div className="card game-card">
          <div className="game-header">
            <h1>Game</h1>
            <button
              type="button"
              className="secondary-button"
              disabled={creating}
              onClick={() => void (isFinished ? handleNewGame() : handleCopyLink())}
            >
              {isFinished
                ? creating
                  ? 'Creating…'
                  : 'New game'
                : copied
                  ? 'Copied!'
                  : 'Copy link'}
            </button>
          </div>

          {game !== null ? (
            <>
              <GameStatusPanel game={game} role={role} seat={seat} />
              <GameBoard game={game} role={role} seat={seat} onMove={makeMove} />
            </>
          ) : (
            <p className="loading-text">Loading game…</p>
          )}

          {error !== null ? (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button type="button" className="text-button" onClick={clearError}>
                Dismiss
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
