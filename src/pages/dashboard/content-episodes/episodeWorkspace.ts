export function createEpisodeWorkspaceKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `episode-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function resolveEpisodeWorkspaceKey(input: {
  activeEpisodeId?: string | null;
  draftKey?: string;
}): string {
  if (input.activeEpisodeId) return input.activeEpisodeId;
  if (input.draftKey) return input.draftKey;
  return createEpisodeWorkspaceKey();
}
