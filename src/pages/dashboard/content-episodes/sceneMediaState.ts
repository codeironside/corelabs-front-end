import type { ContentEpisodeScene } from '@/api/content';
import type { EpisodeSceneCard, ThemeCharacterReference } from './storyboard';
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

function selectedCharacterRefIdsFromScene(scene: ContentEpisodeScene): string[] {
  const fromContext = scene.generationContext?.selectedCharacterRefIds;
  if (Array.isArray(fromContext)) {
    return fromContext.filter((id): id is string => typeof id === 'string' && Boolean(id));
  }
  return (scene.charactersPresent ?? []).map((id) => String(id));
}

export function characterRefIdsFromScenes(scenes: ContentEpisodeScene[]): string[] {
  return [...new Set(scenes.flatMap((scene) => selectedCharacterRefIdsFromScene(scene)))];
}

export function restoreSelectedCharacterRefIds(
  scenes: ContentEpisodeScene[],
  themeRefs: ThemeCharacterReference[],
): string[] {
  const stored = characterRefIdsFromScenes(scenes);
  if (themeRefs.length === 0) return stored;

  const fromStored = stored.filter((id) =>
    themeRefs.some((reference) => reference.id === id || reference.characterId === id),
  );
  const handles = new Set(
    scenes.flatMap((scene) => (scene.characterHandles ?? []).map((handle) => handle.replace(/^@/, '').toLowerCase())),
  );
  const fromHandles = themeRefs
    .filter((reference) => handles.has(reference.handle.replace(/^@/, '').toLowerCase()))
    .map((reference) => reference.id);

  return [...new Set([...fromStored, ...fromHandles])];
}

export function sceneCatalogStatusLabel(status?: ContentEpisodeScene['status'] | EpisodeSceneCard['catalogStatus']): string {
  if (!status || status === 'unrendered') return 'Unrendered';
  if (status === 'pending_approval') return 'Pending approval';
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'generating') return 'Generating';
  if (status === 'queued') return 'Queued';
  if (status === 'ready') return 'Ready';
  return 'Failed';
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

function sceneVideoStatusFromDoc(
  status: ContentEpisodeScene["status"],
): EpisodeSceneCard["sceneVideoStatus"] {
  if (status === "unrendered") return "idle";
  if (status === "pending_approval") return "pending_approval";
  if (status === "queued" || status === "generating") return "generating";
  if (status === "ready" || status === "approved") return "ready";
  return "failed";
}

export function mergeSceneMediaFromDoc(
  scene: EpisodeSceneCard,
  sceneDoc: ContentEpisodeScene,
  catalogEpisodeId?: string,
): EpisodeSceneCard {
  const videoUrl = sceneDoc.cloudinaryUrl || sceneDoc.videoUrl || sceneDoc.s3Url;
  const ttsLines = ttsLinesFromDoc(sceneDoc);
  const readyLine = ttsLines?.find((line) => line.audioUrl);
  const docIsCatalog = !catalogEpisodeId || String(sceneDoc.episodeId) === String(catalogEpisodeId);

  if (!docIsCatalog) {
    return {
      ...scene,
      ...(videoUrl ? { sceneVideoUrl: videoUrl } : {}),
      sceneVideoTakeId: sceneDoc.episodeId,
    };
  }

  return {
    ...scene,
    sceneVideoStatus: sceneVideoStatusFromDoc(sceneDoc.status),
    ...(videoUrl ? { sceneVideoUrl: videoUrl } : {}),
    sceneVideoTakeId: scene.sceneVideoTakeId ?? sceneDoc.episodeId,
    episodeSceneDocId: sceneDoc._id,
    catalogStatus: sceneDoc.status,
    approved: sceneDoc.status === 'approved',
    generationStartedAt: sceneDoc.generationStartedAt,
    updatedAt: sceneDoc.updatedAt,
    ...(sceneDoc.lastFrameUrl ? { lastFrameUrl: sceneDoc.lastFrameUrl } : {}),
    ...(ttsLines
      ? {
          ttsLines,
          ttsStatus: aggregateSceneTtsStatus(ttsLines),
          ttsAudioUrl: readyLine?.audioUrl,
          ttsLabel: readyLine?.label,
        }
      : {}),
    ...(sceneDoc.voiceProfile ? { voiceProfile: sceneDoc.voiceProfile } : {}),
    ...(sceneDoc.audioSegmentUrl ? { audioSegmentUrl: sceneDoc.audioSegmentUrl } : {}),
  };
}

export function catalogSceneActionId(
  scene: Pick<EpisodeSceneCard, 'id' | 'sceneNumber' | 'episodeSceneDocId'>,
  catalogEpisodeId?: string,
  catalogScenes: Array<Pick<ContentEpisodeScene, '_id' | 'episodeId' | 'sceneNumber'>> = [],
): string {
  if (catalogEpisodeId) {
    const match = catalogScenes.find(
      (doc) => String(doc.episodeId) === String(catalogEpisodeId) && doc.sceneNumber === scene.sceneNumber,
    );
    if (match) return match._id;
  }
  return scene.episodeSceneDocId ?? scene.id;
}

export function episodeSceneCardFromDoc(scene: ContentEpisodeScene): EpisodeSceneCard {
  const videoUrl = scene.cloudinaryUrl || scene.videoUrl || scene.s3Url;
  const ttsLines = ttsLinesFromDoc(scene);

  return {
    id: scene._id,
    sceneNumber: scene.sceneNumber,
    startSec: scene.startSeconds ?? scene.startSec,
    endSec: scene.endSeconds ?? scene.endSec,
    voiceOver: scene.voiceoverText ?? scene.voiceOver ?? '',
    visualPrompt: scene.beatDescription ?? scene.visualPrompt ?? '',
    characterHandles: scene.characterHandles ?? [],
    selectedCharacterRefIds: selectedCharacterRefIdsFromScene(scene),
    catalogStatus: scene.status,
    approved: scene.status === 'approved',
    ttsLines,
    ttsStatus: ttsLines ? aggregateSceneTtsStatus(ttsLines) : 'idle',
    ttsAudioUrl: ttsLines?.find((line) => line.audioUrl)?.audioUrl,
    ttsLabel: ttsLines?.find((line) => line.label)?.label,
    audioSegmentUrl: scene.audioSegmentUrl,
    voiceProfile: scene.voiceProfile,
    sceneVideoStatus: sceneVideoStatusFromDoc(scene.status),
    sceneVideoUrl: videoUrl,
    sceneVideoTakeId: scene.episodeId,
    episodeSceneDocId: scene._id,
    lastFrameUrl: scene.lastFrameUrl,
    chapterIndex: scene.chapterIndex ?? 0,
    chapterTitle: scene.chapterLabel || (typeof scene.chapterIndex === 'number' ? `Chapter ${scene.chapterIndex + 1}` : undefined),
    generationStartedAt: scene.generationStartedAt,
    updatedAt: scene.updatedAt,
  };
}
