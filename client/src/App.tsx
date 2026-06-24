import { Route, Routes, useParams } from 'react-router-dom';
import { GamePage } from './pages/GamePage';
import { HomePage } from './pages/HomePage';

function GameRoute() {
  const { gameId } = useParams<{ gameId: string }>();

  if (gameId === undefined || gameId.trim() === '') {
    return (
      <main className="page">
        <div className="card">
          <p className="error-text">Invalid game link.</p>
        </div>
      </main>
    );
  }

  return <GamePage gameId={gameId} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/game/:gameId" element={<GameRoute />} />
    </Routes>
  );
}
