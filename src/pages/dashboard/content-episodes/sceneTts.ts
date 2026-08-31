import type { EpisodeSceneCard } from './storyboard';
import { resolveSceneVoiceProfile } from './storyboard';
import type { EpisodeTtsTone } from './ttsTone';

export type EpisodeSceneTtsLine = {
  id: string;
  speaker?: string;
  text: string;
  voiceProfile?: string;
  tonePreset?: string;
  toneDirection?: string;
  tonePace?: string;
  tonePitch?: number;
  status: 'idle' | 'generating' | 'ready';
  audioUrl?: string;
  label?: string;
};

export function createSceneTtsLine(
  text = '',
  voiceProfile?: string,
  speaker?: string,
  tonePreset?: string,
): EpisodeSceneTtsLine {
  return {
    id: crypto.randomUUID(),
    speaker: speaker?.trim() || undefined,
    text,
    voiceProfile,
    tonePreset,
    status: 'idle',
  };
}

export function legacyTtsLineFromScene(scene: EpisodeSceneCard): EpisodeSceneTtsLine | undefined {
  if (!scene.ttsAudioUrl) return undefined;
  return {
    id: `${scene.id}-legacy-tts`,
    text: scene.voiceOver,
    voiceProfile: scene.voiceProfile,
    status: 'ready',
    audioUrl: scene.ttsAudioUrl,
    label: scene.ttsLabel,
  };
}

function normalizeSceneTtsLine(line: NonNullable<EpisodeSceneCard['ttsLines']>[number]): EpisodeSceneTtsLine {
  const rawPitch = line.tonePitch;
  const tonePitch = typeof rawPitch === 'number'
    ? rawPitch
    : typeof rawPitch === 'string' && rawPitch.trim() !== ''
      ? Number(rawPitch)
      : undefined;
  return {
    id: line.id,
    speaker: line.speaker,
    text: line.text,
    voiceProfile: line.voiceProfile,
    tonePreset: line.tonePreset,
    toneDirection: line.toneDirection,
    tonePace: line.tonePace,
    tonePitch: Number.isFinite(tonePitch) ? tonePitch : undefined,
    status: line.status ?? 'idle',
    audioUrl: line.audioUrl,
    label: line.label,
  };
}

export function ensureSceneTtsLines(scene: EpisodeSceneCard, defaultVoiceProfile?: string): EpisodeSceneTtsLine[] {
  if (scene.ttsLines && scene.ttsLines.length > 0) {
    return scene.ttsLines.map(normalizeSceneTtsLine);
  }
  const legacy = legacyTtsLineFromScene(scene);
  if (legacy) return [legacy];
  return [{
    id: `${scene.id}-dialogue-1`,
    text: scene.voiceOver,
    voiceProfile: defaultVoiceProfile ?? scene.voiceProfile,
    status: 'idle',
  }];
}

export function aggregateSceneTtsStatus(lines: EpisodeSceneTtsLine[]): EpisodeSceneCard['ttsStatus'] {
  if (lines.some((line) => line.status === 'generating')) return 'generating';
  if (lines.some((line) => line.status === 'ready' && line.audioUrl)) return 'ready';
  return 'idle';
}

export function sceneHasReadyTts(scene: EpisodeSceneCard): boolean {
  const lines = ensureSceneTtsLines(scene);
  return lines.some((line) => line.status === 'ready' && Boolean(line.audioUrl));
}

export function sceneIsGeneratingTts(scene: EpisodeSceneCard): boolean {
  const lines = ensureSceneTtsLines(scene);
  return lines.some((line) => line.status === 'generating');
}

export function resolveTtsLineVoiceProfile(
  line: EpisodeSceneTtsLine,
  scene: EpisodeSceneCard,
  fallback: string,
): string {
  return line.voiceProfile?.trim() || resolveSceneVoiceProfile(scene, fallback);
}

export function syncSceneLegacyTtsFields(scene: EpisodeSceneCard): Pick<EpisodeSceneCard, 'ttsLines' | 'ttsStatus' | 'ttsAudioUrl' | 'ttsLabel'> {
  const ttsLines = ensureSceneTtsLines(scene);
  const readyLine = ttsLines.find((line) => line.status === 'ready' && line.audioUrl);
  return {
    ttsLines,
    ttsStatus: aggregateSceneTtsStatus(ttsLines),
    ttsAudioUrl: readyLine?.audioUrl,
    ttsLabel: readyLine?.label,
  };
}

export function ttsLineTimelineWindow(
  scene: Pick<EpisodeSceneCard, 'startSec' | 'endSec'>,
  lineIndex: number,
  lineCount: number,
): { startSec: number; endSec: number } {
  const duration = Math.max(1, scene.endSec - scene.startSec);
  const slot = duration / Math.max(1, lineCount);
  return {
    startSec: scene.startSec + lineIndex * slot,
    endSec: scene.startSec + (lineIndex + 1) * slot,
  };
}

export function updateSceneTtsLine(
  scene: EpisodeSceneCard,
  lineId: string,
  patch: Partial<EpisodeSceneTtsLine>,
  defaultVoiceProfile?: string,
): EpisodeSceneCard {
  const lines = ensureSceneTtsLines(scene, defaultVoiceProfile).map((line) =>
    line.id === lineId ? { ...line, ...patch } : line,
  );
  return { ...scene, ...syncSceneLegacyTtsFields({ ...scene, ttsLines: lines }) };
}

export function addSceneTtsLine(
  scene: EpisodeSceneCard,
  defaultVoiceProfile?: string,
  defaultTone?: EpisodeTtsTone,
): EpisodeSceneCard {
  const lines = [
    ...ensureSceneTtsLines(scene, defaultVoiceProfile),
    createSceneTtsLine('', defaultVoiceProfile ?? scene.voiceProfile, undefined, defaultTone?.preset),
  ];
  return { ...scene, ...syncSceneLegacyTtsFields({ ...scene, ttsLines: lines }) };
}

export function removeSceneTtsLine(
  scene: EpisodeSceneCard,
  lineId: string,
  defaultVoiceProfile?: string,
): EpisodeSceneCard {
  const current = ensureSceneTtsLines(scene, defaultVoiceProfile);
  const lines = current.length <= 1 ? current : current.filter((line) => line.id !== lineId);
  return { ...scene, ...syncSceneLegacyTtsFields({ ...scene, ttsLines: lines }) };
}

export function invalidateSceneTtsLines(scene: EpisodeSceneCard, defaultVoiceProfile?: string): EpisodeSceneCard {
  const lines = ensureSceneTtsLines(scene, defaultVoiceProfile).map((line) => ({
    ...line,
    status: 'idle' as const,
    audioUrl: undefined,
    label: undefined,
  }));
  return {
    ...scene,
    ttsLines: lines,
    ttsStatus: 'idle',
    ttsAudioUrl: undefined,
    ttsLabel: undefined,
  };
}
