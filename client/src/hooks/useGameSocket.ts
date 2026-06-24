import { useCallback, useEffect, useRef, useState } from 'react';
import { loadSeatToken, saveSeatToken, clearSeatToken } from '../storage';
import type {
  ClientMessage,
  ConnectionStatus,
  PlayerRole,
  PublicGameState,
  ServerMessage,
  Symbol,
} from '../types';

const PING_INTERVAL_MS = 30_000;
const MAX_RETRY_MS = 10_000;

function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

function retryDelay(attempt: number): number {
  return Math.min(1_000 * 2 ** attempt, MAX_RETRY_MS);
}

export interface UseGameSocketResult {
  status: ConnectionStatus;
  game: PublicGameState | null;
  role: PlayerRole | null;
  seat: Symbol | null;
  error: string | null;
  makeMove: (index: number) => void;
  clearError: () => void;
}

export function useGameSocket(gameId: string): UseGameSocketResult {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [game, setGame] = useState<PublicGameState | null>(null);
  const [role, setRole] = useState<PlayerRole | null>(null);
  const [seat, setSeat] = useState<Symbol | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);
  const pingTimerRef = useRef<number | null>(null);
  const handshakeSentRef = useRef(false);
  const supersededRef = useRef(false);

  const send = useCallback((message: ClientMessage) => {
    const socket = wsRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, []);

  const makeMove = useCallback(
    (index: number) => {
      send({ type: 'make_move', index });
    },
    [send],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let connectionGeneration = 0;

    const isActive = (generation: number): boolean =>
      !cancelled && generation === connectionGeneration;

    const clearRetryTimer = () => {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    const clearPingTimer = () => {
      if (pingTimerRef.current !== null) {
        window.clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) {
        return;
      }

      setStatus('reconnecting');
      const delay = retryDelay(retryAttemptRef.current);
      retryAttemptRef.current += 1;
      retryTimerRef.current = window.setTimeout(connect, delay);
    };

    const sendHandshake = () => {
      if (handshakeSentRef.current) {
        return;
      }

      handshakeSentRef.current = true;
      const seatToken = loadSeatToken(gameId);
      if (seatToken !== null) {
        send({ type: 'reconnect', gameId, seatToken });
      } else {
        send({ type: 'join', gameId });
      }
    };

    const handleServerMessage = (message: ServerMessage, generation: number) => {
      if (!isActive(generation)) {
        return;
      }

      switch (message.type) {
        case 'joined':
          setGame(message.game);
          setRole(message.role);
          setSeat(message.role === 'player' ? (message.seat ?? null) : null);
          if (message.role === 'player' && message.seatToken !== undefined) {
            saveSeatToken(gameId, message.seatToken);
          }
          setStatus('connected');
          setError(null);
          retryAttemptRef.current = 0;
          break;
        case 'game_state':
          setGame((current) =>
            current === null || message.game.version >= current.version ? message.game : current,
          );
          break;
        case 'error':
          setError(message.message);
          if (!message.recoverable && message.code === 'INVALID_SEAT_TOKEN') {
            clearSeatToken(gameId);
            handshakeSentRef.current = false;
            send({ type: 'join', gameId });
          }
          break;
        case 'superseded':
          supersededRef.current = true;
          setStatus('superseded');
          setError('You opened this game in another tab.');
          break;
        case 'pong':
          break;
        default:
          break;
      }
    };

    function connect() {
      if (cancelled) {
        return;
      }

      clearRetryTimer();
      clearPingTimer();
      handshakeSentRef.current = false;

      const generation = ++connectionGeneration;
      const socket = new WebSocket(getWebSocketUrl());
      wsRef.current = socket;
      setStatus(retryAttemptRef.current === 0 ? 'connecting' : 'reconnecting');

      socket.addEventListener('open', () => {
        if (!isActive(generation)) {
          socket.close();
          return;
        }
        sendHandshake();
        pingTimerRef.current = window.setInterval(() => {
          send({ type: 'ping' });
        }, PING_INTERVAL_MS);
      });

      socket.addEventListener('message', (event) => {
        if (!isActive(generation)) {
          return;
        }

        try {
          const message = JSON.parse(String(event.data)) as ServerMessage;
          handleServerMessage(message, generation);
        } catch {
          setError('Received an invalid message from the server.');
        }
      });

      socket.addEventListener('close', () => {
        clearPingTimer();
        if (!isActive(generation) || supersededRef.current) {
          return;
        }
        scheduleReconnect();
      });
    }

    connect();

    return () => {
      cancelled = true;
      connectionGeneration += 1;
      clearRetryTimer();
      clearPingTimer();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [gameId, send]);

  return {
    status,
    game,
    role,
    seat,
    error,
    makeMove,
    clearError,
  };
}
