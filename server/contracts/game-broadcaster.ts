import type { ServerMessage } from './messages.js';
import type { PublicGameState } from './public-state.js';

export interface GameBroadcaster {
  broadcastGameState(gameId: string, state: PublicGameState): void;
  sendToConnection(connectionId: string, message: ServerMessage): void;
}
