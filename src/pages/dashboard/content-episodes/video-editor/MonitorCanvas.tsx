import { MonitorPlay } from 'lucide-react';
import { ProtectedStudioVideo } from '../ProtectedStudioVideo';
import type { EpisodeSceneCard } from '../storyboard';
import { segmentVideoUrl } from './editorUtils';
import type { EditorAspectRatio, EpisodeTimelineSegment } from './types';

export function MonitorCanvas({
  aspectRatio,
  selectedScene,
  selectedSegment,
  finalVideoUrl,
}: {
  aspectRatio: EditorAspectRatio;
  selectedScene?: EpisodeSceneCard;
  selectedSegment?: EpisodeTimelineSegment;
  finalVideoUrl?: string;
}) {
  const selectedVideoUrl = segmentVideoUrl(selectedSegment);

  return (
    <div className="rounded-xl border border-border bg-[var(--color-ash-brown)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-vanilla-cream)]/70">Composition Live Monitor</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-vanilla-cream)]">{selectedScene ? `Scene ${selectedScene.sceneNumber}` : 'No scene selected'}</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-[var(--color-vanilla-cream)]">{aspectRatio}</span>
      </div>
      <div className={`mx-auto mt-4 flex items-center justify-center overflow-hidden rounded-xl bg-black studio-preview-frame ${aspectRatio === '9:16' ? 'studio-preview-frame--portrait' : ''}`}>
        {selectedVideoUrl ? (
          <ProtectedStudioVideo originUrl={selectedVideoUrl} className="h-full w-full" />
        ) : finalVideoUrl ? (
          <ProtectedStudioVideo originUrl={finalVideoUrl} className="h-full w-full" />
        ) : (
          <div className="px-8 text-center">
            <MonitorPlay size={38} className="mx-auto text-[var(--color-vanilla-cream)]" />
            <p className="mt-3 text-sm font-semibold text-[var(--color-vanilla-cream)]">Timeline preview</p>
            <p className="mt-1 text-xs text-[var(--color-vanilla-cream)]/70">Rendered scene clips and the compiled master appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
