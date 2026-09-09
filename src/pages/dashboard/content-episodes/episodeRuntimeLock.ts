const LOCKED_EPISODE_STATUSES = new Set([
  'generating',
  'review',
  'queued',
  'ready',
  'published',
]);

const LOCKED_SCENE_STATUSES = new Set([
  'generating',
  'queued',
  'pending_approval',
  'approved',
  'ready',
]);

export const TARGET_RUNTIME_LOCKED_MESSAGE =
  'Target runtime is locked because video generation has started. Changing it would desync scene timings.';

export function isTargetRuntimeLocked(input: {
  episodeStatus?: string | null;
  scenes?: Array<{
    catalogStatus?: string;
    sceneVideoStatus?: string;
    sceneVideoUrl?: string;
    generationStartedAt?: string;
  }>;
  sceneDocs?: Array<{
    status?: string;
    videoUrl?: string;
    cloudinaryUrl?: string;
    s3Url?: string;
    generationStartedAt?: string;
  }>;
}): boolean {
  if (input.episodeStatus && LOCKED_EPISODE_STATUSES.has(input.episodeStatus)) return true;
  if ((input.scenes ?? []).some((scene) => (
    Boolean(scene.sceneVideoUrl)
    || Boolean(scene.generationStartedAt)
    || (scene.catalogStatus ? LOCKED_SCENE_STATUSES.has(scene.catalogStatus) : false)
    || scene.sceneVideoStatus === 'generating'
    || scene.sceneVideoStatus === 'pending_approval'
    || scene.sceneVideoStatus === 'ready'
  ))) {
    return true;
  }
  return (input.sceneDocs ?? []).some((scene) => (
    Boolean(scene.videoUrl || scene.cloudinaryUrl || scene.s3Url)
    || Boolean(scene.generationStartedAt)
    || (scene.status ? LOCKED_SCENE_STATUSES.has(scene.status) : false)
  ));
}
