export function createEpisodeWorkspaceKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `episode-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function episodeCatalogId(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const record = value as { _id?: unknown; $oid?: unknown; toHexString?: () => string };
    if (typeof record.toHexString === 'function') return record.toHexString();
    if (typeof record.$oid === 'string') return record.$oid;
    if ('_id' in record) return episodeCatalogId(record._id);
  }
  return String(value);
}

export function sameCatalogId(left: unknown, right: unknown): boolean {
  const a = episodeCatalogId(left);
  const b = episodeCatalogId(right);
  return Boolean(a) && a === b;
}

export function canSaveEpisodeDraft(input: { moduleId?: string; title?: string }): boolean {
  return Boolean(input.moduleId?.trim() && input.title?.trim());
}

export function resolveEpisodeSaveAction(episodeId?: string | null): 'create' | 'update' {
  return episodeCatalogId(episodeId) ? 'update' : 'create';
}

export function resolveEpisodeWorkspaceKey(input: {
  activeEpisodeId?: string | null;
  draftKey?: string;
}): string {
  if (input.activeEpisodeId) return input.activeEpisodeId;
  if (input.draftKey) return input.draftKey;
  return createEpisodeWorkspaceKey();
}
