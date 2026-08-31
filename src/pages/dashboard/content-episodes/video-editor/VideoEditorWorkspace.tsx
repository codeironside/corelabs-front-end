import { useEffect, useMemo, useState } from 'react';
import { Film, Loader2, Play } from 'lucide-react';
import { AudioEqualizerPanel } from './AudioEqualizerPanel';
import { AudioLayerControls } from './AudioLayerControls';
import { AssetMediaBin } from './AssetMediaBin';
import { ClipInspectorPanel } from './ClipInspectorPanel';
import { PlayerControlHub } from './PlayerControlHub';
import { SubtitlePanel } from './SubtitlePanel';
import { TimelineEngine } from './TimelineEngine';
import { buildSubtitleCues, normalizeSubtitleCue } from './editorUtils';
import type { AudioSoloTarget, ClipInspectorState, EditorAspectRatio, SubtitleCue, SubtitleStyle, TimelineTool, VideoEditorWorkspaceProps } from './types';

import { DEFAULT_COLOR_GRADE } from './colorGrade';

const defaultInspector: ClipInspectorState = {
  scale: 100,
  x: 50,
  y: 50,
  opacity: 100,
  gain: 0,
  speed: 1,
  transition: 'cut',
  colorGrade: DEFAULT_COLOR_GRADE,
};

const defaultSubtitleStyle: SubtitleStyle = {
  font: 'Poppins',
  size: 38,
  tracking: 0,
  fill: '#f0ead2',
  stroke: '#2f261f',
  shadow: true,
  backgroundOpacity: 28,
  animation: 'karaoke',
};

