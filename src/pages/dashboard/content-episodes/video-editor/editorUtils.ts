import type { EpisodeSceneCard } from '../storyboard';
import type { EpisodeTimelineSegment, SubtitleCue } from './types';

export function timecode(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function segmentVideoUrl(segment?: Pick<EpisodeTimelineSegment, 'cloudinaryUrl' | 'videoUrl' | 's3Url'>) {
  return segment?.cloudinaryUrl || segment?.videoUrl || segment?.s3Url || '';
}

export function resolveSceneClipVideoUrl(
  scene: Pick<EpisodeSceneCard, 'sceneVideoUrl'>,
  segment?: Pick<EpisodeTimelineSegment, 'cloudinaryUrl' | 'videoUrl' | 's3Url'>,
) {
  return segmentVideoUrl(segment) || scene.sceneVideoUrl || '';
}

export function sceneDuration(scene: Pick<EpisodeSceneCard, 'startSec' | 'endSec'>) {
  return Math.max(1, scene.endSec - scene.startSec);
}

export function timelineWidth(seconds: number, zoom: number) {
  return Math.max(1, Math.round(seconds * zoom));
}

export function statusLabel(status?: EpisodeTimelineSegment['status'] | EpisodeSceneCard['sceneVideoStatus'] | EpisodeSceneCard['catalogStatus']) {
  if (!status) return 'Unrendered';
  if (status === 'queued') return 'Queued';
  if (status === 'generating') return 'Generating';
  if (status === 'pending_approval') return 'Pending approval';
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'unrendered') return 'Unrendered';
  if (status === 'ready') return 'Clip ready';
  return 'Clip failed';
}

export function clipStatusClass(status?: EpisodeTimelineSegment['status'] | EpisodeSceneCard['sceneVideoStatus'] | EpisodeSceneCard['catalogStatus']) {
  if (status === 'ready' || status === 'approved') return 'bg-[var(--color-muted-olive)] text-[var(--color-vanilla-cream)]';
  if (status === 'pending_approval') return 'bg-[var(--color-tea-green)]/55 text-[var(--color-ash-brown)]';
  if (status === 'failed' || status === 'rejected') return 'bg-red-100 text-red-700';
  if (status === 'generating' || status === 'queued') return 'bg-[var(--color-faded-copper)]/25 text-[var(--color-ash-brown)]';
  return 'bg-[var(--color-tea-green)]/35 text-[var(--color-ash-brown)]';
}

export function buildSubtitleCues(scenes: EpisodeSceneCard[]): SubtitleCue[] {
  return scenes.flatMap((scene) => {
    const phrases = scene.voiceOver
      .split(/(?<=[.!?])\s+/)
      .map((phrase) => phrase.trim())
      .filter(Boolean);
    if (phrases.length === 0) return [];

    const duration = sceneDuration(scene);
    const slice = duration / phrases.length;
    return phrases.map((text, index) => ({
      id: `${scene.id}-cue-${index}`,
      sceneId: scene.id,
      startSec: Math.round((scene.startSec + slice * index) * 10) / 10,
      endSec: Math.round((scene.startSec + slice * (index + 1)) * 10) / 10,
      text,
    }));
  });
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeSubtitleCue(cue: SubtitleCue, totalDuration: number): SubtitleCue {
  const minSpan = 0.2;
  const startSec = clamp(cue.startSec, 0, Math.max(0, totalDuration - minSpan));
  const endSec = clamp(Math.max(cue.endSec, startSec + minSpan), startSec + minSpan, totalDuration);
  return { ...cue, startSec: Math.round(startSec * 10) / 10, endSec: Math.round(endSec * 10) / 10 };
}
