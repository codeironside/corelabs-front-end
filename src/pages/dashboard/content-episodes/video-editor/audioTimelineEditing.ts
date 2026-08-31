import type { TimelineAudioLayer } from './types';

export type AudioTrimEdge = 'start' | 'end';

const MIN_CLIP_DURATION_SEC = 0.5;

export function clampTimelineSecond(seconds: number, totalDuration: number) {
  return Math.min(totalDuration, Math.max(0, seconds));
}

export function pointerSecond(clientX: number, rect: DOMRect, zoom: number, totalDuration: number) {
  return clampTimelineSecond((clientX - rect.left) / zoom, totalDuration);
}

export function trimAudioLayer(
  layer: TimelineAudioLayer,
  edge: AudioTrimEdge,
  seconds: number,
  totalDuration: number,
) {
  const bounded = clampTimelineSecond(seconds, totalDuration);
  const clipOffset = layer.clipOffsetSec ?? 0;

  if (edge === 'start') {
    const nextStart = Math.min(layer.endSec - MIN_CLIP_DURATION_SEC, bounded);
    const delta = nextStart - layer.startSec;
    return {
      startSec: Number(nextStart.toFixed(2)),
      clipOffsetSec: Number(Math.max(0, clipOffset + delta).toFixed(2)),
    };
  }

  return {
    endSec: Number(Math.max(layer.startSec + MIN_CLIP_DURATION_SEC, bounded).toFixed(2)),
  };
}

export function moveAudioLayer(
  layer: TimelineAudioLayer,
  deltaSec: number,
  totalDuration: number,
): Partial<TimelineAudioLayer> {
  const duration = layer.endSec - layer.startSec;
  let nextStart = clampTimelineSecond(layer.startSec + deltaSec, totalDuration);
  let nextEnd = nextStart + duration;
  if (nextEnd > totalDuration) {
    nextEnd = totalDuration;
    nextStart = Math.max(0, nextEnd - duration);
  }
  return {
    startSec: Number(nextStart.toFixed(2)),
    endSec: Number(nextEnd.toFixed(2)),
  };
}

export function cutAudioLayerAtPlayhead(layer: TimelineAudioLayer, playheadSec: number) {
  const insideLayer = playheadSec > layer.startSec + 0.25 && playheadSec < layer.endSec - 0.25;
  if (!insideLayer) return {};
  return { endSec: Number(playheadSec.toFixed(2)) };
}

export function splitAudioLayerAtPlayhead(
  layer: TimelineAudioLayer,
  playheadSec: number,
): { head: Partial<TimelineAudioLayer>; tail: TimelineAudioLayer } | null {
  if (playheadSec <= layer.startSec + 0.25 || playheadSec >= layer.endSec - 0.25) {
    return null;
  }
  const clipOffset = layer.clipOffsetSec ?? 0;
  const firstDuration = playheadSec - layer.startSec;
  return {
    head: { endSec: Number(playheadSec.toFixed(2)) },
    tail: {
      ...layer,
      id: crypto.randomUUID(),
      label: `${layer.label} (split)`,
      startSec: Number(playheadSec.toFixed(2)),
      endSec: layer.endSec,
      clipOffsetSec: Number((clipOffset + firstDuration).toFixed(2)),
      lane: layer.lane,
    },
  };
}

export function duplicateAudioLayer(
  layer: TimelineAudioLayer,
  options: { totalDuration: number; playheadSec: number; lane?: number },
): TimelineAudioLayer {
  const duration = layer.endSec - layer.startSec;
  const preferredStart = options.playheadSec;
  let startSec = preferredStart;
  if (startSec + duration > options.totalDuration) {
    startSec = Math.max(0, options.totalDuration - duration);
  }
  startSec = clampTimelineSecond(startSec, options.totalDuration);
  if (startSec + duration > options.totalDuration) {
    startSec = Math.max(0, options.totalDuration - duration);
  }

  const copyLabel = layer.label.toLowerCase().includes('copy') ? layer.label : `${layer.label} copy`;

  return {
    ...layer,
    id: crypto.randomUUID(),
    label: copyLabel,
    startSec: Number(startSec.toFixed(2)),
    endSec: Number(Math.min(options.totalDuration, startSec + duration).toFixed(2)),
    clipOffsetSec: layer.clipOffsetSec,
    lane: options.lane ?? layer.lane,
  };
}
