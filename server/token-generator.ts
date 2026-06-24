import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { TokenGenerator } from './contracts/index.js';

const KEY_LENGTH = 32;

export class CryptoTokenGenerator implements TokenGenerator {
  generate(): string {
    return randomBytes(32).toString('base64url');
  }

  hash(token: string): string {
    const salt = randomBytes(16).toString('base64url');
    const derived = scryptSync(token, salt, KEY_LENGTH).toString('base64url');
    return `${salt}.${derived}`;
  }

  verify(token: string, storedHash: string): boolean {
    const [salt, expected] = storedHash.split('.');
    if (salt === undefined || expected === undefined) {
      return false;
    }

    const actual = scryptSync(token, salt, KEY_LENGTH).toString('base64url');
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(actual);

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, actualBuffer);
  }
}