export function VideoEditorWorkspace({
  selectedModule,
  scenes,
  activeSegments,
  themeCharacterRefs,
  assets,
  selectedSceneId,
  sceneSelectionVersion,
  finalVideoUrl,
  activeProgress,
  activeStatusText,
  canRender,
  isRendering,
  renderDisabledReason,
  soundEnabled,
  audioModel,
  videoModel,
  videoModels,
  moduleDestinations,
  transitions,
  sceneAudioMuted,
  audioLayers,
  reusableAudioAssets,
  brollLayers,
  onTransitionChange,
  onSceneAudioMuteChange,
  onAddAudioLayer,
  onUpdateAudioLayer,
  onRemoveAudioLayer,
  onAddBrollLayer,
  onUpdateBrollLayer,
  onRemoveBrollLayer,
  onUploadAudioFile,
  onSelectScene,
  onUpdateScene,
  onGenerateSceneVideo,
  onImproveScene,
  onGenerateSceneTts,
  onReorderScene,
  onRenderMaster,
  onVideoModelChange,
}: VideoEditorWorkspaceProps) {
  const [aspectRatio, setAspectRatio] = useState<EditorAspectRatio>('9:16');
  const [inspector, setInspector] = useState<ClipInspectorState>(defaultInspector);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(defaultSubtitleStyle);
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>(() => buildSubtitleCues(scenes));
  const [selectedSubtitleCueId, setSelectedSubtitleCueId] = useState('');
  const [subtitlePlayheadLabel, setSubtitlePlayheadLabel] = useState('0:00');
  const [activeTool, setActiveTool] = useState<TimelineTool>('select');
  const [timelinePlayhead, setTimelinePlayhead] = useState(0);
  const [audioSolo, setAudioSolo] = useState<AudioSoloTarget>(null);
  const [selectedAudioLayerId, setSelectedAudioLayerId] = useState('');

  const selectedScene = scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0];
  const selectedAudioLayer = audioLayers.find((layer) => layer.id === selectedAudioLayerId);
  const selectedSegment = selectedScene
    ? activeSegments.find((segment) => segment.sceneNumber === selectedScene.sceneNumber)
    : undefined;
  const totalDuration = Math.max(10, ...scenes.map((scene) => scene.endSec), selectedModule?.durationSeconds ?? 0);
  const readyClipCount = activeSegments.filter((segment) => segment.status === 'ready').length;
  const headerDestinations = useMemo(() => moduleDestinations.slice(0, 3), [moduleDestinations]);

  function updateInspector(patch: Partial<ClipInspectorState>) {
    setInspector((current) => {
      const next = { ...current, ...patch };
      if (patch.transition && selectedScene) {
        onTransitionChange(selectedScene.id, patch.transition);
      }
      return next;
    });
  }

  useEffect(() => {
    if (!selectedScene) return;
    setInspector((current) => ({
      ...current,
      transition: transitions[selectedScene.id] ?? 'cut',
    }));
  }, [selectedScene?.id, transitions]);

  function generateSubtitles() {
    const cues = buildSubtitleCues(scenes);
    setSubtitleCues(cues);
    if (cues[0]) {
      setSelectedSubtitleCueId(cues[0].id);
      setSubtitlePlayheadLabel(`${cues[0].startSec.toFixed(1)}s`);
      setTimelinePlayhead(cues[0].startSec);
      onSelectScene(cues[0].sceneId);
    }
  }

  function selectSubtitleCue(cue: SubtitleCue) {
    setSelectedSubtitleCueId(cue.id);
    setSubtitlePlayheadLabel(`${cue.startSec.toFixed(1)}s`);
    setTimelinePlayhead(cue.startSec);
    onSelectScene(cue.sceneId);
  }

  function updateSubtitleCue(id: string, patch: Partial<SubtitleCue>) {
    setSubtitleCues((current) =>
      current.map((cue) => {
        if (cue.id !== id) return cue;
        return normalizeSubtitleCue({ ...cue, ...patch }, totalDuration);
      }),
    );
  }

  function renderWithTimeline() {
    onRenderMaster({ transitions, brollLayers });
  }

  return (
    <section className="flex max-h-[min(82vh,calc(100vh-5rem))] flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="shrink-0 border-b border-border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-tea-green)]/45">
              <Film size={19} className="text-[var(--color-ash-brown)]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-dark">5. Dedicated Video Editor Workspace</h2>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
                Production-grade timeline workspace for AI clips, TTS, overlays, subtitles, stitching, and direct publishing handoff.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {headerDestinations.map((destination) => (
                  <span key={destination} className="rounded-full bg-[var(--color-tea-green)]/35 px-2 py-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">{destination}</span>
                ))}
                <span className="rounded-full bg-[var(--color-faded-copper)]/20 px-2 py-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">Subtitle cursor {subtitlePlayheadLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full bg-[var(--color-tea-green)]/35 px-3 py-2 text-xs font-semibold text-[var(--color-ash-brown)]">Tool: {activeTool}</span>
            <button
              type="button"
              onClick={renderWithTimeline}
              disabled={!canRender || isRendering}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-ash-brown)] px-4 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)] shadow-sm disabled:opacity-45"
            >
              {isRendering ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              Render and Stitch Full Episode
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <div className="grid gap-0 xl:grid-cols-[18rem_1fr_20rem]">
        <AssetMediaBin
          selectedModule={selectedModule}
          scenes={scenes}
          activeSegments={activeSegments}
          themeCharacterRefs={themeCharacterRefs}
          assets={assets}
          moduleDestinations={moduleDestinations}
          onSelectScene={onSelectScene}
        />

        <main className="min-w-0 border-b border-border xl:border-b-0">
          <div className="grid gap-0 lg:grid-cols-[1fr_18rem]">
            <div className="p-4">
              <PlayerControlHub
                aspectRatio={aspectRatio}
                scenes={scenes}
                activeSegments={activeSegments}
                selectedScene={selectedScene}
                sceneSelectionVersion={sceneSelectionVersion}
                playheadSec={timelinePlayhead}
                selectedSegment={selectedSegment}
                finalVideoUrl={finalVideoUrl}
                inspector={inspector}
                subtitleCues={subtitleCues}
                subtitleStyle={subtitleStyle}
                transitions={transitions}
                sceneAudioMuted={sceneAudioMuted}
                audioLayers={audioLayers}
                audioSolo={audioSolo}
                brollLayers={brollLayers}
                onAspectRatioChange={setAspectRatio}
                onInspectorChange={updateInspector}
                onToolChange={setActiveTool}
                onGenerateSubtitles={generateSubtitles}
                onRegenerateClip={onGenerateSceneVideo}
                onPlayheadChange={setTimelinePlayhead}
                onSelectScene={onSelectScene}
              />
            </div>
            <SubtitlePanel
              cues={subtitleCues}
              style={subtitleStyle}
              selectedCueId={selectedSubtitleCueId}
              totalDuration={totalDuration}
              onGenerate={generateSubtitles}
              onStyleChange={setSubtitleStyle}
              onCueSelect={selectSubtitleCue}
              onCueUpdate={updateSubtitleCue}
            />
            <div className="p-4 pt-0 space-y-4">
              <AudioLayerControls
                selectedScene={selectedScene}
                totalDuration={totalDuration}
                sceneAudioMuted={sceneAudioMuted}
                audioLayers={audioLayers}
                reusableAudioAssets={reusableAudioAssets}
                onSceneAudioMuteChange={onSceneAudioMuteChange}
                onAddAudioLayer={onAddAudioLayer}
                onUpdateAudioLayer={onUpdateAudioLayer}
                onRemoveAudioLayer={onRemoveAudioLayer}
                onUploadAudioFile={onUploadAudioFile}
                selectedAudioLayerId={selectedAudioLayerId}
                onSelectAudioLayer={setSelectedAudioLayerId}
              />
              <AudioEqualizerPanel layer={selectedAudioLayer} onUpdate={onUpdateAudioLayer} />
            </div>
          </div>

          <TimelineEngine
            scenes={scenes}
            activeSegments={activeSegments}
            assets={assets}
            selectedSceneId={selectedScene?.id ?? ''}
            playheadSec={timelinePlayhead}
            totalDuration={totalDuration}
            soundEnabled={soundEnabled}
            inspector={inspector}
            activeTool={activeTool}
            transitions={transitions}
            sceneAudioMuted={sceneAudioMuted}
            audioLayers={audioLayers}
            audioSolo={audioSolo}
            onAudioSoloChange={setAudioSolo}
            selectedAudioLayerId={selectedAudioLayerId}
            onSelectAudioLayer={setSelectedAudioLayerId}
            brollLayers={brollLayers}
            onInspectorChange={updateInspector}
            onToolChange={setActiveTool}
            onTransitionChange={onTransitionChange}
            onSceneAudioMuteChange={onSceneAudioMuteChange}
            onPlayheadChange={setTimelinePlayhead}
            onSelectScene={onSelectScene}
            onGenerateSceneVideo={onGenerateSceneVideo}
            onImproveScene={onImproveScene}
            onGenerateSceneTts={onGenerateSceneTts}
            onReorderScene={onReorderScene}
            onUpdateAudioLayer={onUpdateAudioLayer}
            onAddAudioLayer={onAddAudioLayer}
            onRemoveAudioLayer={onRemoveAudioLayer}
            onAddBrollLayer={onAddBrollLayer}
            onUpdateBrollLayer={onUpdateBrollLayer}
            onRemoveBrollLayer={onRemoveBrollLayer}
          />
        </main>

        <ClipInspectorPanel
          selectedScene={selectedScene}
          inspector={inspector}
          activeProgress={activeProgress}
          activeStatusText={activeStatusText}
          readyClipCount={readyClipCount}
          sceneCount={scenes.length}
          canRender={canRender}
          isRendering={isRendering}
          renderDisabledReason={renderDisabledReason}
          soundEnabled={soundEnabled}
          audioModel={audioModel}
          videoModel={videoModel}
          videoModels={videoModels}
          onInspectorChange={updateInspector}
          onVideoModelChange={onVideoModelChange}
          onImproveScene={onImproveScene}
          onGenerateSceneVideo={onGenerateSceneVideo}
          onGenerateSceneTts={onGenerateSceneTts}
          onUpdateScene={onUpdateScene}
          onRenderMaster={renderWithTimeline}
        />
      </div>
      </div>
    </section>
  );
}
