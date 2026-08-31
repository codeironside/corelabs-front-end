import {
  createSceneCard,
  retimeScenes,
  sceneCountForDuration,
  type EpisodeSceneCard,
  type ThemeCharacterMention,
} from './storyboard';

export type EpisodeScriptWorkflow = 'direct' | 'script' | 'scenes';

export function sceneHasGenerationContent(scene: EpisodeSceneCard): boolean {
  return Boolean(scene.voiceOver.trim() || scene.visualPrompt.trim());
}

export function scenesReadyForGeneration(scenes: EpisodeSceneCard[]): boolean {
  return scenes.length > 0 && scenes.every(sceneHasGenerationContent);
}

export function buildEmptySceneBoard(
  durationSeconds: number,
  mentions: ThemeCharacterMention[],
  defaultVoiceProfile?: string,
): EpisodeSceneCard[] {
  const count = sceneCountForDuration(durationSeconds);
  const handles = mentions.slice(0, 2).map((mention) => mention.handle);
  return retimeScenes(Array.from({ length: count }, (_, index) => createSceneCard(index, '', handles, defaultVoiceProfile)));
}

export function resolveSceneVideoGenerationContext(
  workflow: EpisodeScriptWorkflow,
  scene: EpisodeSceneCard,
  title: string,
  basePrompt: string,
): { basePrompt: string } {
  if (workflow === 'scenes') {
    const visual = scene.visualPrompt.trim();
    const voice = scene.voiceOver.trim();
    return {
      basePrompt: [
        visual || `Scene ${scene.sceneNumber} visual direction for ${title.trim() || 'this episode'}.`,
        voice ? `Voice-over context: ${voice}` : '',
      ].filter(Boolean).join('\n\n'),
    };
  }
  return { basePrompt: basePrompt.trim() || title.trim() || 'Episode draft' };
}

export function resolveEpisodeGenerationContext({
  workflow,
  title,
  basePrompt,
  scriptDraft,
  scriptApproved,
  scenes,
}: {
  workflow: EpisodeScriptWorkflow;
  title: string;
  basePrompt: string;
  scriptDraft: string;
  scriptApproved: boolean;
  scenes: EpisodeSceneCard[];
}): { basePrompt: string; approvedScript?: string } {
  if (workflow === 'script' && scriptApproved && scriptDraft.trim()) {
    return {
      basePrompt: basePrompt.trim() || title.trim() || 'Episode draft',
      approvedScript: scriptDraft.trim(),
    };
  }

  if (workflow === 'scenes' && scenes.length > 0) {
    const sceneBoard = scenes
      .map((scene) => [
        `Scene ${scene.sceneNumber} (${scene.startSec}-${scene.endSec}s)`,
        `Voice-over: ${scene.voiceOver.trim() || '(pending)'}`,
        `Visual: ${scene.visualPrompt.trim() || '(pending)'}`,
        scene.characterHandles.length ? `Characters: ${scene.characterHandles.join(', ')}` : '',
      ].filter(Boolean).join('\n'))
      .join('\n\n');

    return {
      basePrompt: [
        `Episode: ${title.trim() || 'Untitled episode'}`,
        'Authoritative segmented storyboard (scene cards are the source of truth, not the Section 1 base prompt):',
        sceneBoard,
      ].join('\n\n'),
      approvedScript: scenes.map((scene) => scene.voiceOver.trim()).filter(Boolean).join('\n\n') || undefined,
    };
  }

  return { basePrompt: basePrompt.trim() || title.trim() || 'Episode draft' };
}

export function episodeSourceRequirementsMet(
  workflow: EpisodeScriptWorkflow,
  title: string,
  basePrompt: string,
  scenes: EpisodeSceneCard[],
): { ok: boolean; message?: string } {
  if (!title.trim()) {
    return { ok: false, message: 'Add an episode title first.' };
  }
  if (workflow === 'scenes') {
    if (!scenes.length) {
      return { ok: false, message: 'Initialize the scene board before generating.' };
    }
    if (!scenesReadyForGeneration(scenes)) {
      return { ok: false, message: 'Add a voice-over or visual prompt to every scene card.' };
    }
    return { ok: true };
  }
  if (!basePrompt.trim()) {
    return { ok: false, message: 'Add a base prompt in Section 1 first.' };
  }
  return { ok: true };
}
