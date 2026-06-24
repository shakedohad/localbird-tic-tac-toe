import { randomUUID } from 'node:crypto';
import type { IdGenerator } from './contracts/index.js';

export class CryptoIdGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
