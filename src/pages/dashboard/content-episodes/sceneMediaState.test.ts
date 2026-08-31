import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeSceneMediaFromDoc, shouldApplySceneDocToCard } from './sceneMediaState.ts';
import type { EpisodeSceneCard } from './storyboard.ts';

const baseScene: EpisodeSceneCard = {
  id: 'scene-card-2',
  sceneNumber: 2,
  startSec: 10,
  endSec: 20,
  voiceOver: 'Line',
  visualPrompt: 'Visual',
  characterHandles: [],
  approved: false,
  ttsStatus: 'idle',
  sceneVideoStatus: 'generating',
  sceneVideoTakeId: 'episode-b',
};

test('shouldApplySceneDocToCard matches by linked episode id and scene number', () => {
  const sceneDoc = {
    _id: 'doc-2',
    episodeId: 'episode-b',
    moduleId: 'module-1',
    sceneNumber: 2,
    startSec: 10,
    endSec: 20,
    voiceOver: '',
    visualPrompt: '',
    characterHandles: [],
    status: 'ready' as const,
    cloudinaryUrl: 'https://res.cloudinary.com/demo/video/upload/scene-2.mp4',
  };

  assert.equal(shouldApplySceneDocToCard(baseScene, sceneDoc, 'episode-b'), true);
  assert.equal(shouldApplySceneDocToCard(baseScene, { ...sceneDoc, episodeId: 'episode-a' }, 'episode-b'), false);
  assert.equal(shouldApplySceneDocToCard(baseScene, { ...sceneDoc, sceneNumber: 1 }, 'episode-b'), false);
});

test('mergeSceneMediaFromDoc keeps scene-specific video and tts urls', () => {
  const merged = mergeSceneMediaFromDoc(baseScene, {
    _id: 'doc-2',
    episodeId: 'episode-b',
    moduleId: 'module-1',
    sceneNumber: 2,
    startSec: 10,
    endSec: 20,
    voiceOver: '',
    visualPrompt: '',
    characterHandles: [],
    status: 'ready',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/video/upload/scene-2.mp4',
    ttsLines: [{
      id: 'line-1',
      speaker: '@Amina',
      text: 'Welcome back.',
      voiceProfile: 'lagos-warm-male',
      audioUrl: 'https://res.cloudinary.com/demo/video/upload/scene-2-a.mp3',
      label: 'Amina line',
    }, {
      id: 'line-2',
      speaker: '@Shehu',
      text: 'Thanks for joining us.',
      voiceProfile: 'lagos-warm-female',
      audioUrl: 'https://res.cloudinary.com/demo/video/upload/scene-2-b.mp3',
      label: 'Shehu line',
    }],
  });

  assert.equal(merged.sceneVideoUrl, 'https://res.cloudinary.com/demo/video/upload/scene-2.mp4');
  assert.equal(merged.ttsLines?.length, 2);
  assert.equal(merged.ttsStatus, 'ready');
  assert.equal(merged.episodeSceneDocId, 'doc-2');
});
