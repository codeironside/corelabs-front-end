import { useMemo, useRef, useState } from 'react';
import { Clock3, ExternalLink, Link2, Mic, Music2, Play, Plus, Search, Trash2, UploadCloud, Volume2, VolumeX } from 'lucide-react';
import type { EpisodeSceneCard } from '../storyboard';
import { studioStreamMediaUrl } from '../studioMediaUrl';
import { ensureSceneTtsLines, sceneHasReadyTts, ttsLineTimelineWindow } from '../sceneTts';
import { sceneDuration } from './editorUtils';
import { mergeAudioFx, MIC_SUGGESTED_FX } from './audioFx';
import { createSfxPresetFile, SFX_PRESETS, type SfxCategory, type SfxPreset } from './sfxLibrary';
import { SOUNDTRACK_SOURCES } from './soundtrackSources';
import { useAuthStore } from '@/store/authStore';
import type { ContentAudioScope, ReusableAudioAsset } from '@/api/content';
import type { TimelineAudioLayer } from './types';

const sfxCategories: Array<SfxCategory | 'All'> = ['All', 'Ambience', 'Crowd', 'Music Beds', 'Transitions', 'Impacts', 'Foley'];

export function AudioLayerControls({
  selectedScene,
  totalDuration,
  sceneAudioMuted,
  audioLayers,
  reusableAudioAssets,
  onSceneAudioMuteChange,
  onAddAudioLayer,
  onUpdateAudioLayer,
  onRemoveAudioLayer,
  onUploadAudioFile,
  selectedAudioLayerId = '',
  onSelectAudioLayer,
}: {
  selectedScene?: EpisodeSceneCard;
  totalDuration: number;
  sceneAudioMuted: Record<string, boolean>;
  audioLayers: TimelineAudioLayer[];
  reusableAudioAssets: ReusableAudioAsset[];
  onSceneAudioMuteChange: (sceneId: string, muted: boolean) => void;
  onAddAudioLayer: (layer: TimelineAudioLayer) => void;
  onUpdateAudioLayer: (id: string, patch: Partial<TimelineAudioLayer>) => void;
  onRemoveAudioLayer: (id: string) => void;
  onUploadAudioFile: (file: File, kind: TimelineAudioLayer['kind'], options?: { saveToLibrary?: boolean; scope?: ContentAudioScope; label?: string }) => Promise<string>;
  selectedAudioLayerId?: string;
  onSelectAudioLayer?: (layerId: string) => void;
}) {
  const user = useAuthStore((state) => state.user);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const soundtrackInputRef = useRef<HTMLInputElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [sfxQuery, setSfxQuery] = useState('');
  const [activeSfxCategory, setActiveSfxCategory] = useState<SfxCategory | 'All'>('All');
  const [previewingSfxId, setPreviewingSfxId] = useState('');
  const [onlineAudioUrl, setOnlineAudioUrl] = useState('');
  const [onlineAudioLabel, setOnlineAudioLabel] = useState('');
  const [onlineAudioKind, setOnlineAudioKind] = useState<TimelineAudioLayer['kind']>('music');
  const [saveUploadsToLibrary, setSaveUploadsToLibrary] = useState(false);
  const [libraryScope, setLibraryScope] = useState<ContentAudioScope>('workspace');

  const selectedMuted = selectedScene ? Boolean(sceneAudioMuted[selectedScene.id]) : false;
  const sceneStart = selectedScene?.startSec ?? 0;
  const sceneEnd = selectedScene?.endSec ?? sceneStart + 10;
  const canPublishGlobalAudio = user?.role === 'admin' || user?.role === 'super_admin';
  const filteredSfxPresets = useMemo(
    () =>
      SFX_PRESETS.filter((preset) => {
        const matchesCategory = activeSfxCategory === 'All' || preset.category === activeSfxCategory;
        const query = sfxQuery.trim().toLowerCase();
        const matchesQuery = !query || `${preset.label} ${preset.description} ${preset.category}`.toLowerCase().includes(query);
        return matchesCategory && matchesQuery;
      }),
    [activeSfxCategory, sfxQuery],
  );

  async function addUploadedAudio(file: File, kind: TimelineAudioLayer['kind']) {
    if (!selectedScene) return;
    onSceneAudioMuteChange(selectedScene.id, true);
    const id = crypto.randomUUID();
    const localUrl = URL.createObjectURL(file);
    onAddAudioLayer({
      id,
      kind,
      label: kind === 'mic' ? `Mic take for Scene ${selectedScene.sceneNumber}` : file.name,
      url: localUrl,
      startSec: sceneStart,
      endSec: sceneEnd,
      volume: 90,
      ...(kind === 'mic' ? { fx: mergeAudioFx(MIC_SUGGESTED_FX) } : {}),
    });
    onSelectAudioLayer?.(id);
    setIsUploading(true);
    setStatusText('Uploading audio. Local preview is already available.');
    try {
      const url = await onUploadAudioFile(file, kind, {
        saveToLibrary: saveUploadsToLibrary,
        scope: libraryScope,
        label: kind === 'mic' ? `Mic take for Scene ${selectedScene.sceneNumber}` : file.name,
      });
      onUpdateAudioLayer(id, { url });
      setStatusText('Audio saved to workspace.');
    } catch {
      onUpdateAudioLayer(id, { label: `${kind === 'mic' ? 'Mic take' : file.name} (local preview)` });
      setStatusText('Audio is available as local preview. Server upload failed.');
    } finally {
      setIsUploading(false);
    }
  }

  async function addSoundtrack(file: File) {
    const id = crypto.randomUUID();
    const localUrl = URL.createObjectURL(file);
    onAddAudioLayer({
      id,
      kind: 'music',
      label: file.name,
      url: localUrl,
      startSec: 0,
      endSec: totalDuration,
      volume: 45,
    });
    setIsUploading(true);
    setStatusText('Uploading soundtrack. Local preview is already available.');
    try {
      const url = await onUploadAudioFile(file, 'music', {
        saveToLibrary: saveUploadsToLibrary,
        scope: libraryScope,
        label: file.name,
      });
      onUpdateAudioLayer(id, { url });
      setStatusText('Soundtrack saved to workspace.');
    } catch {
      onUpdateAudioLayer(id, { label: `${file.name} (local preview)` });
      setStatusText('Soundtrack is available as local preview. Server upload failed.');
    } finally {
      setIsUploading(false);
    }
  }

  async function addSfxPreset(preset: SfxPreset) {
    const file = await createSfxPresetFile(preset);
    const id = crypto.randomUUID();
    const localUrl = URL.createObjectURL(file);
    const startSec = selectedScene?.startSec ?? 0;
    onAddAudioLayer({
      id,
      kind: 'sfx',
      label: preset.label,
      url: localUrl,
      startSec,
      endSec: Math.min(totalDuration, startSec + preset.duration),
      volume: preset.volume,
    });
    setIsUploading(true);
    setStatusText(`${preset.label} added to Music/SFX.`);
    try {
      const url = await onUploadAudioFile(file, 'sfx', {
        saveToLibrary: saveUploadsToLibrary,
        scope: libraryScope,
        label: preset.label,
      });
      onUpdateAudioLayer(id, { url });
    } catch {
      onUpdateAudioLayer(id, { label: `${preset.label} (local preview)` });
    } finally {
      setIsUploading(false);
    }
  }

  async function previewSfxPreset(preset: SfxPreset) {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
    setPreviewingSfxId(preset.id);
    try {
      const file = await createSfxPresetFile(preset);
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.volume = Math.min(1, preset.volume / 100);
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(url);
        setPreviewingSfxId('');
      }, { once: true });
      await audio.play();
    } catch {
      setPreviewingSfxId('');
      setStatusText('SFX preview could not start. Try adding it to the timeline.');
    }
  }

  async function toggleRecording() {
    if (isRecording) {
      recorderRef.current?.stop();
      return;
    }
    if (!selectedScene) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatusText('Mic recording requires a browser with media recording support.');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatusText('Microphone permission was blocked or unavailable.');
      return;
    }
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      setIsRecording(false);
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const file = new File([blob], `scene-${selectedScene.sceneNumber}-mic.webm`, { type: 'audio/webm' });
      await addUploadedAudio(file, 'mic');
    };
    recorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
    setStatusText('Recording mic input...');
  }

  function addSceneTtsLayer() {
    if (!selectedScene) return;
    const lines = ensureSceneTtsLines(selectedScene).filter((line) => line.status === 'ready' && line.audioUrl);
    if (lines.length === 0) return;
    onSceneAudioMuteChange(selectedScene.id, true);
    lines.forEach((line, index) => {
      const streamUrl = studioStreamMediaUrl(line.audioUrl) ?? line.audioUrl;
      if (!streamUrl) return;
      const window = ttsLineTimelineWindow(selectedScene, index, lines.length);
      onAddAudioLayer({
        id: `tts-${selectedScene.id}-${line.id}`,
        kind: 'tts',
        label: line.label || `${line.speaker ? `${line.speaker} ┬╖ ` : ''}Scene ${selectedScene.sceneNumber} line ${index + 1}`,
        url: streamUrl,
        startSec: window.startSec,
        endSec: window.endSec,
        volume: 90,
      });
    });
  }

  function importOnlineAudio() {
    const url = onlineAudioUrl.trim();
    if (!url) return;
    const isMusic = onlineAudioKind === 'music';
    onAddAudioLayer({
      id: crypto.randomUUID(),
      kind: onlineAudioKind,
      label: onlineAudioLabel.trim() || (isMusic ? 'Online soundtrack' : 'Online SFX'),
      url,
      startSec: isMusic ? 0 : sceneStart,
      endSec: isMusic ? totalDuration : Math.min(totalDuration, sceneStart + 8),
      volume: isMusic ? 42 : 70,
    });
    setOnlineAudioUrl('');
    setOnlineAudioLabel('');
    setStatusText(`${isMusic ? 'Soundtrack' : 'SFX'} URL added to the timeline. Confirm the source license before publishing.`);
  }

  function addReusableAudio(asset: ReusableAudioAsset) {
    const isMusic = asset.kind === 'music';
    onAddAudioLayer({
      id: crypto.randomUUID(),
      kind: asset.kind,
      label: asset.label,
      url: asset.cloudinaryUrl || asset.s3Url || asset.url,
      startSec: isMusic ? 0 : sceneStart,
      endSec: isMusic ? totalDuration : Math.min(totalDuration, sceneStart + (asset.durationSec ?? 8)),
      volume: isMusic ? 42 : 70,
    });
    setStatusText(`${asset.label} added under Music/SFX.`);
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-dark">
          <Music2 size={16} className="text-[var(--color-ash-brown)]" />
          Audio Layers
        </div>
        {selectedScene && (
          <button
            type="button"
            onClick={() => onSceneAudioMuteChange(selectedScene.id, !selectedMuted)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${selectedMuted ? 'bg-[var(--color-faded-copper)]/25 text-[var(--color-ash-brown)]' : 'border border-border text-dark'}`}
          >
            {selectedMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            {selectedMuted ? 'Use scene audio' : 'Mute scene audio'}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void addUploadedAudio(file, 'upload');
            event.currentTarget.value = '';
          }}
        />
        <input
          ref={soundtrackInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void addSoundtrack(file);
            event.currentTarget.value = '';
          }}
        />
        <button type="button" disabled={!selectedScene || isUploading} onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-dark disabled:opacity-45">
          <UploadCloud size={13} /> Upload Audio
        </button>
        <button type="button" disabled={isUploading} onClick={() => soundtrackInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-dark disabled:opacity-45">
          <Music2 size={13} /> Add Soundtrack
        </button>
        <button type="button" disabled={!selectedScene || isUploading} onClick={toggleRecording} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-45 ${isRecording ? 'bg-red-100 text-red-700' : 'border border-border text-dark'}`}>
          <Mic size={13} /> {isRecording ? 'Stop Recording' : 'Record Mic'}
        </button>
        <button type="button" disabled={!selectedScene || !sceneHasReadyTts(selectedScene)} onClick={addSceneTtsLayer} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-muted-olive)] px-3 py-2 text-xs font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45">
          <Plus size={13} /> Add Scene TTS
        </button>
      </div>
      <div className="mt-3 rounded-lg border border-border bg-[var(--color-tea-green)]/10 p-3">
        <label className="flex items-start gap-2 text-xs font-semibold text-dark">
          <input
            type="checkbox"
            checked={saveUploadsToLibrary}
            onChange={(event) => setSaveUploadsToLibrary(event.target.checked)}
            className="mt-0.5 accent-[var(--color-muted-olive)]"
          />
          Save uploaded SFX/soundtracks to reusable library
        </label>
        {saveUploadsToLibrary && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={libraryScope}
              onChange={(event) => setLibraryScope(event.target.value as ContentAudioScope)}
              className="input-field max-w-48 text-xs"
            >
              <option value="workspace">Workspace reuse</option>
              <option value="public" disabled={!canPublishGlobalAudio}>Global reuse</option>
            </select>
            {!canPublishGlobalAudio && <span className="text-[10px] font-semibold text-muted">Global reuse is admin-only.</span>}
          </div>
        )}
      </div>
      {statusText && <p className="mt-2 text-xs leading-relaxed text-muted">{statusText}</p>}

      <div className="mt-3 rounded-lg border border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Reusable Music / SFX</p>
          <span className="rounded-full bg-[var(--color-tea-green)]/35 px-2 py-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">{reusableAudioAssets.length} saved</span>
        </div>
        {reusableAudioAssets.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted">Saved workspace/global audio will appear here for reuse.</p>
        ) : (
          <div className="mt-2 grid max-h-48 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {reusableAudioAssets.map((asset) => (
              <button
                key={asset._id}
                type="button"
                onClick={() => addReusableAudio(asset)}
                className="rounded-lg border border-border bg-white p-3 text-left hover:border-[var(--color-muted-olive)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-dark">{asset.label}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{asset.kind} ┬╖ {asset.scope}</p>
                  </div>
                  <Plus size={13} className="shrink-0 text-[var(--color-ash-brown)]" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-[var(--color-tea-green)]/70 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">SFX Library</p>
          <span className="rounded-full bg-[var(--color-tea-green)]/35 px-2 py-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">{filteredSfxPresets.length} presets</span>
        </div>
        <label className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs text-muted">
          <Search size={14} className="shrink-0 text-[var(--color-ash-brown)]" />
          <input
            type="search"
            value={sfxQuery}
            onChange={(event) => setSfxQuery(event.target.value)}
            placeholder="Search crowd, rain, hit, typing..."
            className="w-full bg-transparent font-medium text-dark outline-none placeholder:text-muted"
          />
        </label>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {sfxCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveSfxCategory(category)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold ${activeSfxCategory === category ? 'bg-[var(--color-muted-olive)] text-[var(--color-vanilla-cream)]' : 'bg-[var(--color-tea-green)]/35 text-[var(--color-ash-brown)]'}`}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {filteredSfxPresets.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted sm:col-span-2">No SFX matched that search.</p>
          ) : (
            filteredSfxPresets.map((preset) => (
              <div key={preset.id} className="rounded-lg border border-border bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-dark">{preset.label}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted">{preset.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--color-faded-copper)]/15 px-2 py-1 text-[9px] font-semibold text-[var(--color-ash-brown)]">{preset.category}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-muted">
                  <span className="inline-flex items-center gap-1"><Clock3 size={11} /> {preset.duration}s</span>
                  <span className="inline-flex items-center gap-1"><Volume2 size={11} /> {preset.volume}%</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void previewSfxPreset(preset)}
                    disabled={previewingSfxId === preset.id}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-2 text-[10px] font-semibold text-dark disabled:opacity-45"
                  >
                    <Play size={12} />
                    {previewingSfxId === preset.id ? 'Playing' : 'Preview'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void addSfxPreset(preset)}
                    disabled={isUploading}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-tea-green)]/45 px-2 py-2 text-[10px] font-semibold text-[var(--color-ash-brown)] disabled:opacity-45"
                  >
                    <Plus size={12} />
                    Add
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-border bg-[var(--color-tea-green)]/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Online Soundtracks & Real SFX</p>
          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">license check required</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {SOUNDTRACK_SOURCES.map((source) => (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border bg-white p-3 text-left shadow-sm hover:border-[var(--color-muted-olive)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-dark">{source.name}</p>
                  <p className="mt-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">{source.bestFor}</p>
                </div>
                <ExternalLink size={13} className="shrink-0 text-[var(--color-ash-brown)]" />
              </div>
              <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-muted">{source.note}</p>
              <span className="mt-2 inline-flex rounded-full bg-[var(--color-faded-copper)]/15 px-2 py-1 text-[9px] font-semibold text-[var(--color-ash-brown)]">{source.kind}</span>
            </a>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-border bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-dark">
            <Link2 size={14} className="text-[var(--color-ash-brown)]" />
            Add direct audio URL
          </div>
          <div className="grid gap-2">
            <input
              type="url"
              value={onlineAudioUrl}
              onChange={(event) => setOnlineAudioUrl(event.target.value)}
              placeholder="Paste a direct .mp3, .wav, .ogg, or CDN audio URL"
              className="input-field text-xs"
            />
            <input
              type="text"
              value={onlineAudioLabel}
              onChange={(event) => setOnlineAudioLabel(event.target.value)}
              placeholder="Track label, e.g. Lagos market ambience"
              className="input-field text-xs"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select value={onlineAudioKind} onChange={(event) => setOnlineAudioKind(event.target.value as TimelineAudioLayer['kind'])} className="input-field max-w-36 text-xs">
                <option value="music">Music</option>
                <option value="sfx">SFX</option>
              </select>
              <button
                type="button"
                onClick={importOnlineAudio}
                disabled={!onlineAudioUrl.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-muted-olive)] px-3 py-2 text-xs font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45"
              >
                <Plus size={13} />
                Add URL
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {audioLayers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted">No overlay audio yet. Add TTS, upload audio, or record a mic take for the selected scene.</p>
        ) : (
          audioLayers.map((layer) => (
            <div
              key={layer.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectAudioLayer?.(layer.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelectAudioLayer?.(layer.id);
              }}
              className={`rounded-lg border p-3 transition ${selectedAudioLayerId === layer.id ? 'border-[var(--color-faded-copper)] bg-[var(--color-faded-copper)]/8 ring-1 ring-[var(--color-faded-copper)]' : 'border-border'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-dark">{layer.label}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted">{layer.kind} | {layer.startSec.toFixed(1)}s - {layer.endSec.toFixed(1)}s</p>
                </div>
                <button type="button" aria-label="Remove audio layer" onClick={() => onRemoveAudioLayer(layer.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-[var(--color-ash-brown)]">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-4">
                <label className="text-[10px] font-semibold text-muted">
                  Start
                  <input type="number" value={layer.startSec} min={0} step={0.5} onChange={(event) => onUpdateAudioLayer(layer.id, { startSec: Number(event.target.value) })} className="input-field mt-1 text-xs" />
                </label>
                <label className="text-[10px] font-semibold text-muted">
                  End
                  <input type="number" value={layer.endSec} min={layer.startSec + 0.5} step={0.5} onChange={(event) => onUpdateAudioLayer(layer.id, { endSec: Number(event.target.value) })} className="input-field mt-1 text-xs" />
                </label>
                <label className="text-[10px] font-semibold text-muted">
                  Volume {layer.volume}%
                  <input type="range" min={0} max={120} value={layer.volume} onChange={(event) => onUpdateAudioLayer(layer.id, { volume: Number(event.target.value) })} className="mt-2 w-full accent-[var(--color-muted-olive)]" />
                </label>
                <button
                  type="button"
                  onClick={() => onUpdateAudioLayer(layer.id, { muted: !layer.muted })}
                  className={`mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${layer.muted ? 'bg-[var(--color-faded-copper)]/25 text-[var(--color-ash-brown)]' : 'border border-border text-dark'}`}
                >
                  {layer.muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  {layer.muted ? 'Track muted' : 'Track on'}
                </button>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-tea-green)]/30">
                <div className="h-full rounded-full bg-[var(--color-faded-copper)]" style={{ width: `${Math.min(100, (Math.max(1, layer.endSec - layer.startSec) / Math.max(1, sceneDuration(selectedScene ?? { startSec: sceneStart, endSec: sceneEnd }))) * 100)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
