import type { TimelineAudioLayer } from './types';

export function audioTrackStyle(kind: TimelineAudioLayer['kind']) {
  if (kind === 'music') {
    return {
      block: 'border-[var(--color-muted-olive)] bg-[var(--color-muted-olive)]/22',
      bars: 'bg-[var(--color-muted-olive)]/85',
      badge: 'bg-[var(--color-muted-olive)]/18 text-[var(--color-ash-brown)]',
    };
  }
  if (kind === 'sfx') {
    return {
      block: 'border-[var(--color-faded-copper)] bg-[var(--color-faded-copper)]/24',
      bars: 'bg-[var(--color-faded-copper)]/90',
      badge: 'bg-[var(--color-faded-copper)]/18 text-[var(--color-ash-brown)]',
    };
  }
  if (kind === 'mic') {
    return {
      block: 'border-[#8f6f4d] bg-[#8f6f4d]/18',
      bars: 'bg-[#8f6f4d]/85',
      badge: 'bg-[#8f6f4d]/14 text-[var(--color-ash-brown)]',
    };
  }
  if (kind === 'tts') {
    return {
      block: 'border-[var(--color-tea-green)] bg-[var(--color-tea-green)]/35',
      bars: 'bg-[var(--color-ash-brown)]/70',
      badge: 'bg-[var(--color-tea-green)]/40 text-[var(--color-ash-brown)]',
    };
  }
  return {
    block: 'border-[#7f9082] bg-[#7f9082]/16',
    bars: 'bg-[#7f9082]/85',
    badge: 'bg-[#7f9082]/14 text-[var(--color-ash-brown)]',
  };
}
