import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';

/** Repo root — stable even when process.cwd() is server/ (e.g. some deploy configs). */
export function getClientDistPath(): string {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  return join(repoRoot, 'client', 'dist');
}

export function isClientDistAvailable(): boolean {
  return existsSync(getClientDistPath());
}

export async function registerClientStatic(fastify: FastifyInstance): Promise<boolean> {
  const clientDist = getClientDistPath();

  if (!existsSync(clientDist)) {
    return false;
  }

  await fastify.register(fastifyStatic, {
    root: clientDist,
    prefix: '/',
  });

  fastify.setNotFoundHandler((request, reply) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return reply.code(404).send({ error: 'Not found' });
    }

    if (
      request.url.startsWith('/games') ||
      request.url.startsWith('/health') ||
      request.url.startsWith('/ws')
    ) {
      return reply.code(404).send({ error: 'Not found' });
    }

    return reply.sendFile('index.html');
  });

  return true;
}
