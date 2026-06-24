import { useState } from 'react';
import { createGame } from '../api';

export function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateGame() {
    setLoading(true);
    setError(null);

    try {
      const { gameId } = await createGame();
      window.location.assign(`/game/${gameId}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="card hero">
        <h1>Tic Tac Toe</h1>
        <p>Create a game and share the link with a friend.</p>
        <button
          type="button"
          className="primary-button"
          disabled={loading}
          onClick={() => void handleCreateGame()}
        >
          {loading ? 'Creating…' : 'New game'}
        </button>
        {error !== null ? <p className="error-text">{error}</p> : null}
      </div>
    </main>
  );
}
