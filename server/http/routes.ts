import type { FastifyInstance } from 'fastify';
import type { GameService } from '../application/index.js';
import type { GameRepository } from '../contracts/index.js';
import type { ServerConfig } from '../config.js';
import type { ConnectionManager } from '../ws/connection-manager.js';
import { SlidingWindowRateLimiter } from './rate-limiter.js';

export async function registerHttpRoutes(
  fastify: FastifyInstance,
  deps: {
    gameService: GameService;
    repository: GameRepository;
    connections: ConnectionManager;
    config: ServerConfig;
  },
): Promise<void> {
  const createGameLimiter =
    deps.config.maxGamesPerMinute === null
      ? null
      : new SlidingWindowRateLimiter(deps.config.maxGamesPerMinute, 60_000);

  fastify.get('/health', async () => ({
    ok: true,
    connections: deps.connections.getStats(),
    games: {
      stored: await deps.repository.count(),
    },
  }));

  fastify.post(
    '/games',
    {
      schema: {
        response: {
          201: {
            type: 'object',
            required: ['gameId', 'url'],
            properties: {
              gameId: { type: 'string' },
              url: { type: 'string' },
            },
          },
          429: {
            type: 'object',
            required: ['error'],
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      if (createGameLimiter !== null && !createGameLimiter.tryAccept()) {
        return reply.code(429).send({ error: 'Too many games created. Try again later.' });
      }

      const { gameId } = await deps.gameService.createGame();
      const url = `${deps.config.publicBaseUrl}/game/${gameId}`;
      return reply.code(201).send({ gameId, url });
    },
  );
}
