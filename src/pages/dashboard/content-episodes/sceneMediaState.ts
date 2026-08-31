import type { ContentEpisodeScene } from '@/api/content';
import type { EpisodeSceneCard } from './storyboard';
import { studioStreamMediaUrl } from './studioMediaUrl';
import { aggregateSceneTtsStatus, type EpisodeSceneTtsLine } from './sceneTts';

export function sceneDocEpisodeKey(doc: Pick<ContentEpisodeScene, 'episodeId' | 'sceneNumber'>) {
  return `${doc.episodeId}:${doc.sceneNumber}`;
}

export function shouldApplySceneDocToCard(
  scene: EpisodeSceneCard,
  sceneDoc: ContentEpisodeScene,
  pollEpisodeId?: string,
) {
  if (scene.episodeSceneDocId && sceneDoc._id === scene.episodeSceneDocId) {
    return true;
  }

  const linkedEpisodeId = pollEpisodeId ?? scene.sceneVideoTakeId;
  if (!linkedEpisodeId) {
    return scene.sceneVideoStatus === 'generating' && sceneDoc.sceneNumber === scene.sceneNumber;
  }

  return String(sceneDoc.episodeId) === String(linkedEpisodeId) && sceneDoc.sceneNumber === scene.sceneNumber;
}

function ttsLinesFromDoc(sceneDoc: ContentEpisodeScene): EpisodeSceneTtsLine[] | undefined {
  if (sceneDoc.ttsLines && sceneDoc.ttsLines.length > 0) {
    return sceneDoc.ttsLines.map((line) => ({
      id: line.id,
      speaker: line.speaker,
      text: line.text,
      voiceProfile: line.voiceProfile,
      tonePreset: line.tonePreset,
      toneDirection: line.toneDirection,
      tonePace: line.tonePace,
      tonePitch: typeof line.tonePitch === 'number' ? line.tonePitch : undefined,
      status: line.audioUrl ? 'ready' as const : 'idle' as const,
      audioUrl: line.audioUrl ? studioStreamMediaUrl(line.audioUrl) : undefined,
      label: line.label,
    }));
  }

  if (!sceneDoc.ttsAudioUrl) return undefined;
  return [{
    id: `${sceneDoc._id}-legacy-tts`,
    text: sceneDoc.voiceOver ?? '',
    voiceProfile: sceneDoc.voiceProfile,
    status: 'ready',
    audioUrl: studioStreamMediaUrl(sceneDoc.ttsAudioUrl),
    label: sceneDoc.ttsLabel,
  }];
}

export function mergeSceneMediaFromDoc(
  scene: EpisodeSceneCard,
  sceneDoc: ContentEpisodeScene,
): EpisodeSceneCard {
  const videoUrl = sceneDoc.cloudinaryUrl || sceneDoc.videoUrl || sceneDoc.s3Url;
  const ttsLines = ttsLinesFromDoc(sceneDoc);
  const readyLine = ttsLines?.find((line) => line.audioUrl);

  return {
    ...scene,
    sceneVideoStatus: sceneDoc.status === 'queued' ? 'generating' : sceneDoc.status,
    ...(videoUrl ? { sceneVideoUrl: videoUrl } : {}),
    sceneVideoTakeId: sceneDoc.episodeId,
    episodeSceneDocId: sceneDoc._id,
    ...(ttsLines
      ? {
          ttsLines,
          ttsStatus: aggregateSceneTtsStatus(ttsLines),
          ttsAudioUrl: readyLine?.audioUrl,
          ttsLabel: readyLine?.label,
        }
      : {}),
    ...(sceneDoc.voiceProfile ? { voiceProfile: sceneDoc.voiceProfile } : {}),
  };
}

export function episodeSceneCardFromDoc(scene: ContentEpisodeScene): EpisodeSceneCard {
  const videoUrl = scene.cloudinaryUrl || scene.videoUrl || scene.s3Url;
  const ttsLines = ttsLinesFromDoc(scene);

  return {
    id: scene._id,
    sceneNumber: scene.sceneNumber,
    startSec: scene.startSec,
    endSec: scene.endSec,
    voiceOver: scene.voiceOver ?? '',
    visualPrompt: scene.visualPrompt ?? '',
    characterHandles: scene.characterHandles ?? [],
    selectedCharacterRefIds: [],
    approved: scene.status === 'ready',
    ttsLines,
    ttsStatus: ttsLines ? aggregateSceneTtsStatus(ttsLines) : 'idle',
    ttsAudioUrl: ttsLines?.find((line) => line.audioUrl)?.audioUrl,
    ttsLabel: ttsLines?.find((line) => line.label)?.label,
    voiceProfile: scene.voiceProfile,
    sceneVideoStatus: scene.status === 'queued' ? 'generating' : scene.status,
    sceneVideoUrl: videoUrl,
    sceneVideoTakeId: scene.episodeId,
    episodeSceneDocId: scene._id,
  };
}
