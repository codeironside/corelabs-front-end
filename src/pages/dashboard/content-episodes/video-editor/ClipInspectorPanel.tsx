import { CheckCircle2, Music2, Palette, RefreshCcw, SlidersHorizontal, Volume2, Wand2 } from 'lucide-react';
import type { AiModelOption } from '@/api/content';
import type { EpisodeSceneCard } from '../storyboard';
import { sceneHasReadyTts, sceneIsGeneratingTts, ensureSceneTtsLines } from '../sceneTts';
import { clamp } from './editorUtils';
import { DEFAULT_COLOR_GRADE } from './colorGrade';
import type { ClipInspectorState, ColorGradeState, TimelineRenderOptions } from './types';

export function InspectorSlider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-[11px] font-semibold text-muted">
        {label}
        <span className="text-[var(--color-ash-brown)]">
          {value}
          {suffix}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full accent-[var(--color-muted-olive)]" />
    </label>
  );
}

export function ClipInspectorPanel({
  selectedScene,
  inspector,
  activeProgress,
  activeStatusText,
  readyClipCount,
  sceneCount,
  canRender,
  isRendering,
  renderDisabledReason,
  soundEnabled: _soundEnabled,
  audioModel,
  videoModel,
  videoModels,
  onInspectorChange,
  onVideoModelChange,
  onImproveScene,
  onGenerateSceneVideo,
  onGenerateSceneTts,
  onUpdateScene: _onUpdateScene,
  onApproveScene,
  onRetryScene,
  onRenderMaster,
}: {
  selectedScene?: EpisodeSceneCard;
  inspector: ClipInspectorState;
  activeProgress: number;
  activeStatusText: string;
  readyClipCount: number;
  sceneCount: number;
  canRender: boolean;
  isRendering: boolean;
  renderDisabledReason: string;
  soundEnabled: boolean;
  audioModel: string;
  videoModel: string;
  videoModels: AiModelOption[];
  onInspectorChange: (patch: Partial<ClipInspectorState>) => void;
  onVideoModelChange: (model: string) => void;
  onImproveScene: (scene: EpisodeSceneCard) => void;
  onGenerateSceneVideo: (scene: EpisodeSceneCard) => void;
  onGenerateSceneTts: (sceneId: string) => void;
  onUpdateScene: (sceneId: string, patch: Partial<EpisodeSceneCard>) => void;
  onApproveScene?: (scene: EpisodeSceneCard) => void;
  onRetryScene?: (scene: EpisodeSceneCard) => void;
  onRenderMaster: (options?: TimelineRenderOptions) => void;
}) {
  return (
    <aside className="p-4">
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-dark">
          <SlidersHorizontal size={16} className="text-[var(--color-ash-brown)]" />
          Contextual Clip Inspector
        </div>
        {selectedScene ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-dark">Scene {selectedScene.sceneNumber}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{selectedScene.visualPrompt || 'No visual prompt set.'}</p>
            </div>
            <select value={videoModel} onChange={(event) => onVideoModelChange(event.target.value)} className="input-field text-xs">
              {videoModels.map((model) => <option key={model.value} value={model.value}>{model.providerLabel} {model.label}</option>)}
            </select>
            <InspectorSlider label="Scale" value={inspector.scale} min={50} max={180} suffix="%" onChange={(scale) => onInspectorChange({ scale })} />
            <InspectorSlider label="Position X" value={inspector.x} min={0} max={100} suffix="%" onChange={(x) => onInspectorChange({ x })} />
            <InspectorSlider label="Position Y" value={inspector.y} min={0} max={100} suffix="%" onChange={(y) => onInspectorChange({ y })} />
            <InspectorSlider label="Opacity" value={inspector.opacity} min={0} max={100} suffix="%" onChange={(opacity) => onInspectorChange({ opacity })} />
            <InspectorSlider label="Audio gain" value={inspector.gain} min={-24} max={12} suffix=" dB" onChange={(gain) => onInspectorChange({ gain })} />
            <InspectorSlider label="Speed ripple" value={inspector.speed} min={0.5} max={2} step={0.1} suffix="x" onChange={(speed) => onInspectorChange({ speed: clamp(speed, 0.5, 2) })} />
            <div className="rounded-lg border border-[var(--color-tea-green)]/50 bg-[var(--color-tea-green)]/10 p-3">
              <p className="flex items-center gap-2 text-[11px] font-semibold text-dark">
                <Palette size={13} className="text-[var(--color-ash-brown)]" />
                Color grading & correction
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted">Applied live in the Composition Monitor Hub preview.</p>
              <div className="mt-3 space-y-3">
                {([
                  ['brightness', 'Brightness', -50, 50, 1, ''],
                  ['contrast', 'Contrast', -50, 50, 1, ''],
                  ['saturation', 'Saturation', -50, 50, 1, ''],
                  ['temperature', 'Temperature', -50, 50, 1, ''],
                  ['exposure', 'Exposure', -50, 50, 1, ''],
                  ['shadows', 'Shadow lift', -50, 50, 1, ''],
                  ['highlights', 'Highlight roll-off', -50, 50, 1, ''],
                ] as const).map(([key, label, min, max, step, suffix]) => (
                  <InspectorSlider
                    key={key}
                    label={label}
                    value={(inspector.colorGrade ?? DEFAULT_COLOR_GRADE)[key]}
                    min={min}
                    max={max}
                    step={step}
                    suffix={suffix}
                    onChange={(value) => onInspectorChange({
                      colorGrade: { ...(inspector.colorGrade ?? DEFAULT_COLOR_GRADE), [key]: value } as ColorGradeState,
                    })}
                  />
                ))}
              </div>
            </div>
            <select value={inspector.transition} onChange={(event) => onInspectorChange({ transition: event.target.value as ClipInspectorState['transition'] })} className="input-field text-xs">
              <option value="cut">Hard cut</option>
              <option value="dissolve">Cross dissolve</option>
              <option value="wipe">Directional wipe</option>
              <option value="fade-black">Fade through black</option>
              <option value="slide-left">Slide left</option>
              <option value="zoom">Zoom push</option>
            </select>
            <div className="grid gap-2">
              <button type="button" onClick={() => onImproveScene(selectedScene)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-muted-olive)] px-3 py-2 text-xs font-semibold text-[var(--color-ash-brown)]">
                <Wand2 size={14} /> Improve Script Part
              </button>
              <button type="button" onClick={() => onGenerateSceneVideo(selectedScene)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-3 py-2 text-xs font-semibold text-[var(--color-vanilla-cream)]">
                <RefreshCcw size={14} /> Re-render Clip In Place
              </button>
              <button type="button" onClick={() => onGenerateSceneTts(selectedScene.id)} disabled={sceneIsGeneratingTts(selectedScene) || (!sceneHasReadyTts(selectedScene) && (!audioModel || !ensureSceneTtsLines(selectedScene).some((line) => line.text.trim())))} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-dark disabled:opacity-45">
                <Volume2 size={14} /> {sceneHasReadyTts(selectedScene) ? 'Add dialogue to timeline' : 'Generate first line'}
              </button>
              {selectedScene.catalogStatus === 'pending_approval' && onApproveScene ? (
                <button type="button" onClick={() => onApproveScene(selectedScene)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-muted-olive)] px-3 py-2 text-xs font-semibold text-[var(--color-ash-brown)]">
                  <CheckCircle2 size={14} /> Approve Scene
                </button>
              ) : selectedScene.catalogStatus === 'approved' ? (
                <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-muted-olive)] px-3 py-2 text-xs font-semibold text-[var(--color-muted-olive)]">
                  <CheckCircle2 size={14} /> Approved
                </span>
              ) : (selectedScene.catalogStatus === 'failed' || selectedScene.catalogStatus === 'rejected') && onRetryScene ? (
                <button type="button" onClick={() => onRetryScene(selectedScene)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-dark">
                  <RefreshCcw size={14} /> Retry scene
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-muted">Select a timeline clip to edit generation, transform, audio, and caption properties.</p>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-[var(--color-tea-green)] bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-dark">
          <Music2 size={16} className="text-[var(--color-ash-brown)]" />
          Export Pipeline
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-tea-green)]/35">
          <div className="h-full rounded-full bg-[var(--color-muted-olive)] transition-[width]" style={{ width: `${clamp(activeProgress, 0, 100)}%` }} />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">{activeStatusText}</p>
        <p className="mt-2 text-[11px] text-muted">{readyClipCount}/{sceneCount} clips ready for compilation.</p>
        <button type="button" onClick={() => onRenderMaster()} disabled={!canRender || isRendering} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-ash-brown)] px-4 py-3 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45">
          {isRendering ? 'Compiling...' : 'Compile Master MP4'}
        </button>
        {renderDisabledReason && <p className="mt-2 text-xs leading-relaxed text-[var(--color-faded-copper)]">{renderDisabledReason}</p>}
      </div>
    </aside>
  );
}
