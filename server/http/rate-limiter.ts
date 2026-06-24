export class SlidingWindowRateLimiter {
  private readonly timestamps: number[] = [];

  constructor(private readonly maxEvents: number, private readonly windowMs: number) {}

  tryAccept(now: number = Date.now()): boolean {
    const windowStart = now - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0]! < windowStart) {
      this.timestamps.shift();
    }

    if (this.timestamps.length >= this.maxEvents) {
      return false;
    }

    this.timestamps.push(now);
    return true;
  }
}
