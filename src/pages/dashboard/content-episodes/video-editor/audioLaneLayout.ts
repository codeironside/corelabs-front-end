import type { TimelineAudioLayer } from './types';

export type AudioLaneItem = {
  layer: TimelineAudioLayer;
  lane: number;
};

export type AudioLaneStrategy = 'overlap' | 'dedicated';

function isMusicOrSfxLayer(layer: TimelineAudioLayer) {
  return layer.kind !== 'tts';
}

export function assignDedicatedLane(existing: TimelineAudioLayer[], layer: TimelineAudioLayer): number {
  if (!isMusicOrSfxLayer(layer)) {
    return layer.lane ?? 0;
  }

  const siblings = existing.filter(isMusicOrSfxLayer);
  if (siblings.length === 0) return 0;

  const items = layoutDedicatedLanes(siblings);
  const maxLane = items.reduce((max, item) => Math.max(max, item.lane), 0);
  return maxLane + 1;
}

function layoutOverlapLanes(layers: TimelineAudioLayer[]): AudioLaneItem[] {
  const laneEnds: number[] = [];
  const sorted = [...layers].sort((first, second) => {
    if (first.startSec !== second.startSec) return first.startSec - second.startSec;
    return first.endSec - second.endSec;
  });

  return sorted.map((layer) => {
    if (layer.lane !== undefined && layer.lane >= 0) {
      laneEnds[layer.lane] = Math.max(laneEnds[layer.lane] ?? 0, layer.endSec);
      return { layer, lane: layer.lane };
    }

    const lane = laneEnds.findIndex((endSec) => endSec <= layer.startSec + 0.05);
    const nextLane = lane >= 0 ? lane : laneEnds.length;
    laneEnds[nextLane] = layer.endSec;
    return { layer, lane: nextLane };
  });
}

function layoutDedicatedLanes(layers: TimelineAudioLayer[]): AudioLaneItem[] {
  const items: AudioLaneItem[] = [];
  const occupied = new Set<number>();
  let nextFreeLane = 0;

  for (const layer of layers) {
    let lane: number;
    if (layer.lane !== undefined && layer.lane >= 0) {
      lane = layer.lane;
    } else {
      while (occupied.has(nextFreeLane)) nextFreeLane += 1;
      lane = nextFreeLane;
      nextFreeLane += 1;
    }
    occupied.add(lane);
    items.push({ layer, lane });
  }

  return items;
}

export function layoutAudioLanes(layers: TimelineAudioLayer[], options?: { strategy?: AudioLaneStrategy }) {
  const strategy = options?.strategy ?? 'overlap';
  const items = strategy === 'dedicated' ? layoutDedicatedLanes(layers) : layoutOverlapLanes(layers);

  return {
    items,
    laneCount: items.length > 0 ? Math.max(1, ...items.map((item) => item.lane + 1)) : 1,
  };
}

export function audioTrackHeight(laneCount: number) {
  return Math.max(86, laneCount * 38 + 16);
}
