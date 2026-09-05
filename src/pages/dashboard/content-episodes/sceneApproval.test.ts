import assert from 'node:assert/strict';
import { test } from 'node:test';
import { approvalProgress, stitchBlockedMessage, unapprovedSceneCount } from './sceneApproval.ts';

test('approval progress uses live scene statuses without chapter chrome for short episodes', () => {
  const progress = approvalProgress([
    { sceneNumber: 1, catalogStatus: 'approved' },
    { sceneNumber: 2, catalogStatus: 'pending_approval', chapterTitle: 'Chapter 1' },
    { sceneNumber: 3, catalogStatus: 'unrendered' },
  ]);
  assert.equal(progress.phase, 'pending_approval');
  assert.equal(progress.text, 'Scene 2 of 3 — awaiting your approval');
  assert.equal(unapprovedSceneCount([
    { catalogStatus: 'approved' },
    { catalogStatus: 'pending_approval' },
    { catalogStatus: 'unrendered' },
  ]), 2);
  assert.equal(stitchBlockedMessage(3), '3 scenes still need approval before rendering the full episode.');
});

test('approval progress includes in-chapter scene numbers once multiple chapters exist', () => {
  const progress = approvalProgress([
    { sceneNumber: 1, catalogStatus: 'approved', chapterIndex: 0 },
    { sceneNumber: 2, catalogStatus: 'approved', chapterIndex: 0 },
    { sceneNumber: 3, catalogStatus: 'pending_approval', chapterIndex: 1 },
    { sceneNumber: 4, catalogStatus: 'unrendered', chapterIndex: 1 },
  ]);
  assert.equal(progress.phase, 'pending_approval');
  assert.equal(progress.text, 'Chapter 2, Scene 1 (overall 3 of 4) — awaiting your approval');
});
