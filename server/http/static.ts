import { existsSync } from 'node:fs';
import { join } from 'node:path';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';

export async function registerClientStatic(fastify: FastifyInstance): Promise<boolean> {
  const clientDist = join(process.cwd(), 'client', 'dist');

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
