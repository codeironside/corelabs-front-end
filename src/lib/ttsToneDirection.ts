export const TTS_TONE_DIRECTION_MAX_LENGTH = 200;

export function normalizeToneDirection(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, TTS_TONE_DIRECTION_MAX_LENGTH);
}
