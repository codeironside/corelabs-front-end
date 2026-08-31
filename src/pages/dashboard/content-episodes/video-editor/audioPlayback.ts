import { audioFxSignature } from './audioFx';
import type { TimelineAudioLayer } from './types';

export type ScheduledAudioLayer = {
  layer: TimelineAudioLayer;
  delayMs: number;
  offsetSec: number;
  playForMs: number;
};

export function effectiveAudioVolume(layerVolume: number, masterVolume: number) {
  return Math.min(1, Math.max(0, (layerVolume / 100) * (masterVolume / 100)));
}

export function scheduledAudioLayers(
  layers: TimelineAudioLayer[],
  absoluteStartSec: number,
  windowEndSec: number,
) {
  return layers
    .filter((layer) => !layer.muted && layer.url && layer.startSec < windowEndSec && layer.endSec > absoluteStartSec)
    .map((layer) => {
      const startsAt = Math.max(layer.startSec, absoluteStartSec);
      const sceneWindowMs = Math.max(0, (layer.endSec - startsAt) * 1000);
      return {
        layer,
        delayMs: Math.max(0, (layer.startSec - absoluteStartSec) * 1000),
        offsetSec: (layer.clipOffsetSec ?? 0) + Math.max(0, absoluteStartSec - layer.startSec),
        playForMs: layer.kind === 'tts' ? 0 : sceneWindowMs,
      };
    });
}

export function audioLayersSignature(layers: TimelineAudioLayer[]) {
  return layers
    .map((layer) => `${layer.id}:${layer.kind}:${layer.url}:${layer.startSec}:${layer.endSec}:${layer.clipOffsetSec ?? 0}:${layer.volume}:${layer.muted ? 1 : 0}:${layer.lane ?? ''}:${audioFxSignature(layer.fx)}`)
    .join('|');
}
