import { randomUUID } from 'node:crypto';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';
import { GameService } from './application/index.js';
import type { ServerConfig } from './config.js';
import { startCleanupScheduler } from './cleanup/cleanup-scheduler.js';
import { registerHttpRoutes } from './http/routes.js';
import { registerClientStatic } from './http/static.js';
import { CryptoIdGenerator } from './id-generator.js';
import { SqliteGameRepository } from './persistence/sqlite-game-repository.js';
import { CryptoTokenGenerator } from './token-generator.js';
import { ConnectionManager } from './ws/connection-manager.js';
import { WebSocketBroadcaster } from './ws/ws-broadcaster.js';
import { WebSocketHandler } from './ws/ws-handler.js';

export interface AppContext {
  fastify: ReturnType<typeof Fastify>;
  gameService: GameService;
  repository: SqliteGameRepository;
  connections: ConnectionManager;
  stopCleanup: () => void;
}

export async function createApp(config: ServerConfig): Promise<AppContext> {
  const repository = new SqliteGameRepository(config.databasePath);
  let handleConnectionClose: (connectionId: string) => Promise<void> = async () => {};

  const connections = new ConnectionManager({
    handshakeTimeoutMs: config.handshakeTimeoutMs,
    idleTimeoutMs: config.idleTimeoutMs,
    onIdleTimeout: (connectionId) => {
      void handleConnectionClose(connectionId);
    },
  });

  const broadcaster = new WebSocketBroadcaster(connections);
  const gameService = new GameService({
    repository,
    broadcaster,
    idGenerator: new CryptoIdGenerator(),
    tokenGenerator: new CryptoTokenGenerator(),
    clock: () => new Date().toISOString(),
    config: {
      maxSpectators: config.maxSpectators,
      disconnectPolicy: config.disconnectPolicy,
    },
  });

  const wsHandler = new WebSocketHandler(gameService, connections);
  handleConnectionClose = (connectionId) => wsHandler.handleClose(connectionId);

  const fastify = Fastify({ logger: true });

  await fastify.register(websocket);
  await registerHttpRoutes(fastify, {
    gameService,
    repository,
    connections,
    config,
  });

  fastify.get('/ws', { websocket: true }, (socket) => {
    if (config.maxConnections !== null && connections.size() >= config.maxConnections) {
      socket.close(1013, 'Server at capacity');
      return;
    }

    const connectionId = randomUUID();
    connections.create(connectionId, socket);

    socket.on('message', (raw) => {
      connections.touch(connectionId);
      let payload: unknown;
      try {
        payload = parseRawMessage(raw);
      } catch {
        void wsHandler.handleMessage(connectionId, raw);
        return;
      }
      void wsHandler.handleMessage(connectionId, payload);
    });

    socket.on('close', () => {
      void wsHandler.handleClose(connectionId);
    });

    socket.on('error', () => {
      void wsHandler.handleClose(connectionId);
    });
  });

  const stopCleanup = startCleanupScheduler({
    gameService,
    connectionManager: connections,
    gameTtlMs: config.gameTtlMs,
    intervalMs: config.cleanupIntervalMs,
    purgeBatchSize: config.purgeBatchSize,
  });

  const clientEnabled = await registerClientStatic(fastify);
  if (clientEnabled) {
    fastify.log.info('Serving client from client/dist');
  }

  return { fastify, gameService, repository, connections, stopCleanup };
}

export async function startServer(config: ServerConfig): Promise<AppContext> {
  const app = await createApp(config);
  await app.fastify.listen({ host: config.host, port: config.port });
  return app;
}

function parseRawMessage(raw: unknown): unknown {
  if (typeof raw === 'string') {
    return JSON.parse(raw);
  }

  if (raw instanceof Buffer) {
    return JSON.parse(raw.toString('utf8'));
  }

  return JSON.parse(String(raw));
}
