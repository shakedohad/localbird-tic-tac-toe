import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { WebSocket } from 'ws';
import type { GameService } from '../application/index.js';
import { ConnectionManager } from './connection-manager.js';
import { WebSocketHandler } from './ws-handler.js';

function createMockSocket() {
  const OPEN = 1;
  return {
    readyState: OPEN,
    OPEN,
    send: vi.fn(),
    close: vi.fn(),
  } as unknown as WebSocket;
}

function parseSent(socket: WebSocket): unknown {
  const send = socket.send as ReturnType<typeof vi.fn>;
  const raw = send.mock.calls.at(-1)?.[0];
  return JSON.parse(String(raw));
}

describe('WebSocketHandler', () => {
  let gameService: GameService;
  let connections: ConnectionManager;
  let handler: WebSocketHandler;

  beforeEach(() => {
    gameService = {
      join: vi.fn(),
      reconnect: vi.fn(),
      watch: vi.fn(),
      applyMove: vi.fn(),
      handleDisconnect: vi.fn(),
    } as unknown as GameService;

    connections = new ConnectionManager({
      handshakeTimeoutMs: 0,
      idleTimeoutMs: 0,
    });
    handler = new WebSocketHandler(gameService, connections);
  });

  it('handles join as a player', async () => {
    const socket = createMockSocket();
    connections.create('conn-1', socket);

    vi.mocked(gameService.join).mockResolvedValue({
      kind: 'player',
      seat: 'X',
      seatToken: 'token-1',
      game: {
        id: 'game-1',
        status: 'waiting',
        board: [null, null, null, null, null, null, null, null, null],
        currentTurn: 'X',
        winner: null,
        winningLine: null,
        version: 1,
        players: { X: { displayName: null, connected: true }, O: null },
      },
    });

    await handler.handleMessage('conn-1', { type: 'join', gameId: 'game-1' });

    expect(parseSent(socket)).toMatchObject({
      type: 'joined',
      role: 'player',
      seat: 'X',
      seatToken: 'token-1',
    });
    expect(connections.get('conn-1')?.role).toBe('player');
  });

  it('sends superseded to the previous socket on reconnect', async () => {
    const oldSocket = createMockSocket();
    const newSocket = createMockSocket();

    connections.create('conn-old', oldSocket);
    connections.create('conn-new', newSocket);
    connections.setPlayer('conn-old', 'game-1', 'X');

    vi.mocked(gameService.reconnect).mockResolvedValue({
      seat: 'X',
      game: {
        id: 'game-1',
        status: 'active',
        board: [null, null, null, null, null, null, null, null, null],
        currentTurn: 'X',
        winner: null,
        winningLine: null,
        version: 2,
        players: {
          X: { displayName: null, connected: true },
          O: { displayName: null, connected: true },
        },
      },
    });

    await handler.handleMessage('conn-new', {
      type: 'reconnect',
      gameId: 'game-1',
      seatToken: 'token-1',
    });

    expect(parseSent(oldSocket)).toEqual({
      type: 'superseded',
      reason: 'reconnected_elsewhere',
    });
    expect(oldSocket.close).toHaveBeenCalled();
    expect(parseSent(newSocket)).toMatchObject({
      type: 'joined',
      role: 'player',
      seat: 'X',
    });
  });

  it('rejects make_move from spectators', async () => {
    const socket = createMockSocket();
    connections.create('conn-1', socket);
    connections.setSpectator('conn-1', 'game-1');

    await handler.handleMessage('conn-1', { type: 'make_move', index: 0 });

    expect(parseSent(socket)).toMatchObject({
      type: 'error',
      code: 'NOT_A_PLAYER',
    });
    expect(gameService.applyMove).not.toHaveBeenCalled();
  });

  it('routes valid player moves to the game service', async () => {
    const socket = createMockSocket();
    connections.create('conn-1', socket);
    connections.setPlayer('conn-1', 'game-1', 'X');

    await handler.handleMessage('conn-1', { type: 'make_move', index: 4 });

    expect(gameService.applyMove).toHaveBeenCalledWith({
      gameId: 'game-1',
      seat: 'X',
      index: 4,
    });
  });

  it('calls handleDisconnect when a connection closes', async () => {
    const socket = createMockSocket();
    connections.create('conn-1', socket);
    connections.setPlayer('conn-1', 'game-1', 'X');

    await handler.handleClose('conn-1');

    expect(gameService.handleDisconnect).toHaveBeenCalledWith({ connectionId: 'conn-1' });
    expect(connections.has('conn-1')).toBe(false);
  });
});
