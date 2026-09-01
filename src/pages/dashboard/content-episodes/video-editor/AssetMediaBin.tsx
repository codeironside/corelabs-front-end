import { useState } from 'react';
import { ImageIcon, Layers3, MonitorPlay, Volume2 } from 'lucide-react';
import { ProtectedStudioImage } from '../ProtectedStudioImage';
import type { ContentModule } from '@/api/content';
import type { EpisodeSceneCard, ThemeCharacterReference } from '../storyboard';
import { clipStatusClass, statusLabel, timecode } from './editorUtils';
import type { EditorAssetTab, EpisodeAssetBinItem, EpisodeTimelineSegment } from './types';

const assetTabs: Array<{ id: EditorAssetTab; label: string }> = [
  { id: 'cast', label: 'Theme Character Cast' },
  { id: 'video', label: 'AI Video Generates' },
  { id: 'audio', label: 'Audio & Voice Tracks' },
  { id: 'brand', label: 'Global Brand Kits' },
];

export function AssetMediaBin({
  selectedModule,
  scenes,
  activeSegments,
  themeCharacterRefs,
  assets,
  moduleDestinations,
  onSelectScene,
}: {
  selectedModule?: ContentModule;
  scenes: EpisodeSceneCard[];
  activeSegments: EpisodeTimelineSegment[];
  themeCharacterRefs: ThemeCharacterReference[];
  assets: EpisodeAssetBinItem[];
  moduleDestinations: string[];
  onSelectScene: (sceneId: string) => void;
}) {
  const [assetTab, setAssetTab] = useState<EditorAssetTab>('video');
  const generatedClips = scenes.map((scene) => ({
    scene,
    segment: activeSegments.find((segment) => segment.sceneNumber === scene.sceneNumber),
  }));

  return (
    <aside className="border-b border-border p-4 xl:border-b-0 xl:border-r">
      <div className="flex gap-1 overflow-x-auto xl:grid xl:grid-cols-1">
        {assetTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setAssetTab(tab.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-semibold ${assetTab === tab.id ? 'bg-[var(--color-muted-olive)] text-[var(--color-vanilla-cream)]' : 'text-dark hover:bg-[var(--color-tea-green)]/30'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 min-h-[360px] space-y-3">
        {assetTab === 'cast' && (
          <>
            {themeCharacterRefs.length > 0 ? themeCharacterRefs.map((reference) => (
              <button key={reference.id} type="button" className="w-full overflow-hidden rounded-lg border border-border bg-white text-left hover:border-[var(--color-muted-olive)]">
                <div className="aspect-video bg-[var(--color-tea-green)]/25">
                  <ProtectedStudioImage
                    originUrl={reference.url}
                    alt={reference.label}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className="truncate text-xs font-semibold text-dark">{reference.handle}</p>
                  <p className="truncate text-[11px] text-muted">{reference.label}</p>
                </div>
              </button>
            )) : <p className="text-xs leading-relaxed text-muted">No generated character references are available in the active theme.</p>}
          </>
        )}

        {assetTab === 'video' && (
          <>
            {generatedClips.map(({ scene, segment }) => (
              <button
                key={scene.id}
                type="button"
                onClick={() => onSelectScene(scene.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-white p-2 text-left hover:border-[var(--color-muted-olive)]"
              >
                <div className={`flex h-14 w-20 shrink-0 items-center justify-center rounded-md ${clipStatusClass(segment?.status)}`}>
                  <MonitorPlay size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-dark">Scene {scene.sceneNumber}</p>
                  <p className="text-[11px] text-muted">{timecode(scene.startSec)} - {timecode(scene.endSec)}</p>
                  <p className="text-[11px] font-semibold text-[var(--color-ash-brown)]">{statusLabel(segment?.status)}</p>
                </div>
              </button>
            ))}
          </>
        )}

        {assetTab === 'audio' && (
          <>
            {scenes.map((scene) => (
              <button key={scene.id} type="button" onClick={() => onSelectScene(scene.id)} className="w-full rounded-lg border border-border bg-white p-3 text-left hover:border-[var(--color-muted-olive)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-dark">Scene {scene.sceneNumber} voice-over</p>
                  <Volume2 size={15} className={scene.ttsStatus === 'ready' ? 'text-[var(--color-muted-olive)]' : 'text-muted'} />
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">{scene.voiceOver || 'No voice-over text yet.'}</p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ash-brown)]">{scene.ttsStatus}</p>
              </button>
            ))}
            {assets.length > 0 && (
              <div className="rounded-lg border border-[var(--color-tea-green)] p-3">
                <p className="text-xs font-semibold text-dark">Uploaded episode assets</p>
                <div className="mt-2 space-y-1">
                  {assets.map((asset) => <p key={asset.id} className="truncate text-[11px] text-muted">{asset.name}</p>)}
                </div>
              </div>
            )}
          </>
        )}

        {assetTab === 'brand' && (
          <div className="space-y-3">
            <div className="rounded-lg border border-[var(--color-tea-green)] bg-white p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-dark">
                <ImageIcon size={15} className="text-[var(--color-ash-brown)]" />
                Immutable module intro
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                {selectedModule?.coverVideoUrl ? 'Intro video will be appended during final compilation.' : 'No module intro video is configured yet.'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-white p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-dark">
                <Layers3 size={15} className="text-[var(--color-ash-brown)]" />
                Publishing routes
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {moduleDestinations.map((destination) => (
                  <span key={destination} className="rounded-full bg-[var(--color-tea-green)]/35 px-2 py-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">{destination}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
