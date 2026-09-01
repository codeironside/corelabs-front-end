import { useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Clock3, FastForward, GripVertical, Layers3, Music2, Plus, RefreshCcw, Scissors, SlidersHorizontal, Sparkles, Trash2, Volume2, VolumeX, Wand2 } from 'lucide-react';
import type { EpisodeSceneCard } from '../storyboard';
import { sceneHasReadyTts, sceneIsGeneratingTts } from '../sceneTts';
import { preventMediaContextMenu, protectedVideoProps, useProtectedMediaSrc } from '../protectedMedia';
import { audioTrackHeight, layoutAudioLanes } from './audioLaneLayout';
import { LaneSoloRail } from './LaneSoloRail';
import { AudioTimelineClip } from './AudioTimelineClip';
import { clipStatusClass, sceneDuration, segmentVideoUrl, statusLabel, timecode, timelineWidth } from './editorUtils';
import { secondsFromPixel } from './playheadScrub';
import type { AudioSoloTarget, ClipInspectorState, EpisodeAssetBinItem, EpisodeTimelineSegment, TimelineAudioLayer, TimelineBrollLayer, TimelineTool, TransitionKind } from './types';

const timelineTools: Array<{ id: TimelineTool; label: string }> = [
  { id: 'select', label: 'Select' },
  { id: 'blade', label: 'Blade' },
  { id: 'speed', label: 'Speed' },
  { id: 'transition', label: 'Transitions' },
];

const transitionLabels: Record<TransitionKind, string> = {
  cut: 'Cut',
  dissolve: 'Dissolve',
  wipe: 'Wipe',
  'fade-black': 'Fade Black',
  'slide-left': 'Slide',
  zoom: 'Zoom',
};

