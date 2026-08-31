import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addSceneTtsLine,
  aggregateSceneTtsStatus,
  ensureSceneTtsLines,
  sceneHasReadyTts,
  ttsLineTimelineWindow,
  updateSceneTtsLine,
} from './sceneTts.ts';
import type { EpisodeSceneCard } from './storyboard.ts';

const baseScene: EpisodeSceneCard = {
  id: 'scene-1',
  sceneNumber: 1,
  startSec: 0,
  endSec: 10,
  voiceOver: 'Hello there.',
  visualPrompt: 'Studio shot.',
  characterHandles: [],
  approved: false,
  ttsStatus: 'idle',
};

test('ensureSceneTtsLines seeds from voice-over when no lines exist', () => {
  const lines = ensureSceneTtsLines(baseScene, 'lagos-warm-female');
  assert.equal(lines.length, 1);
  assert.match(lines[0]?.text ?? '', /Hello there/);
});

test('updateSceneTtsLine marks a generated dialogue clip ready', () => {
  const lines = ensureSceneTtsLines(baseScene, 'lagos-warm-female');
  const updated = updateSceneTtsLine(baseScene, lines[0]!.id, {
    status: 'ready',
    audioUrl: 'https://example.com/line-1.mp3',
    label: 'Line 1',
  }, 'lagos-warm-female');
  assert.equal(sceneHasReadyTts(updated), true);
  assert.equal(aggregateSceneTtsStatus(updated.ttsLines ?? []), 'ready');
});

test('addSceneTtsLine appends another dialogue row', () => {
  const withSecond = addSceneTtsLine(baseScene, 'lagos-warm-female');
  assert.equal(ensureSceneTtsLines(withSecond, 'lagos-warm-female').length, 2);
});

test('ttsLineTimelineWindow splits scene duration across dialogue lines', () => {
  const first = ttsLineTimelineWindow(baseScene, 0, 2);
  const second = ttsLineTimelineWindow(baseScene, 1, 2);
  assert.equal(first.startSec, 0);
  assert.equal(first.endSec, 5);
  assert.equal(second.startSec, 5);
  assert.equal(second.endSec, 10);
});
