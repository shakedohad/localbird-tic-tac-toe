import type { GameBroadcaster } from '../contracts/index.js';
import type { ServerMessage } from '../contracts/index.js';
import type { PresencePayload, PublicGameState } from '../contracts/index.js';
import type { ConnectionManager } from './connection-manager.js';

export class WebSocketBroadcaster implements GameBroadcaster {
  constructor(private readonly connections: ConnectionManager) {}

  broadcastGameState(gameId: string, state: PublicGameState): void {
    const message: ServerMessage = { type: 'game_state', game: state };
    this.broadcast(gameId, message);
  }

  broadcastPresence(gameId: string, presence: PresencePayload): void {
    const message: ServerMessage = {
      type: 'presence',
      players: presence.players,
    };
    this.broadcast(gameId, message);
  }

  sendToConnection(connectionId: string, message: ServerMessage): void {
    this.connections.send(connectionId, message);
  }

  private broadcast(gameId: string, message: ServerMessage): void {
    for (const connectionId of this.connections.listGameConnectionIds(gameId)) {
      this.connections.send(connectionId, message);
    }
  }
}
