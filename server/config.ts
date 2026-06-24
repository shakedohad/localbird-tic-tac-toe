import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { GameServiceConfig } from './application/index.js';

export interface ServerConfig extends GameServiceConfig {
  host: string;
  port: number;
  databasePath: string;
  gameTtlMs: number;
  cleanupIntervalMs: number;
  purgeBatchSize: number;
  publicBaseUrl: string;
  handshakeTimeoutMs: number;
  idleTimeoutMs: number;
  maxConnections: number | null;
  maxGamesPerMinute: number | null;
}

const DEFAULT_GAME_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const DEFAULT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_HANDSHAKE_TIMEOUT_MS = 30_000;
const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_PURGE_BATCH_SIZE = 500;

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${name} must be an integer`);
  }

  return value;
}

function readOptionalInt(name: string): number | null {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return null;
  }

  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${name} must be an integer`);
  }

  return value;
}

function readDisconnectPolicy(): GameServiceConfig['disconnectPolicy'] {
  const raw = process.env.DISCONNECT_POLICY ?? 'continue';
  if (raw === 'continue' || raw === 'pause') {
    return raw;
  }

  throw new Error('DISCONNECT_POLICY must be "continue" or "pause"');
}

export function loadConfig(): ServerConfig {
  const port = readInt('PORT', 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  const databasePath = process.env.DATABASE_PATH ?? './data/games.db';
  const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`;

  mkdirSync(dirname(databasePath), { recursive: true });

  return {
    host,
    port,
    databasePath,
    publicBaseUrl,
    gameTtlMs: readInt('GAME_TTL_MS', DEFAULT_GAME_TTL_MS),
    cleanupIntervalMs: readInt('CLEANUP_INTERVAL_MS', DEFAULT_CLEANUP_INTERVAL_MS),
    purgeBatchSize: readInt('PURGE_BATCH_SIZE', DEFAULT_PURGE_BATCH_SIZE),
    handshakeTimeoutMs: readInt('HANDSHAKE_TIMEOUT_MS', DEFAULT_HANDSHAKE_TIMEOUT_MS),
    idleTimeoutMs: readInt('IDLE_TIMEOUT_MS', DEFAULT_IDLE_TIMEOUT_MS),
    maxConnections: readOptionalInt('MAX_CONNECTIONS'),
    maxGamesPerMinute: readOptionalInt('MAX_GAMES_PER_MINUTE'),
    maxSpectators: readOptionalInt('MAX_SPECTATORS'),
    disconnectPolicy: readDisconnectPolicy(),
  };
}
