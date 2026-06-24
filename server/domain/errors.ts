export type DomainErrorCode =
  | 'SEAT_ALREADY_TAKEN'
  | 'SEAT_NOT_ASSIGNED'
  | 'INVALID_SEAT_ORDER'
  | 'GAME_FINISHED'
  | 'GAME_NOT_ACTIVE'
  | 'NOT_YOUR_TURN'
  | 'INVALID_MOVE'
  | 'CELL_OCCUPIED';

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}
