import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultRangeExtractor } from '@tanstack/virtual-core';
import {
  chapterStatusSummary,
  defaultChapterCollapsedMap,
  episodeNeedsNarrationTts,
  flattenCommittedBoardRows,
  groupScenesByChapter,
  needsChapterSplit,
  seedSyntheticCommittedScenes,
} from './episodePipeline.ts';
import { approvalProgress, focusApprovalScene } from './sceneApproval.ts';
import { formatEpisodeRuntimeLabel, sceneCountForDuration } from './storyboard.ts';
import { isTargetRuntimeLocked } from './episodeRuntimeLock.ts';

test('target runtime presets map to uncapped scene counts', () => {
  assert.equal(sceneCountForDuration(60), 6);
  assert.equal(sceneCountForDuration(300), 30);
  assert.equal(sceneCountForDuration(600), 60);
  assert.equal(sceneCountForDuration(1800), 180);
  assert.equal(sceneCountForDuration(3600), 360);
  assert.equal(sceneCountForDuration(7200), 720);
  assert.equal(formatEpisodeRuntimeLabel(3600), '1h');
  assert.equal(formatEpisodeRuntimeLabel(7200), '2h');
  assert.equal(needsChapterSplit('short script', 3600), true);
  assert.equal(needsChapterSplit('short script', 7200), true);
  assert.equal(needsChapterSplit('short script', 60), false);
});

test('TTS is skipped when default scene video audio is on', () => {
  assert.equal(episodeNeedsNarrationTts(true), false);
  assert.equal(episodeNeedsNarrationTts(false), true);
  assert.equal(episodeNeedsNarrationTts(undefined), true);
});

test('target runtime locks after video generation starts, not after TTS', () => {
  assert.equal(isTargetRuntimeLocked({ episodeStatus: 'draft' }), false);
  assert.equal(isTargetRuntimeLocked({ episodeStatus: 'scenes_ready' }), false);
  assert.equal(isTargetRuntimeLocked({ episodeStatus: 'generating' }), true);
  assert.equal(isTargetRuntimeLocked({
    episodeStatus: 'draft',
    scenes: [{ catalogStatus: 'pending_approval' }],
  }), true);
  assert.equal(isTargetRuntimeLocked({
    episodeStatus: 'draft',
    sceneDocs: [{ status: 'generating' }],
  }), true);
});

test('single-chapter episodes stay a flat list with no Chapter 1 wrapper', () => {
  const scenes = seedSyntheticCommittedScenes(8, 1);
  const groups = groupScenesByChapter(scenes);
  assert.equal(groups.length, 1);
  const rows = flattenCommittedBoardRows(groups, {}, false);
  assert.equal(rows.length, 8);
  assert.ok(rows.every((row) => row.kind === 'scene'));
});

test('chapter headers collapse non-focus chapters and keep status summaries', () => {
  const scenes = seedSyntheticCommittedScenes(84, 2);
  const groups = groupScenesByChapter(scenes);
  assert.equal(groups.length, 2);
  const focus = focusApprovalScene(scenes);
  assert.equal(focus?.catalogStatus, 'pending_approval');
  const collapsed = defaultChapterCollapsedMap(groups, focus?.chapterIndex);
  const rows = flattenCommittedBoardRows(groups, collapsed, true);
  const headers = rows.filter((row) => row.kind === 'header');
  assert.equal(headers.length, 2);
  assert.match(headers[0]?.kind === 'header' ? headers[0].title : '', /Chapter 1/);
  assert.equal(chapterStatusSummary(groups[0]?.scenes ?? []), '6/42 approved, 1 pending');
  const visibleScenes = rows.filter((row) => row.kind === 'scene');
  assert.ok(visibleScenes.length < scenes.length);
  assert.ok(visibleScenes.some((row) => row.kind === 'scene' && row.scene.id === focus?.id));
});

