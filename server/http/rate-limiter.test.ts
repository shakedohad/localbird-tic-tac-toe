import { describe, expect, it } from 'vitest';
import { SlidingWindowRateLimiter } from './rate-limiter.js';

describe('SlidingWindowRateLimiter', () => {
  it('allows events up to the configured limit', () => {
    const limiter = new SlidingWindowRateLimiter(2, 60_000);

    expect(limiter.tryAccept(0)).toBe(true);
    expect(limiter.tryAccept(1_000)).toBe(true);
    expect(limiter.tryAccept(2_000)).toBe(false);
  });

  it('expires events outside the window', () => {
    const limiter = new SlidingWindowRateLimiter(1, 10_000);

    expect(limiter.tryAccept(0)).toBe(true);
    expect(limiter.tryAccept(5_000)).toBe(false);
    expect(limiter.tryAccept(10_001)).toBe(true);
  });
});
