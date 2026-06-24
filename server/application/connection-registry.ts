import type { Symbol } from '../domain/index.js';

export type ConnectionRole =
  | { role: 'player'; gameId: string; seat: Symbol }
  | { role: 'spectator'; gameId: string };

export class ConnectionRegistry {
  private readonly connections = new Map<string, ConnectionRole>();
  private readonly spectatorsByGame = new Map<string, Set<string>>();
  private readonly playerConnectionBySeat = new Map<string, string>();

  register(connectionId: string, entry: ConnectionRole): void {
    this.unregister(connectionId);

    if (entry.role === 'player') {
      const seatKey = playerSeatKey(entry.gameId, entry.seat);
      const existingConnectionId = this.playerConnectionBySeat.get(seatKey);
      if (existingConnectionId !== undefined && existingConnectionId !== connectionId) {
        this.unregister(existingConnectionId);
      }
      this.playerConnectionBySeat.set(seatKey, connectionId);
    }

    this.connections.set(connectionId, entry);

    if (entry.role === 'spectator') {
      this.addSpectator(entry.gameId, connectionId);
    }
  }

  unregister(connectionId: string): ConnectionRole | undefined {
    const existing = this.connections.get(connectionId);
    if (existing === undefined) {
      return undefined;
    }

    this.connections.delete(connectionId);

    if (existing.role === 'player') {
      const seatKey = playerSeatKey(existing.gameId, existing.seat);
      if (this.playerConnectionBySeat.get(seatKey) === connectionId) {
        this.playerConnectionBySeat.delete(seatKey);
      }
    }

    if (existing.role === 'spectator') {
      this.removeSpectator(existing.gameId, connectionId);
    }

    return existing;
  }

  get(connectionId: string): ConnectionRole | undefined {
    return this.connections.get(connectionId);
  }

  spectatorCount(gameId: string): number {
    return this.spectatorsByGame.get(gameId)?.size ?? 0;
  }

  clearGame(gameId: string): void {
    const spectators = this.spectatorsByGame.get(gameId);
    if (spectators !== undefined) {
      for (const connectionId of spectators) {
        this.connections.delete(connectionId);
      }
      this.spectatorsByGame.delete(gameId);
    }

    for (const [connectionId, entry] of this.connections) {
      if (entry.gameId === gameId) {
        this.connections.delete(connectionId);
      }
    }

    for (const seatKey of [...this.playerConnectionBySeat.keys()]) {
      if (seatKey.startsWith(`${gameId}:`)) {
        this.playerConnectionBySeat.delete(seatKey);
      }
    }
  }

  private addSpectator(gameId: string, connectionId: string): void {
    let spectators = this.spectatorsByGame.get(gameId);
    if (spectators === undefined) {
      spectators = new Set();
      this.spectatorsByGame.set(gameId, spectators);
    }
    spectators.add(connectionId);
  }

  private removeSpectator(gameId: string, connectionId: string): void {
    const spectators = this.spectatorsByGame.get(gameId);
    if (spectators === undefined) {
      return;
    }

    spectators.delete(connectionId);
    if (spectators.size === 0) {
      this.spectatorsByGame.delete(gameId);
    }
  }
}

function playerSeatKey(gameId: string, seat: Symbol): string {
  return `${gameId}:${seat}`;
}
