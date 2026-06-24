import type { GameService } from '../application/index.js';
import { ApplicationError } from '../application/index.js';
import type { ConnectionManager } from './connection-manager.js';
import { toApplicationError } from './errors.js';
import {
  parseClientMessage,
  toErrorMessage,
  toJoinedMessage,
  type ClientMessage,
} from './protocol.js';

export class WebSocketHandler {
  constructor(
    private readonly gameService: GameService,
    private readonly connections: ConnectionManager,
  ) {}

  async handleMessage(connectionId: string, raw: unknown): Promise<void> {
    let message: ClientMessage;

    try {
      message = parseClientMessage(raw);
    } catch {
      this.connections.send(
        connectionId,
        toErrorMessage('INVALID_MESSAGE', 'Message must be valid JSON with a known type'),
      );
      return;
    }

    try {
      switch (message.type) {
        case 'join':
          await this.handleJoin(connectionId, message);
          return;
        case 'reconnect':
          await this.handleReconnect(connectionId, message);
          return;
        case 'watch':
          await this.handleWatch(connectionId, message);
          return;
        case 'make_move':
          await this.handleMakeMove(connectionId, message);
          return;
        case 'ping':
          this.connections.send(connectionId, { type: 'pong' });
          return;
        default:
          this.connections.send(
            connectionId,
            toErrorMessage('INVALID_MESSAGE', 'Unknown message type'),
          );
      }
    } catch (error) {
      const appError = toApplicationError(error);
      this.connections.send(
        connectionId,
        toErrorMessage(appError.code, appError.message),
      );
    }
  }

  async handleClose(connectionId: string): Promise<void> {
    if (!this.connections.has(connectionId)) {
      return;
    }

    await this.gameService.handleDisconnect({ connectionId });
    this.connections.detach(connectionId);
  }

  private async handleJoin(
    connectionId: string,
    message: Extract<ClientMessage, { type: 'join' }>,
  ): Promise<void> {
    const result = await this.gameService.join({
      gameId: message.gameId,
      connectionId,
      displayName: message.displayName,
    });

    if (result.kind === 'player') {
      this.connections.setPlayer(connectionId, message.gameId, result.seat);
    } else {
      this.connections.setSpectator(connectionId, message.gameId);
    }

    this.connections.send(connectionId, toJoinedMessage(result));
  }

  private async handleReconnect(
    connectionId: string,
    message: Extract<ClientMessage, { type: 'reconnect' }>,
  ): Promise<void> {
    const result = await this.gameService.reconnect({
      gameId: message.gameId,
      seatToken: message.seatToken,
      connectionId,
    });

    const previousConnectionId = this.connections.supersedePlayerConnection(
      message.gameId,
      result.seat,
      connectionId,
    );

    if (previousConnectionId !== undefined) {
      this.connections.send(previousConnectionId, {
        type: 'superseded',
        reason: 'reconnected_elsewhere',
      });
      this.connections.close(previousConnectionId);
    }

    this.connections.setPlayer(connectionId, message.gameId, result.seat);
    this.connections.send(connectionId, {
      type: 'joined',
      role: 'player',
      seat: result.seat,
      game: result.game,
    });
  }

  private async handleWatch(
    connectionId: string,
    message: Extract<ClientMessage, { type: 'watch' }>,
  ): Promise<void> {
    const result = await this.gameService.watch({
      gameId: message.gameId,
      connectionId,
      displayName: message.displayName,
    });

    this.connections.setSpectator(connectionId, message.gameId);
    this.connections.send(connectionId, toJoinedMessage({ kind: 'spectator', game: result.game }));
  }

  private async handleMakeMove(
    connectionId: string,
    message: Extract<ClientMessage, { type: 'make_move' }>,
  ): Promise<void> {
    const record = this.connections.get(connectionId);

    if (record === undefined || !record.handshakeComplete) {
      throw new ApplicationError('UNAUTHENTICATED', 'Complete join or reconnect first');
    }

    if (record.role !== 'player' || record.gameId === null || record.seat === null) {
      throw new ApplicationError('NOT_A_PLAYER', 'Only players can move');
    }

    await this.gameService.applyMove({
      gameId: record.gameId,
      seat: record.seat,
      index: message.index,
    });
  }
}