function virtualWindowCount(count: number, itemSize: number, viewport: number, scrollTop: number, overscan: number): number {
  if (count <= 0) return 0;
  const maxOffset = Math.max(0, count * itemSize - 1);
  const offset = Math.min(Math.max(0, scrollTop), maxOffset);
  const startIndex = Math.min(count - 1, Math.max(0, Math.floor(offset / itemSize)));
  const endIndex = Math.min(count - 1, Math.max(startIndex, Math.ceil((offset + viewport) / itemSize) - 1));
  return defaultRangeExtractor({ startIndex, endIndex, overscan, count }).length;
}

test('500-scene board: grouping, flatten, and virtual window stay bounded', () => {
  const seedStart = performance.now();
  const scenes = seedSyntheticCommittedScenes(500, 12);
  const seedMs = performance.now() - seedStart;

  const groupStart = performance.now();
  const groups = groupScenesByChapter(scenes);
  const focus = focusApprovalScene(scenes);
  const collapsed = defaultChapterCollapsedMap(groups, focus?.chapterIndex);
  const collapsedRows = flattenCommittedBoardRows(groups, collapsed, true);
  const expanded = Object.fromEntries(groups.map((group) => [group.chapterIndex, false]));
  const rows = flattenCommittedBoardRows(groups, expanded, true);
  const groupMs = performance.now() - groupStart;

  assert.equal(scenes.length, 500);
  assert.equal(groups.length, 12);
  assert.equal(approvalProgress(scenes).text.includes('awaiting your approval'), true);
  assert.ok(collapsedRows.length < 80, `collapsed long episode should not flatten all 500 scenes, got ${collapsedRows.length}`);
  assert.equal(rows.filter((row) => row.kind === 'scene').length, 500);

  const viewport = 800;
  const itemSize = 720;
  const overscan = 4;
  const contentHeight = rows.length * itemSize;
  const topCount = virtualWindowCount(rows.length, itemSize, viewport, 0, overscan);
  const midCount = virtualWindowCount(rows.length, itemSize, viewport, contentHeight / 2, overscan);
  const endCount = virtualWindowCount(rows.length, itemSize, viewport, contentHeight, overscan);

  const scrollStart = performance.now();
  for (let offset = 0; offset <= contentHeight; offset += 16) {
    virtualWindowCount(rows.length, itemSize, viewport, offset, overscan);
  }
  const scrollLoopMs = performance.now() - scrollStart;
  const frames = Math.floor(contentHeight / 16) + 1;
  const avgScrollUpdateMs = scrollLoopMs / frames;
  const frameBudgetMs = 1000 / 60;

  console.log(JSON.stringify({
    sceneCount: scenes.length,
    chapterCount: groups.length,
    flattenedRowsExpanded: rows.length,
    flattenedRowsCollapsed: collapsedRows.length,
    seedMs: Number(seedMs.toFixed(3)),
    groupFlattenMs: Number(groupMs.toFixed(3)),
    virtualItemsAtTop: topCount,
    virtualItemsAtMid: midCount,
    virtualItemsAtEnd: endCount,
    scrollFrames: frames,
    scrollLoopMs: Number(scrollLoopMs.toFixed(3)),
    avgScrollUpdateMs: Number(avgScrollUpdateMs.toFixed(4)),
    frameBudgetMs,
    rangeExtractorFits60Fps: avgScrollUpdateMs < frameBudgetMs,
    note: 'Range-extractor time only. Browser compositor FPS was not measured (no Playwright in this repo).',
  }, null, 2));

  assert.ok(topCount <= 12, `virtual window at top should stay small, got ${topCount}`);
  assert.ok(midCount <= 12, `virtual window at mid should stay small, got ${midCount}`);
  assert.ok(groupMs < 50, `grouping 500 scenes should be well under 50ms, took ${groupMs}ms`);
  assert.ok(avgScrollUpdateMs < 1, `virtualizer range updates should be sub-millisecond, took ${avgScrollUpdateMs}ms`);
});
