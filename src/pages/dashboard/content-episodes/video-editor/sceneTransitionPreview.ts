import type { CSSProperties } from 'react';
import type { TransitionKind } from './types';

/** Match backend `transition_mp4.ts` preview timings. */
export function transitionDurationSec(kind: TransitionKind): number {
  if (kind === 'cut') return 0;
  if (kind === 'fade-black') return 0.7;
  return 0.55;
}

export function transitionUsesOverlap(kind: TransitionKind): boolean {
  return transitionDurationSec(kind) > 0;
}

/** Progress 0..1 while the playhead is inside the outgoing scene's transition window. */
export function transitionWindowProgress(
  localTimeSec: number,
  slotDurationSec: number,
  kind: TransitionKind,
): number | null {
  const duration = transitionDurationSec(kind);
  if (duration <= 0 || slotDurationSec <= 0) return null;
  const windowStart = Math.max(0, slotDurationSec - duration);
  if (localTimeSec < windowStart) return null;
  return Math.min(1, Math.max(0, (localTimeSec - windowStart) / duration));
}

export function incomingLocalTimeSec(
  localTimeSec: number,
  slotDurationSec: number,
  kind: TransitionKind,
): number {
  const duration = transitionDurationSec(kind);
  if (duration <= 0) return 0;
  const windowStart = Math.max(0, slotDurationSec - duration);
  return Math.max(0, localTimeSec - windowStart);
}

export function outgoingLayerStyle(kind: TransitionKind, progress: number): CSSProperties {
  const t = Math.min(1, Math.max(0, progress));
  switch (kind) {
    case 'dissolve':
      return { opacity: 1 - t };
    case 'wipe':
      return { clipPath: `inset(0 0 0 ${(t * 100).toFixed(2)}%)` };
    case 'slide-left':
      return { transform: `translateX(${(-t * 100).toFixed(2)}%)` };
    case 'zoom':
      return {
        transform: `scale(${(1 + t * 0.14).toFixed(4)})`,
        opacity: 1 - t * 0.4,
      };
    case 'fade-black':
      return { opacity: 1 - t * 0.85 };
    default:
      return {};
  }
}

export function incomingLayerStyle(kind: TransitionKind, progress: number): CSSProperties {
  const t = Math.min(1, Math.max(0, progress));
  switch (kind) {
    case 'dissolve':
      return { opacity: t };
    case 'wipe':
      return { clipPath: `inset(0 ${((1 - t) * 100).toFixed(2)}% 0 0)` };
    case 'slide-left':
      return { transform: `translateX(${((1 - t) * 100).toFixed(2)}%)` };
    case 'zoom':
      return {
        transform: `scale(${(0.86 + t * 0.14).toFixed(4)})`,
        opacity: t,
      };
    case 'fade-black':
      return { opacity: t * 0.9 };
    default:
      return { opacity: t };
  }
}

export function fadeBlackOverlayOpacity(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return Math.sin(t * Math.PI);
}

export function mergeInspectorOpacity(style: CSSProperties, inspectorOpacity: number): CSSProperties {
  const base = inspectorOpacity / 100;
  if (typeof style.opacity === 'number') {
    return { ...style, opacity: style.opacity * base };
  }
  return { ...style, opacity: base };
}
