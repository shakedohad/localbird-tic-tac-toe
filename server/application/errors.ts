import type { ProtocolErrorCode } from '../contracts/index.js';

export class ApplicationError extends Error {
  readonly code: ProtocolErrorCode;

  constructor(code: ProtocolErrorCode, message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
  }
}
