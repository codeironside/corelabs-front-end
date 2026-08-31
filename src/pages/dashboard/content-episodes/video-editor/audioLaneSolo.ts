import { layoutAudioLanes } from './audioLaneLayout';
import type { AudioSoloTarget, TimelineAudioLayer } from './types';

export function filterLayersForSolo(
  layers: TimelineAudioLayer[],
  solo: AudioSoloTarget,
): TimelineAudioLayer[] {
  if (!solo) return layers;

  const isTts = solo.track === 'tts';
  const scoped = layers.filter((layer) => (isTts ? layer.kind === 'tts' : layer.kind !== 'tts'));
  const layout = layoutAudioLanes(scoped, { strategy: isTts ? 'overlap' : 'dedicated' });
  const soloIds = new Set(
    layout.items.filter((item) => item.lane === solo.lane).map((item) => item.layer.id),
  );
  return layers.filter((layer) => soloIds.has(layer.id));
}
