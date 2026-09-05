import type { SceneBeat } from '@/api/content';
import type { EpisodeSceneCard } from './storyboard';

export function beatsToSceneCards(beats: SceneBeat[]): EpisodeSceneCard[] {
  return beats.map((beat, index) => ({
    id: `pipeline-beat-${beat.beatIndex ?? index}`,
    sceneNumber: (beat.beatIndex ?? index) + 1,
    startSec: index * beat.durationSec,
    endSec: (index + 1) * beat.durationSec,
    voiceOver: beat.dialogueSummary ?? '',
    visualPrompt: `${beat.setting}. ${beat.actionSummary}`.trim(),
    characterHandles: beat.characterHandles ?? [],
    selectedCharacterRefIds: [],
    approved: false,
    ttsLines: [],
    ttsStatus: 'idle',
    sceneVideoStatus: 'idle',
    chapterIndex: beat.chapterIndex ?? 0,
    chapterTitle: beat.chapterTitle ?? '',
  }));
}

export const CHAPTER_CHUNK_THRESHOLD_SEC = 600;
export const SPOKEN_WORDS_PER_MINUTE = 150;
export const SHORT_SCRIPT_MAX_CHARS = 8000;

export function estimatedSpokenSeconds(script: string): number {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(10, Math.round((words / SPOKEN_WORDS_PER_MINUTE) * 60));
}

/** Same heuristic as the backend: runtime or spoken estimate > 10m, or script over the single-call ceiling. */
export function needsChapterSplit(script: string, runtimeTargetSeconds: number): boolean {
  return Math.max(estimatedSpokenSeconds(script), runtimeTargetSeconds) > CHAPTER_CHUNK_THRESHOLD_SEC
    || script.trim().length > SHORT_SCRIPT_MAX_CHARS;
}

export function groupScenesByChapter(scenes: EpisodeSceneCard[]): Array<{ chapterIndex: number; title: string; scenes: EpisodeSceneCard[] }> {
  const map = new Map<number, { chapterIndex: number; title: string; scenes: EpisodeSceneCard[] }>();
  for (const scene of scenes) {
    const chapterIndex = scene.chapterIndex ?? 0;
    const existing = map.get(chapterIndex);
    if (existing) {
      existing.scenes.push(scene);
      continue;
    }
    map.set(chapterIndex, {
      chapterIndex,
      title: scene.chapterTitle || `Chapter ${chapterIndex + 1}`,
      scenes: [scene],
    });
  }
  return [...map.values()].sort((left, right) => left.chapterIndex - right.chapterIndex);
}

export function groupBeatsByChapter(beats: SceneBeat[]): Array<{ chapterIndex: number; title: string; beats: SceneBeat[] }> {
  const map = new Map<number, { chapterIndex: number; title: string; beats: SceneBeat[] }>();
  for (const beat of beats) {
    const chapterIndex = beat.chapterIndex ?? 0;
    const existing = map.get(chapterIndex);
    if (existing) {
      existing.beats.push(beat);
      continue;
    }
    map.set(chapterIndex, {
      chapterIndex,
      title: beat.chapterTitle || `Chapter ${chapterIndex + 1}`,
      beats: [beat],
    });
  }
  return [...map.values()].sort((left, right) => left.chapterIndex - right.chapterIndex);
}

export type ChapterSceneGroup = {
  chapterIndex: number;
  title: string;
  scenes: EpisodeSceneCard[];
};

export function chapterStatusSummary(scenes: EpisodeSceneCard[]): string {
  const total = scenes.length;
  const approved = scenes.filter((scene) => scene.catalogStatus === 'approved').length;
  const pending = scenes.filter((scene) => scene.catalogStatus === 'pending_approval').length;
  const generating = scenes.filter((scene) => scene.catalogStatus === 'generating' || scene.catalogStatus === 'queued').length;
  const parts = [`${approved}/${total} approved`];
  if (pending) parts.push(`${pending} pending`);
  if (generating) parts.push(`${generating} generating`);
  return parts.join(', ');
}

export function chapterRangeLabel(scenes: EpisodeSceneCard[]): string {
  if (scenes.length === 0) return 'Scenes —';
  const first = scenes[0]?.sceneNumber ?? 1;
  const last = scenes[scenes.length - 1]?.sceneNumber ?? first;
  return first === last ? `Scene ${first}` : `Scenes ${first}–${last}`;
}

export type CommittedBoardRow =
  | {
    kind: 'header';
    chapterIndex: number;
    title: string;
    rangeLabel: string;
    summary: string;
  }
  | {
    kind: 'scene';
    scene: EpisodeSceneCard;
    index: number;
  };

export function flattenCommittedBoardRows(
  groups: ChapterSceneGroup[],
  collapsed: Record<number, boolean>,
  grouped: boolean,
): CommittedBoardRow[] {
  if (!grouped) {
    return groups.flatMap((group) => group.scenes).map((scene, index) => ({ kind: 'scene' as const, scene, index }));
  }

  const rows: CommittedBoardRow[] = [];
  let index = 0;
  for (const group of groups) {
    rows.push({
      kind: 'header',
      chapterIndex: group.chapterIndex,
      title: group.title || `Chapter ${group.chapterIndex + 1}`,
      rangeLabel: chapterRangeLabel(group.scenes),
      summary: chapterStatusSummary(group.scenes),
    });
    if (collapsed[group.chapterIndex]) {
      index += group.scenes.length;
      continue;
    }
    for (const scene of group.scenes) {
      rows.push({ kind: 'scene', scene, index });
      index += 1;
    }
  }
  return rows;
}

export function defaultChapterCollapsedMap(
  groups: ChapterSceneGroup[],
  focusChapterIndex: number | undefined,
): Record<number, boolean> {
  const collapsed: Record<number, boolean> = {};
  for (const group of groups) {
    collapsed[group.chapterIndex] = focusChapterIndex == null
      ? group.chapterIndex !== groups[0]?.chapterIndex
      : group.chapterIndex !== focusChapterIndex;
  }
  return collapsed;
}

export function seedSyntheticCommittedScenes(count: number, chapterCount = 12): EpisodeSceneCard[] {
  const chapters = Math.max(1, chapterCount);
  const perChapter = Math.max(1, Math.ceil(count / chapters));
  return Array.from({ length: count }, (_, index) => {
    const chapterIndex = Math.min(chapters - 1, Math.floor(index / perChapter));
    const pendingIndex = Math.min(count - 1, Math.max(0, Math.floor(count * 0.08)));
    return {
      id: `seed-scene-${index + 1}`,
      sceneNumber: index + 1,
      startSec: index * 10,
      endSec: (index + 1) * 10,
      voiceOver: `Voice-over for scene ${index + 1}.`,
      visualPrompt: `Visual direction for scene ${index + 1}.`,
      characterHandles: [],
      approved: index < pendingIndex,
      ttsStatus: 'idle' as const,
      catalogStatus: index === pendingIndex
        ? 'pending_approval'
        : index < pendingIndex
          ? 'approved'
          : 'unrendered',
      episodeSceneDocId: `seed-doc-${index + 1}`,
      chapterIndex,
      chapterTitle: `Chapter ${chapterIndex + 1}`,
    };
  });
}
