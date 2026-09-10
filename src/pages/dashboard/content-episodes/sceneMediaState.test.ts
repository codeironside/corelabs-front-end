import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeCommittedSceneFromQuery, mergeSceneMediaFromDoc, sceneErrorForDisplay, shouldApplySceneDocToCard } from './sceneMediaState.ts';
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

test('mergeSceneMediaFromDoc surfaces a finished take while the catalog scene is still generating', () => {
  const catalogCard: EpisodeSceneCard = {
    ...baseScene,
    episodeSceneDocId: 'catalog-scene-2',
    catalogStatus: 'generating',
    sceneVideoStatus: 'generating',
  };
  const merged = mergeSceneMediaFromDoc(catalogCard, {
    _id: 'take-scene-2',
    episodeId: 'take-episode',
    moduleId: 'module-1',
    sceneNumber: 2,
    startSec: 10,
    endSec: 20,
    voiceOver: '',
    visualPrompt: '',
    characterHandles: [],
    status: 'ready',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/video/upload/scene-2.mp4',
  }, 'catalog-episode');

  assert.equal(merged.episodeSceneDocId, 'catalog-scene-2');
  assert.equal(merged.sceneVideoUrl, 'https://res.cloudinary.com/demo/video/upload/scene-2.mp4');
  assert.equal(merged.catalogStatus, 'pending_approval');
  assert.equal(merged.sceneVideoStatus, 'pending_approval');
});

test('mergeSceneMediaFromDoc does not replace a catalog scene id with a take scene id', () => {
  const catalogCard: EpisodeSceneCard = {
    ...baseScene,
    episodeSceneDocId: 'catalog-scene-2',
    catalogStatus: 'generating',
  };
  const merged = mergeSceneMediaFromDoc(catalogCard, {
    _id: 'take-scene-2',
    episodeId: 'take-episode',
    moduleId: 'module-1',
    sceneNumber: 2,
    startSec: 10,
    endSec: 20,
    voiceOver: '',
    visualPrompt: '',
    characterHandles: [],
    status: 'queued',
  }, 'catalog-episode');

  assert.equal(merged.episodeSceneDocId, 'catalog-scene-2');
  assert.equal(merged.catalogStatus, 'generating');
  assert.equal(merged.sceneVideoTakeId, 'take-episode');
});

test('mergeSceneMediaFromDoc maps pending_approval as playable, not generating', () => {
  const merged = mergeSceneMediaFromDoc(baseScene, {
    _id: 'doc-2',
    episodeId: 'episode-b',
    moduleId: 'module-1',
    sceneNumber: 2,
    startSec: 10,
    endSec: 20,
    voiceOver: '',
    visualPrompt: 'Beat',
    characterHandles: [],
    status: 'pending_approval',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/video/upload/scene-2.mp4',
    lastFrameUrl: 'https://res.cloudinary.com/demo/image/upload/scene-2-last.jpg',
  });

  assert.equal(merged.sceneVideoStatus, 'pending_approval');
  assert.equal(merged.catalogStatus, 'pending_approval');
  assert.equal(merged.approved, false);
  assert.equal(merged.sceneVideoUrl, 'https://res.cloudinary.com/demo/video/upload/scene-2.mp4');
  assert.equal(merged.lastFrameUrl, 'https://res.cloudinary.com/demo/image/upload/scene-2-last.jpg');
});

test('mergeSceneMediaFromDoc keeps narration audioSegmentUrl distinct from dialogue ttsAudioUrl', () => {
  const merged = mergeSceneMediaFromDoc(baseScene, {
    _id: 'doc-2',
    episodeId: 'episode-b',
    moduleId: 'module-1',
    sceneNumber: 2,
    startSec: 10,
    endSec: 20,
    voiceOver: '',
    visualPrompt: 'Beat',
    characterHandles: [],
    status: 'unrendered',
    ttsAudioUrl: 'https://cdn.example/dialogue.mp3',
    ttsLabel: 'Dialogue line',
    audioSegmentUrl: 'https://cdn.example/narration-slice.mp3',
  });

  assert.equal(merged.audioSegmentUrl, 'https://cdn.example/narration-slice.mp3');
  assert.equal(merged.ttsAudioUrl?.includes('dialogue.mp3'), true);
  assert.notEqual(merged.audioSegmentUrl, merged.ttsAudioUrl);
});

test('sceneErrorForDisplay hides storage infra errors when a clip is already playable', () => {
  const raw = 'Storage bucket does not exist (ajeoba-54fca.appspot.com). Open https://console.firebase.google.com/project/ajeoba-54fca/storage and click Get started (Blaze billing required), then retry.';
  assert.equal(sceneErrorForDisplay(raw, true), undefined);
  assert.equal(sceneErrorForDisplay(raw, false), 'Could not save this clip. Retry this scene.');
});

test('mergeCommittedSceneFromQuery does not replace a playable clip with stale generating', () => {
  const playable: EpisodeSceneCard = {
    ...baseScene,
    sceneVideoUrl: 'https://res.cloudinary.com/demo/video/upload/scene-2.mp4',
    sceneVideoStatus: 'pending_approval',
    catalogStatus: 'pending_approval',
    episodeSceneDocId: 'catalog-scene-2',
  };
  const merged = mergeCommittedSceneFromQuery(playable, {
    _id: 'catalog-scene-2',
    episodeId: 'episode-b',
    moduleId: 'module-1',
    sceneNumber: 2,
    startSec: 10,
    endSec: 20,
    voiceOver: '',
    visualPrompt: '',
    characterHandles: [],
    status: 'generating',
    error: 'Storage bucket does not exist (ajeoba-54fca.appspot.com). Open https://console.firebase.google.com/project/ajeoba-54fca/storage and click Get started (Blaze billing required), then retry.',
  }, 'episode-b');

  assert.equal(merged.catalogStatus, 'pending_approval');
  assert.equal(merged.sceneVideoStatus, 'pending_approval');
  assert.equal(merged.sceneVideoUrl, 'https://res.cloudinary.com/demo/video/upload/scene-2.mp4');
});
