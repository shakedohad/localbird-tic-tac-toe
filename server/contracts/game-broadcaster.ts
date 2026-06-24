import type { ServerMessage } from './messages.js';
import type { PresencePayload, PublicGameState } from './public-state.js';

export interface GameBroadcaster {
  broadcastGameState(gameId: string, state: PublicGameState): void;
  broadcastPresence(gameId: string, presence: PresencePayload): void;
  sendToConnection(connectionId: string, message: ServerMessage): void;
}
