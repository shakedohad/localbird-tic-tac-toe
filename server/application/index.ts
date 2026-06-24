export { DEFAULT_GAME_SERVICE_CONFIG, type GameServiceConfig } from './config.js';
export { ConnectionRegistry, type ConnectionRole } from './connection-registry.js';
export { ApplicationError } from './errors.js';
export {
  GameService,
  type GameServiceDeps,
  type JoinResult,
  type ReconnectResult,
  type WatchResult,
} from './game-service.js';
export { toPublicGameState } from './public-state-mapper.js';
