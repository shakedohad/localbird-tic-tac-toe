import type { ProtocolErrorCode } from '../contracts/index.js';
import { ApplicationError } from '../application/index.js';

export function isRecoverableError(code: ProtocolErrorCode): boolean {
  switch (code) {
    case 'INVALID_MESSAGE':
    case 'UNAUTHENTICATED':
    case 'NOT_YOUR_TURN':
    case 'INVALID_MOVE':
    case 'ALREADY_CONNECTED':
    case 'INTERNAL_ERROR':
      return true;
    default:
      return false;
  }
}

export function toApplicationError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) {
    return error;
  }

  return new ApplicationError('INTERNAL_ERROR', 'Unexpected server error');
}