function secondTimecode(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function showSecondLabel(tick: number, totalDuration: number) {
  return totalDuration <= 30 || tick % 5 === 0;
}

function nextTransition(current: TransitionKind): TransitionKind {
  if (current === 'cut') return 'dissolve';
  if (current === 'dissolve') return 'wipe';
  if (current === 'wipe') return 'fade-black';
  if (current === 'fade-black') return 'slide-left';
  if (current === 'slide-left') return 'zoom';
  return 'cut';
}

function SceneClipThumb({ videoUrl }: { videoUrl: string }) {
  const { src } = useProtectedMediaSrc(videoUrl);
  if (!src) return null;
  return (
    <video
      {...protectedVideoProps}
      src={src}
      muted
      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80"
      onContextMenu={preventMediaContextMenu}
    />
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-[var(--color-ash-brown)] shadow-sm ring-1 ring-border hover:bg-[var(--color-tea-green)]"
    >
      {children}
    </button>
  );
}

export function TimelineEngine({
  scenes,
  activeSegments,
  assets,
  selectedSceneId,
  playheadSec,
  totalDuration,
  soundEnabled,
  inspector,
  activeTool,
  transitions,
  sceneAudioMuted,
  audioLayers,
  audioSolo,
  onAudioSoloChange,
  selectedAudioLayerId,
  onSelectAudioLayer,
  brollLayers,
  onInspectorChange,
  onToolChange,
  onTransitionChange,
  onSceneAudioMuteChange,
  onPlayheadChange,
  onSelectScene,
  onGenerateSceneVideo,
  onImproveScene,
  onGenerateSceneTts,
  onReorderScene,
  onUpdateAudioLayer,
  onAddAudioLayer,
  onRemoveAudioLayer,
  onAddBrollLayer,
  onUpdateBrollLayer,
  onRemoveBrollLayer,
}: {
  scenes: EpisodeSceneCard[];
  activeSegments: EpisodeTimelineSegment[];
  assets: EpisodeAssetBinItem[];
  selectedSceneId: string;
  playheadSec: number;
  totalDuration: number;
  soundEnabled: boolean;
  inspector: ClipInspectorState;
  activeTool: TimelineTool;
  transitions: Record<string, TransitionKind>;
  sceneAudioMuted: Record<string, boolean>;
  audioLayers: TimelineAudioLayer[];
  audioSolo: AudioSoloTarget;
  onAudioSoloChange: (solo: AudioSoloTarget) => void;
  selectedAudioLayerId: string;
  onSelectAudioLayer: (layerId: string) => void;
  brollLayers: TimelineBrollLayer[];
  onInspectorChange: (patch: Partial<ClipInspectorState>) => void;
  onToolChange: (tool: TimelineTool) => void;
  onTransitionChange: (sceneId: string, transition: TransitionKind) => void;
  onSceneAudioMuteChange: (sceneId: string, muted: boolean) => void;
  onPlayheadChange: (seconds: number) => void;
  onSelectScene: (sceneId: string) => void;
  onGenerateSceneVideo: (scene: EpisodeSceneCard) => void;
  onImproveScene: (scene: EpisodeSceneCard) => void;
  onGenerateSceneTts: (sceneId: string) => void;
  onReorderScene: (draggedSceneId: string, targetSceneId: string) => void;
  onUpdateAudioLayer: (id: string, patch: Partial<TimelineAudioLayer>) => void;
  onAddAudioLayer: (layer: TimelineAudioLayer) => void;
  onRemoveAudioLayer: (id: string) => void;
  onAddBrollLayer: (sceneId: string) => void;
  onUpdateBrollLayer: (id: string, patch: Partial<TimelineBrollLayer>) => void;
  onRemoveBrollLayer: (id: string) => void;
}) {
  const [zoom, setZoom] = useState(12);
  const [musicDucking, setMusicDucking] = useState(true);
  const [draggedSceneId, setDraggedSceneId] = useState('');
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const ttsTrackRef = useRef<HTMLDivElement | null>(null);
  const audioTrackRef = useRef<HTMLDivElement | null>(null);
  const timelineTicks = useMemo(
    () => Array.from({ length: Math.floor(totalDuration) + 1 }, (_, index) => index),
    [totalDuration],
  );
  const generatedClips = scenes.map((scene) => ({
    scene,
    segment: activeSegments.find((segment) => segment.sceneNumber === scene.sceneNumber),
  }));
  const labelWidth = 128;
  const timelinePixelWidth = timelineWidth(totalDuration, zoom);
  const ttsLayers = useMemo(() => audioLayers.filter((layer) => layer.kind === 'tts'), [audioLayers]);
  const musicSfxLayers = useMemo(() => audioLayers.filter((layer) => layer.kind !== 'tts'), [audioLayers]);
  const ttsLaneLayout = useMemo(() => layoutAudioLanes(ttsLayers, { strategy: 'overlap' }), [ttsLayers]);
  const musicSfxLaneLayout = useMemo(() => layoutAudioLanes(musicSfxLayers, { strategy: 'dedicated' }), [musicSfxLayers]);
  const ttsTrackHeight = audioTrackHeight(ttsLaneLayout.laneCount);
  const musicSfxTrackHeight = audioTrackHeight(musicSfxLaneLayout.laneCount);
  const ttsRowHeight = Math.max(64, ttsTrackHeight + 56);
  const musicSfxRowHeight = musicSfxTrackHeight + 70;

  function selectScene(scene: EpisodeSceneCard) {
    onSelectScene(scene.id);
    onPlayheadChange(scene.startSec);
  }

  function startTimelineScrub(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const updateFromPointer = (clientX: number) => onPlayheadChange(secondsFromPixel(clientX, rect, zoom, totalDuration, labelWidth));
    updateFromPointer(event.clientX);
    const handleMove = (moveEvent: globalThis.PointerEvent) => updateFromPointer(moveEvent.clientX);
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
  }

  return (
    <div className="border-t border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {timelineTools.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onToolChange(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${activeTool === item.id ? 'bg-[var(--color-muted-olive)] text-[var(--color-vanilla-cream)]' : 'border border-border text-dark hover:border-[var(--color-muted-olive)]'}`}
            >
              {item.id === 'blade' ? <Scissors size={13} /> : item.id === 'speed' ? <Clock3 size={13} /> : item.id === 'transition' ? <Sparkles size={13} /> : <SlidersHorizontal size={13} />}
              {item.label}
            </button>
          ))}
          <button type="button" onClick={() => onInspectorChange({ speed: Math.max(0.5, Number((inspector.speed - 0.1).toFixed(1))) })} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-dark">
            <FastForward size={13} /> - Speed
          </button>
          <button type="button" onClick={() => onInspectorChange({ speed: Math.min(2, Number((inspector.speed + 0.1).toFixed(1))) })} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-dark">
            <FastForward size={13} /> + Speed
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted">Zoom</span>
          <input type="range" min={7} max={22} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-28 accent-[var(--color-muted-olive)]" />
          <span className="rounded-full bg-[var(--color-tea-green)]/35 px-2 py-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">{timecode(playheadSec)}</span>
        </div>
      </div>

      <div className="studio-horizontal-scroll mt-4 pb-3">
        <div ref={timelineRef} className="relative min-w-max" style={{ width: labelWidth + timelinePixelWidth }}>
          <div
            className="absolute bottom-3 top-0 z-20 w-1 cursor-ew-resize rounded-full bg-[var(--color-faded-copper)] transition-[left] duration-100"
            style={{ left: labelWidth + timelineWidth(Math.min(totalDuration, Math.max(0, playheadSec)), zoom) }}
            onPointerDown={startTimelineScrub}
            title="Drag to scrub timeline"
          />
          <div
            className="absolute top-0 z-30 h-4 w-4 -translate-x-[7px] cursor-ew-resize rounded-full border-2 border-white bg-[var(--color-faded-copper)] shadow"
            style={{ left: labelWidth + timelineWidth(Math.min(totalDuration, Math.max(0, playheadSec)), zoom) }}
            onPointerDown={startTimelineScrub}
            title="Drag to scrub timeline"
          />
          <div className="relative h-8 border-b border-border">
            <div className="sticky left-0 z-10 h-7 w-32 border-r border-border bg-white" />
            {timelineTicks.map((tick) => (
              <button
                key={tick}
                type="button"
                onClick={() => onPlayheadChange(tick)}
                className={`absolute top-0 border-l border-border pl-1 text-[8px] font-semibold text-muted hover:text-[var(--color-ash-brown)] ${showSecondLabel(tick, totalDuration) ? 'h-8 opacity-100' : 'h-3 opacity-80'}`}
                style={{ left: labelWidth + timelineWidth(tick, zoom) }}
                title={secondTimecode(tick)}
              >
                <span className={showSecondLabel(tick, totalDuration) ? 'block' : 'hidden'}>{secondTimecode(tick)}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-3">
            <div className="flex h-28 items-center rounded-lg border border-border bg-white">
              <div className="sticky left-0 z-10 flex h-full w-32 shrink-0 items-center border-r border-border bg-white px-3 text-xs font-semibold text-dark">Main Video</div>
              {generatedClips.map(({ scene, segment }, index) => (
                (() => {
                  const clipWidth = timelineWidth(sceneDuration(scene), zoom);
                  const videoUrl = segmentVideoUrl(segment);
                  const spacious = clipWidth >= 120;
                  return (
                    <div key={scene.id} className="relative flex h-full shrink-0 items-center py-3" style={{ width: clipWidth }}>
                      <div
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={() => setDraggedSceneId(scene.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (draggedSceneId && draggedSceneId !== scene.id) onReorderScene(draggedSceneId, scene.id);
                          setDraggedSceneId('');
                        }}
                        onClick={() => selectScene(scene)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            selectScene(scene);
                          }
                        }}
                        className={`group relative flex h-20 w-full shrink-0 cursor-pointer items-end justify-between gap-2 overflow-hidden rounded-md px-2.5 pb-2 text-left text-xs font-semibold ring-2 ${selectedSceneId === scene.id ? 'ring-[var(--color-faded-copper)]' : 'ring-transparent'} ${videoUrl ? 'bg-black text-white' : clipStatusClass(segment?.status)}`}
                      >
                        {videoUrl && <SceneClipThumb videoUrl={videoUrl} />}
                        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/90 to-transparent" />
                        <span className="relative z-10 inline-flex min-w-0 items-center gap-1 truncate drop-shadow">
                          <GripVertical size={12} />
                          {spacious ? `Scene ${scene.sceneNumber}` : `S${scene.sceneNumber}`}
                        </span>
                        {spacious && <span className="relative z-10 shrink-0 text-[10px] opacity-90 drop-shadow">{statusLabel(segment?.status)}</span>}
                        <div className="absolute right-1 top-1 z-20 flex gap-1 rounded-md bg-white/85 p-1 opacity-0 shadow-sm ring-1 ring-border transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                          <IconButton label="Split clip at playhead" onClick={() => onToolChange('blade')}><Scissors size={12} /></IconButton>
                          <IconButton label="Adjust speed ripple" onClick={() => onToolChange('speed')}><FastForward size={12} /></IconButton>
                          <IconButton label={sceneAudioMuted[scene.id] ? 'Unmute scene source audio' : 'Mute scene source audio'} onClick={() => onSceneAudioMuteChange(scene.id, !sceneAudioMuted[scene.id])}>
                            {sceneAudioMuted[scene.id] ? <VolumeX size={12} /> : <Volume2 size={12} />}
                          </IconButton>
                          <IconButton label="Improve visual prompt" onClick={() => onImproveScene(scene)}><Wand2 size={12} /></IconButton>
                          <IconButton label="Regenerate this clip" onClick={() => onGenerateSceneVideo(scene)}><RefreshCcw size={12} /></IconButton>
                        </div>
                      </div>
                      {index < generatedClips.length - 1 && (
                        <button
                          type="button"
                          title="Cycle scene transition"
                          onClick={() => {
                            onToolChange('transition');
                            const current = transitions[scene.id] ?? 'cut';
                            const next = nextTransition(current);
                            onTransitionChange(scene.id, next);
                            onInspectorChange({ transition: next });
                          }}
                          className="absolute -right-6 top-1 z-30 flex h-8 w-12 shrink-0 flex-col items-center justify-center rounded-full border border-[var(--color-faded-copper)] bg-white text-[var(--color-ash-brown)] shadow-sm"
                        >
                          <Sparkles size={12} />
                          <span className="text-[8px] font-semibold leading-none">{transitionLabels[transitions[scene.id] ?? 'cut']}</span>
                        </button>
                      )}
                    </div>
                  );
                })()
              ))}
            </div>

            <div className="flex min-h-24 items-center rounded-lg border border-border bg-white">
              <div className="sticky left-0 z-10 flex min-h-24 w-32 shrink-0 items-center border-r border-border bg-white px-3 text-xs font-semibold text-dark">B-Roll / Overlay</div>
              {scenes.map((scene) => {
                const clipWidth = timelineWidth(sceneDuration(scene), zoom);
                const sceneLayers = brollLayers.filter((layer) => layer.sceneId === scene.id);
                const fallbackAsset = assets[0];
                return (
                  <div key={scene.id} className="flex h-24 shrink-0 items-center px-1 py-2" style={{ width: clipWidth }}>
                    <div className="relative h-16 w-full min-w-0 rounded-md border border-dashed border-[var(--color-tea-green)] bg-white p-1.5 text-[10px] font-semibold text-[var(--color-ash-brown)]">
                      {sceneLayers.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => onAddBrollLayer(scene.id)}
                          className="flex h-full w-full items-center justify-center gap-1.5 rounded-md bg-[var(--color-tea-green)]/20 px-2 text-[10px] font-semibold text-[var(--color-ash-brown)] hover:bg-[var(--color-tea-green)]/35"
                          title={fallbackAsset ? `Add B-roll using ${fallbackAsset.name}` : 'Add B-roll overlay'}
                        >
                          <Plus size={12} />
                          Add B-roll
                        </button>
                      ) : (
                        sceneLayers.map((layer, layerIndex) => {
                          const left = timelineWidth(Math.max(0, layer.startSec - scene.startSec), zoom);
                          const width = Math.max(34, timelineWidth(layer.endSec - layer.startSec, zoom));
                          return (
                            <div
                              key={layer.id}
                              className="group absolute top-1.5 flex h-12 min-w-0 items-center gap-2 overflow-hidden rounded-md border border-[var(--color-faded-copper)] bg-[var(--color-faded-copper)]/20 px-2 shadow-sm"
                              style={{ left, width, transform: `translateY(${(layerIndex % 2) * 3}px)` }}
                              title={`${layer.label} ${layer.startSec.toFixed(1)}s-${layer.endSec.toFixed(1)}s`}
                            >
                              <Layers3 size={12} className="shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[10px] font-semibold">{layer.label}</p>
                                <input
                                  aria-label={`B-roll opacity for ${layer.label}`}
                                  type="range"
                                  min={10}
                                  max={100}
                                  value={layer.opacity}
                                  onChange={(event) => onUpdateBrollLayer(layer.id, { opacity: Number(event.target.value) })}
                                  className="mt-1 w-full accent-[var(--color-muted-olive)]"
                                />
                              </div>
                              <button
                                type="button"
                                aria-label={`Remove ${layer.label}`}
                                onClick={() => onRemoveBrollLayer(layer.id)}
                                className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-[var(--color-ash-brown)] ring-1 ring-border group-hover:inline-flex"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-stretch rounded-lg border border-border bg-white" style={{ minHeight: ttsRowHeight }}>
              <div className="sticky left-0 z-10 flex w-32 shrink-0 items-center border-r border-border bg-white px-3 text-xs font-semibold text-dark" style={{ minHeight: ttsRowHeight }}>Primary TTS</div>
              <div className="relative rounded-md bg-[var(--color-muted-olive)]/8 px-3 py-3 text-[10px] font-semibold text-[var(--color-ash-brown)]" style={{ width: timelinePixelWidth, minHeight: ttsRowHeight - 12 }}>
                <div className="flex min-h-8 items-center justify-between gap-4">
                  <span className="inline-flex min-w-0 items-center gap-2 truncate"><Volume2 size={13} className="shrink-0" /> Scene narration and voice-over</span>
                </div>
                <div className="relative mt-2 h-7 border-y border-[var(--color-muted-olive)]/20 bg-white/55">
                  {timelineTicks.map((tick) => (
                    <button
                      key={`tts-ruler-${tick}`}
                      type="button"
                      onClick={() => onPlayheadChange(tick)}
                      className={`absolute top-0 flex items-start border-l border-[var(--color-muted-olive)]/35 pl-1 pt-1 text-[8px] font-semibold text-muted hover:text-[var(--color-ash-brown)] ${showSecondLabel(tick, totalDuration) ? 'h-full opacity-100' : 'h-3 opacity-80'}`}
                      style={{ left: timelineWidth(tick, zoom) }}
                      title={secondTimecode(tick)}
                    >
                      <span className={showSecondLabel(tick, totalDuration) ? 'block' : 'hidden'}>{secondTimecode(tick)}</span>
                    </button>
                  ))}
                  {scenes.map((scene) => (
                    <div
                      key={`tts-scene-guide-${scene.id}`}
                      className="pointer-events-none absolute bottom-0 h-2 border-l border-[var(--color-muted-olive)]/40 bg-[var(--color-tea-green)]/20"
                      style={{
                        left: timelineWidth(scene.startSec, zoom),
                        width: timelineWidth(sceneDuration(scene), zoom),
                      }}
                    />
                  ))}
                </div>
                <div ref={ttsTrackRef} className="relative mt-2 pl-9" style={{ height: ttsTrackHeight }}>
                  <LaneSoloRail laneCount={ttsLaneLayout.laneCount} track="tts" solo={audioSolo} onSoloChange={onAudioSoloChange} />
                  {ttsLayers.length === 0 && !scenes.some((scene) => sceneHasReadyTts(scene)) ? (
                    <div className="absolute inset-0 flex items-center rounded-md border border-dashed border-[var(--color-tea-green)] px-3 text-[10px] text-muted">
                      {soundEnabled ? 'Generate TTS per scene in Section 4 to see narration blocks here.' : 'Silent episode ΓÇö no TTS blocks.'}
                    </div>
                  ) : (
                    <>
                      {scenes.map((scene) => {
                        const hasLayer = ttsLayers.some((layer) => layer.startSec === scene.startSec);
                        if (hasLayer) return null;
                        return (
                          <button
                            key={`tts-placeholder-${scene.id}`}
                            type="button"
                            onClick={() => {
                              if (sceneHasReadyTts(scene)) onGenerateSceneTts(scene.id);
                              else selectScene(scene);
                            }}
                            className="absolute top-1 flex h-8 items-center justify-center gap-1 overflow-hidden rounded-md border border-dashed border-[var(--color-muted-olive)]/50 bg-white/70 px-2 text-[9px] font-semibold text-muted hover:border-[var(--color-muted-olive)]"
                            style={{
                              left: timelineWidth(scene.startSec, zoom),
                              width: timelineWidth(sceneDuration(scene), zoom),
                            }}
                            title={`Scene ${scene.sceneNumber}`}
                          >
                            <Volume2 size={11} />
                            {sceneHasReadyTts(scene) ? 'Add to timeline' : sceneIsGeneratingTts(scene) ? 'GeneratingΓÇª' : 'TTS pending'}
                            {!sceneHasReadyTts(scene) && !sceneIsGeneratingTts(scene) && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onGenerateSceneTts(scene.id);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.stopPropagation();
                                    onGenerateSceneTts(scene.id);
                                  }
                                }}
                                className="ml-1 rounded bg-[var(--color-tea-green)]/40 px-1.5 py-0.5 text-[8px] text-[var(--color-ash-brown)]"
                              >
                                Generate
                              </span>
                            )}
                          </button>
                        );
                      })}
                      {ttsLaneLayout.items.map(({ layer, lane }) => (
                        <AudioTimelineClip
                          key={layer.id}
                          layer={layer}
                          lane={lane}
                          zoom={zoom}
                          totalDuration={totalDuration}
                          playheadSec={playheadSec}
                          trackRef={ttsTrackRef}
                          onUpdate={onUpdateAudioLayer}
                          onAdd={onAddAudioLayer}
                          onRemove={onRemoveAudioLayer}
                          onRegenerateTts={() => {
                            const scene = scenes.find((item) => item.startSec === layer.startSec);
                            if (scene) onGenerateSceneTts(scene.id);
                          }}
                          selected={selectedAudioLayerId === layer.id}
                          onSelect={onSelectAudioLayer}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-stretch rounded-lg border border-border bg-white" style={{ minHeight: musicSfxRowHeight }}>
              <div className="sticky left-0 z-10 flex w-32 shrink-0 items-center border-r border-border bg-white px-3 text-xs font-semibold text-dark" style={{ minHeight: musicSfxRowHeight }}>Music / SFX</div>
              <div className="relative rounded-md bg-[var(--color-faded-copper)]/10 px-3 py-3 text-[10px] font-semibold text-[var(--color-ash-brown)]" style={{ width: timelinePixelWidth, minHeight: musicSfxRowHeight - 12 }}>
                <div className="flex min-h-10 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="inline-flex min-w-0 items-center gap-2 truncate"><Music2 size={13} className="shrink-0" /> Soundtracks, SFX, mic, uploads</span>
                    <p className="mt-1 text-[9px] font-medium text-muted">Each upload, soundtrack, or SFX gets its own lane. Duplicates stay on the same lane.</p>
                  </div>
                  <button
                    type="button"
                    title="Auto-duck lowers background audio under TTS or voice-over so speech remains clear."
                    onClick={() => setMusicDucking((current) => !current)}
                    className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold ${musicDucking ? 'bg-[var(--color-muted-olive)] text-[var(--color-vanilla-cream)]' : 'bg-white text-[var(--color-ash-brown)]'}`}
                  >
                    Auto-duck {musicDucking ? 'On' : 'Off'}
                  </button>
                </div>
                <div className="relative mt-3 h-7 border-y border-[var(--color-faded-copper)]/20 bg-white/55">
                  {timelineTicks.map((tick) => (
                    <button
                      key={`music-ruler-${tick}`}
                      type="button"
                      onClick={() => onPlayheadChange(tick)}
                      className={`absolute top-0 flex items-start border-l border-[var(--color-faded-copper)]/35 pl-1 pt-1 text-[8px] font-semibold text-muted hover:text-[var(--color-ash-brown)] ${showSecondLabel(tick, totalDuration) ? 'h-full opacity-100' : 'h-3 opacity-80'}`}
                      style={{ left: timelineWidth(tick, zoom) }}
                      title={secondTimecode(tick)}
                    >
                      <span className={showSecondLabel(tick, totalDuration) ? 'block' : 'hidden'}>{secondTimecode(tick)}</span>
                    </button>
                  ))}
                  {scenes.map((scene) => (
                    <div
                      key={`music-scene-guide-${scene.id}`}
                      className="pointer-events-none absolute bottom-0 h-2 border-l border-[var(--color-muted-olive)]/40 bg-[var(--color-tea-green)]/20"
                      style={{
                        left: timelineWidth(scene.startSec, zoom),
                        width: timelineWidth(sceneDuration(scene), zoom),
                      }}
                    />
                  ))}
                </div>
                <div ref={audioTrackRef} className="relative mt-2 pl-9" style={{ height: musicSfxTrackHeight }}>
                  <LaneSoloRail laneCount={musicSfxLaneLayout.laneCount} track="music-sfx" solo={audioSolo} onSoloChange={onAudioSoloChange} />
                  {musicSfxLayers.length === 0 ? (
                    <div className="absolute inset-0 flex items-center rounded-md border border-dashed border-[var(--color-tea-green)] px-3 text-[10px] text-muted">
                      Add uploads, mic, soundtrack, or SFX to see waveform blocks here.
                    </div>
                  ) : (
                    musicSfxLaneLayout.items.map(({ layer, lane }) => (
                      <AudioTimelineClip
                        key={layer.id}
                        layer={layer}
                        lane={lane}
                        zoom={zoom}
                        totalDuration={totalDuration}
                        playheadSec={playheadSec}
                        trackRef={audioTrackRef}
                        onUpdate={onUpdateAudioLayer}
                        onAdd={onAddAudioLayer}
                        onRemove={onRemoveAudioLayer}
                        selected={selectedAudioLayerId === layer.id}
                        onSelect={onSelectAudioLayer}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeTool === 'blade' && (
        <div className="mt-2 rounded-lg border border-[var(--color-faded-copper)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-ash-brown)]">
          Blade armed at {timecode(playheadSec)}. Select any clip block to split around the playhead.
        </div>
      )}
    </div>
  );
}
