export interface TokenGenerator {
  generate(): string;
  hash(token: string): string;
  verify(token: string, hash: string): boolean;
}
