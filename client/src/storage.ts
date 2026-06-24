const PREFIX = 'tictactoe:seat:';

export function loadSeatToken(gameId: string): string | null {
  try {
    return localStorage.getItem(`${PREFIX}${gameId}`);
  } catch {
    return null;
  }
}

export function saveSeatToken(gameId: string, seatToken: string): void {
  try {
    localStorage.setItem(`${PREFIX}${gameId}`, seatToken);
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function clearSeatToken(gameId: string): void {
  try {
    localStorage.removeItem(`${PREFIX}${gameId}`);
  } catch {
    // Ignore storage errors.
  }
}
