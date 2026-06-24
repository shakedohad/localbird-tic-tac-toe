export interface GameServiceConfig {
  /** null = unlimited spectators (default). */
  maxSpectators: number | null;
  /** Default: continue — moves allowed while opponent is disconnected. */
  disconnectPolicy: 'continue' | 'pause';
}

export const DEFAULT_GAME_SERVICE_CONFIG: GameServiceConfig = {
  maxSpectators: null,
  disconnectPolicy: 'continue',
};
