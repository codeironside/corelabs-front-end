export function safeReturnTo(value: string | null | undefined, fallback = '/app'): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return fallback;
  }
  try {
    const parsed = new URL(trimmed, 'https://corelabs.local');
    if (parsed.origin !== 'https://corelabs.local') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function loginHref(returnTo = '/app'): string {
  return `/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;
}
