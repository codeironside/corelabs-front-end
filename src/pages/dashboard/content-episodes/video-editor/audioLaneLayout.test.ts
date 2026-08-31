import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assignDedicatedLane, layoutAudioLanes } from './audioLaneLayout';
import type { TimelineAudioLayer } from './types';

function sfx(id: string, lane?: number, startSec = 0): TimelineAudioLayer {
  return {
    id,
    kind: 'sfx',
    label: id,
    url: `https://example.com/${id}.mp3`,
    startSec,
    endSec: startSec + 4,
    volume: 80,
    lane,
  };
}

test('assignDedicatedLane stacks each new music or sfx on its own lane', () => {
  const first = sfx('a');
  const existing = [{ ...first, lane: 0 }];
  assert.equal(assignDedicatedLane(existing, sfx('b')), 1);
  assert.equal(assignDedicatedLane([...existing, sfx('b', 1)], sfx('c')), 2);
});

test('dedicated layout keeps assigned lanes and never merges unrelated clips', () => {
  const layers = [
    sfx('whoosh', 0, 0),
    sfx('bass', 1, 0),
    sfx('whoosh-copy', 0, 6),
  ];
  const layout = layoutAudioLanes(layers, { strategy: 'dedicated' });
  assert.equal(layout.laneCount, 2);
  assert.deepEqual(
    layout.items.map((item) => [item.layer.id, item.lane]),
    [['whoosh', 0], ['bass', 1], ['whoosh-copy', 0]],
  );
});

test('assignDedicatedLane accounts for legacy layers without stored lane numbers', () => {
  const legacy = [sfx('a'), sfx('b'), sfx('c')];
  assert.equal(assignDedicatedLane(legacy, sfx('d')), 3);
});

test('overlap layout still packs non-overlapping clips on one lane', () => {
  const layers = [sfx('a', undefined, 0), sfx('b', undefined, 5)];
  const layout = layoutAudioLanes(layers, { strategy: 'overlap' });
  assert.equal(layout.laneCount, 1);
  assert.equal(layout.items[0]?.lane, 0);
  assert.equal(layout.items[1]?.lane, 0);
});
