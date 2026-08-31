import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  duplicateAudioLayer,
  moveAudioLayer,
  splitAudioLayerAtPlayhead,
  trimAudioLayer,
} from './audioTimelineEditing';
import type { TimelineAudioLayer } from './types';

const baseLayer: TimelineAudioLayer = {
  id: 'layer-1',
  kind: 'sfx',
  label: 'Whoosh',
  url: 'https://example.com/whoosh.mp3',
  startSec: 4,
  endSec: 8,
  volume: 90,
  clipOffsetSec: 1,
  lane: 0,
};

test('trimAudioLayer crops source offset when trimming start edge', () => {
  const trimmed = trimAudioLayer(baseLayer, 'start', 5.5, 60);
  assert.equal(trimmed.startSec, 5.5);
  assert.equal(trimmed.clipOffsetSec, 2.5);
});

test('moveAudioLayer preserves clip duration while repositioning', () => {
  const moved = moveAudioLayer(baseLayer, 3, 60);
  assert.equal(moved.startSec, 7);
  assert.equal(moved.endSec, 11);
});

test('duplicateAudioLayer keeps lane and clip offset', () => {
  const copy = duplicateAudioLayer(baseLayer, { totalDuration: 60, playheadSec: 10, lane: 0 });
  assert.notEqual(copy.id, baseLayer.id);
  assert.equal(copy.lane, 0);
  assert.equal(copy.clipOffsetSec, 1);
  assert.equal(copy.endSec! - copy.startSec, 4);
  assert.equal(copy.startSec, 10);
});

test('splitAudioLayerAtPlayhead creates tail with advanced source offset', () => {
  const split = splitAudioLayerAtPlayhead(baseLayer, 6);
  assert.ok(split);
  assert.equal(split!.head.endSec, 6);
  assert.equal(split!.tail.startSec, 6);
  assert.equal(split!.tail.clipOffsetSec, 3);
  assert.equal(split!.tail.endSec, 8);
});
