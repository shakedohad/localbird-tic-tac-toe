import type { WebSocket } from 'ws';
import type { ServerMessage } from '../contracts/index.js';
import type { Symbol } from '../domain/index.js';

export interface ConnectionRecord {
  socket: WebSocket;
  gameId: string | null;
  role: 'player' | 'spectator' | null;
  seat: Symbol | null;
  handshakeComplete: boolean;
  handshakeTimer?: ReturnType<typeof setTimeout>;
  idleTimer?: ReturnType<typeof setTimeout>;
}

export interface ConnectionManagerOptions {
  handshakeTimeoutMs: number;
  idleTimeoutMs: number;
  onHandshakeTimeout?: (connectionId: string) => void;
  onIdleTimeout?: (connectionId: string) => void;
}

export interface ConnectionStats {
  totalConnections: number;
  gamesWithConnections: number;
}

export class ConnectionManager {
  private readonly connections = new Map<string, ConnectionRecord>();
  private readonly gameConnections = new Map<string, Set<string>>();
  private readonly seatConnections = new Map<string, string>();

  constructor(private readonly options: ConnectionManagerOptions) {}

  create(connectionId: string, socket: WebSocket): void {
    this.connections.set(connectionId, {
      socket,
      gameId: null,
      role: null,
      seat: null,
      handshakeComplete: false,
    });
    this.scheduleHandshakeTimer(connectionId);
  }

  size(): number {
    return this.connections.size;
  }

  getStats(): ConnectionStats {
    return {
      totalConnections: this.connections.size,
      gamesWithConnections: this.gameConnections.size,
    };
  }

  get(connectionId: string): ConnectionRecord | undefined {
    return this.connections.get(connectionId);
  }

  has(connectionId: string): boolean {
    return this.connections.has(connectionId);
  }

  touch(connectionId: string): void {
    const record = this.connections.get(connectionId);
    if (record === undefined) {
      return;
    }

    if (record.handshakeComplete) {
      this.resetIdleTimer(connectionId);
    }
  }

  setPlayer(connectionId: string, gameId: string, seat: Symbol): void {
    const record = this.require(connectionId);
    record.gameId = gameId;
    record.role = 'player';
    record.seat = seat;
    record.handshakeComplete = true;
    this.addToGame(gameId, connectionId);
    this.seatConnections.set(seatKey(gameId, seat), connectionId);
    this.completeHandshake(connectionId);
  }

  setSpectator(connectionId: string, gameId: string): void {
    const record = this.require(connectionId);
    record.gameId = gameId;
    record.role = 'spectator';
    record.seat = null;
    record.handshakeComplete = true;
    this.addToGame(gameId, connectionId);
    this.completeHandshake(connectionId);
  }

  getPlayerConnectionId(gameId: string, seat: Symbol): string | undefined {
    return this.seatConnections.get(seatKey(gameId, seat));
  }

  supersedePlayerConnection(
    gameId: string,
    seat: Symbol,
    keepConnectionId: string,
  ): string | undefined {
    const existingId = this.getPlayerConnectionId(gameId, seat);
    if (existingId === undefined || existingId === keepConnectionId) {
      return undefined;
    }

    return existingId;
  }

  listGameConnectionIds(gameId: string): string[] {
    return [...(this.gameConnections.get(gameId) ?? [])];
  }

  evictGame(gameId: string): string[] {
    const connectionIds = this.listGameConnectionIds(gameId);
    for (const connectionId of connectionIds) {
      this.close(connectionId);
    }
    return connectionIds;
  }

  send(connectionId: string, message: ServerMessage): void {
    const record = this.connections.get(connectionId);
    if (record === undefined || record.socket.readyState !== record.socket.OPEN) {
      return;
    }

    record.socket.send(JSON.stringify(message));
  }

  close(connectionId: string): void {
    const record = this.connections.get(connectionId);
    if (record === undefined) {
      return;
    }

    this.detach(connectionId);
    if (record.socket.readyState === record.socket.OPEN) {
      record.socket.close();
    }
  }

  detach(connectionId: string): ConnectionRecord | undefined {
    const record = this.connections.get(connectionId);
    if (record === undefined) {
      return undefined;
    }

    this.clearTimers(record);
    this.connections.delete(connectionId);

    if (record.gameId !== null) {
      const gameSet = this.gameConnections.get(record.gameId);
      gameSet?.delete(connectionId);
      if (gameSet?.size === 0) {
        this.gameConnections.delete(record.gameId);
      }
    }

    if (record.gameId !== null && record.seat !== null) {
      const key = seatKey(record.gameId, record.seat);
      if (this.seatConnections.get(key) === connectionId) {
        this.seatConnections.delete(key);
      }
    }

    return record;
  }

  private completeHandshake(connectionId: string): void {
    const record = this.require(connectionId);
    if (record.handshakeTimer !== undefined) {
      clearTimeout(record.handshakeTimer);
      record.handshakeTimer = undefined;
    }
    this.resetIdleTimer(connectionId);
  }

  private scheduleHandshakeTimer(connectionId: string): void {
    if (this.options.handshakeTimeoutMs <= 0) {
      return;
    }

    const record = this.require(connectionId);
    record.handshakeTimer = setTimeout(() => {
      this.options.onHandshakeTimeout?.(connectionId);
      this.close(connectionId);
    }, this.options.handshakeTimeoutMs);
  }

  private resetIdleTimer(connectionId: string): void {
    if (this.options.idleTimeoutMs <= 0) {
      return;
    }

    const record = this.require(connectionId);
    if (record.idleTimer !== undefined) {
      clearTimeout(record.idleTimer);
    }

    record.idleTimer = setTimeout(() => {
      this.options.onIdleTimeout?.(connectionId);
      this.close(connectionId);
    }, this.options.idleTimeoutMs);
  }

  private clearTimers(record: ConnectionRecord): void {
    if (record.handshakeTimer !== undefined) {
      clearTimeout(record.handshakeTimer);
      record.handshakeTimer = undefined;
    }
    if (record.idleTimer !== undefined) {
      clearTimeout(record.idleTimer);
      record.idleTimer = undefined;
    }
  }

  private require(connectionId: string): ConnectionRecord {
    const record = this.connections.get(connectionId);
    if (record === undefined) {
      throw new Error(`Unknown connection ${connectionId}`);
    }
    return record;
  }

  private addToGame(gameId: string, connectionId: string): void {
    let connections = this.gameConnections.get(gameId);
    if (connections === undefined) {
      connections = new Set();
      this.gameConnections.set(gameId, connections);
    }
    connections.add(connectionId);
  }
}

function seatKey(gameId: string, seat: Symbol): string {
  return `${gameId}:${seat}`;
}
