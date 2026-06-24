import { describe, expect, it } from 'vitest';
import { CryptoTokenGenerator } from './token-generator.js';

describe('CryptoTokenGenerator', () => {
  it('hashes and verifies seat tokens', () => {
    const generator = new CryptoTokenGenerator();
    const token = generator.generate();
    const hash = generator.hash(token);

    expect(hash).not.toContain(token);
    expect(generator.verify(token, hash)).toBe(true);
    expect(generator.verify('wrong-token', hash)).toBe(false);
  });
});
