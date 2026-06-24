export const SCHEMA = `
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_games_updated_at ON games(updated_at);
`;
