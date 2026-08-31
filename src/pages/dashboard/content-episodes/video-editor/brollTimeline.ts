import type { TimelineBrollLayer } from './types';

export function activeBrollLayers(layers: TimelineBrollLayer[], playheadSec: number) {
  return layers.filter((layer) => layer.startSec <= playheadSec && layer.endSec >= playheadSec);
}

export function defaultBrollOpacity(opacity?: number) {
  return opacity ?? 62;
}
