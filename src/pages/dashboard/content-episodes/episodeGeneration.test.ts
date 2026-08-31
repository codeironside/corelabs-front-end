import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildEmptySceneBoard,
  resolveEpisodeGenerationContext,
  resolveSceneVideoGenerationContext,
  scenesReadyForGeneration,
} from './episodeGeneration';
import type { EpisodeSceneCard } from './storyboard';

const scenes: EpisodeSceneCard[] = [
  {
    id: 'a',
    sceneNumber: 1,
    startSec: 0,
    endSec: 10,
    voiceOver: 'Shehu opens the episode.',
    visualPrompt: '@Shehu in a civic studio, warm lighting.',
    characterHandles: ['@Shehu'],
    approved: true,
    ttsStatus: 'idle',
  },
  {
    id: 'b',
    sceneNumber: 2,
    startSec: 10,
    endSec: 20,
    voiceOver: 'Amina reports from the field.',
    visualPrompt: '@Amina on a Lagos street.',
    characterHandles: ['@Amina'],
    approved: true,
    ttsStatus: 'idle',
  },
];

test('resolveEpisodeGenerationContext uses scene cards for scenes workflow', () => {
  const result = resolveEpisodeGenerationContext({
    workflow: 'scenes',
    title: 'Episode 1',
    basePrompt: 'This base prompt should not dominate.',
    scriptDraft: '',
    scriptApproved: false,
    scenes,
  });

  assert.match(result.basePrompt, /Authoritative segmented storyboard/);
  assert.match(result.basePrompt, /@Shehu in a civic studio/);
  assert.doesNotMatch(result.basePrompt, /This base prompt should not dominate/);
  assert.match(result.approvedScript ?? '', /Shehu opens the episode/);
});

test('resolveSceneVideoGenerationContext prefers scene prompts in scenes workflow', () => {
  const result = resolveSceneVideoGenerationContext('scenes', scenes[0]!, 'Episode 1', 'Ignore this base prompt');
  assert.match(result.basePrompt, /@Shehu in a civic studio/);
  assert.doesNotMatch(result.basePrompt, /Ignore this base prompt/);
});

test('buildEmptySceneBoard creates timed cards without seeding base prompt text', () => {
  const board = buildEmptySceneBoard(20, [{ id: '1', handle: '@Shehu', name: 'Shehu' }]);
  assert.equal(board.length, 2);
  assert.match(board[0]?.voiceOver ?? '', /Scene 1:/);
  assert.doesNotMatch(board[0]?.voiceOver ?? '', /Lagos Launch/);
});

test('scenesReadyForGeneration requires content on every card', () => {
  assert.equal(scenesReadyForGeneration(scenes), true);
  assert.equal(scenesReadyForGeneration([{ ...scenes[0]!, visualPrompt: '', voiceOver: '' }]), false);
});
