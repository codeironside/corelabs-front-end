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
