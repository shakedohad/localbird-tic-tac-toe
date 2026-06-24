import type { ConnectionStatus } from '../types';

const LABELS: Record<ConnectionStatus, string> = {
  connecting: 'Connecting…',
  connected: 'Connected',
  reconnecting: 'Reconnecting…',
  disconnected: 'Disconnected',
  superseded: 'Active in another tab',
  ended: 'This game is no longer available',
};

const VARIANTS: Record<ConnectionStatus, string> = {
  connecting: 'banner-neutral',
  connected: 'banner-success',
  reconnecting: 'banner-warning',
  disconnected: 'banner-warning',
  superseded: 'banner-error',
  ended: 'banner-error',
};

interface ConnectionBannerProps {
  status: ConnectionStatus;
}

export function ConnectionBanner({ status }: ConnectionBannerProps) {
  if (status === 'connected' || status === 'connecting') {
    return null;
  }

  return (
    <div className={`connection-toast ${VARIANTS[status]}`} role="status">
      {LABELS[status]}
    </div>
  );
}
