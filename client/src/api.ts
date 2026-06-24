export interface CreateGameResponse {
  gameId: string;
  url: string;
}

export async function createGame(): Promise<CreateGameResponse> {
  const response = await fetch('/games', { method: 'POST' });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'Failed to create game');
  }

  return response.json() as Promise<CreateGameResponse>;
}
