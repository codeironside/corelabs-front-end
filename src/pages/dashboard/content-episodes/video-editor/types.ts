import type { AiModelOption, ContentAudioScope, ContentModule, ReusableAudioAsset } from '@/api/content';
import type { EpisodeSceneCard, ThemeCharacterReference } from '../storyboard';

export type EditorAssetTab = 'cast' | 'video' | 'audio' | 'brand';
export type TimelineTool = 'select' | 'blade' | 'speed' | 'transition';
export type EditorAspectRatio = '9:16' | '16:9';
export type TransitionKind = 'cut' | 'dissolve' | 'wipe' | 'fade-black' | 'slide-left' | 'zoom';

export type TimelineAudioLayer = {
  id: string;
  kind: 'tts' | 'upload' | 'mic' | 'music' | 'sfx';
  label: string;
  url: string;
  startSec: number;
  endSec: number;
  volume: number;
  muted?: boolean;
  /** Seconds into the source file where this block begins playback. */
  clipOffsetSec?: number;
  /** Optional fixed sub-lane within the Music/SFX or TTS row. */
  lane?: number;
  /** Per-clip equalizer and cleanup settings for preview. */
  fx?: AudioFxSettings;
};

export type AudioFxSettings = {
  noiseReduction: number;
  deClick: number;
  dePlosive: number;
  deEss: number;
  noiseGate: number;
  deReverb: number;
  lowCutHz: number;
  bassDb: number;
  midDb: number;
  trebleDb: number;
  presenceDb: number;
  compression: number;
  limiting: number;
  pitchSemitones: number;
  autoTune: number;
  reverb: number;
  delay: number;
  chorus: number;
  saturation: number;
  vocalRiding: number;
};

export type AudioSoloTarget = {
  track: 'tts' | 'music-sfx';
  lane: number;
} | null;

export type ColorGradeState = {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  exposure: number;
  shadows: number;
  highlights: number;
};

export type TimelineBrollLayer = {
  id: string;
  sceneId: string;
  label: string;
  source: 'episode-asset' | 'generated' | 'manual';
  sourceUrl?: string;
  startSec: number;
  endSec: number;
  opacity: number;
};

export type TimelineRenderOptions = {
  transitions: Record<string, TransitionKind>;
  brollLayers?: TimelineBrollLayer[];
};

export type EpisodeAssetBinItem = {
  id: string;
  name: string;
  tag: string;
  url?: string;
};

export type EpisodeTimelineSegment = {
  sceneNumber: number;
  startSec: number;
  endSec: number;
  status: 'queued' | 'generating' | 'ready' | 'failed' | 'unrendered' | 'pending_approval' | 'approved' | 'rejected';
  videoUrl?: string;
  cloudinaryUrl?: string;
  s3Url?: string;
  error?: string;
};

export type SubtitleCue = {
  id: string;
  sceneId: string;
  startSec: number;
  endSec: number;
  text: string;
};

export type SubtitleStyle = {
  font: string;
  size: number;
  tracking: number;
  fill: string;
  stroke: string;
  shadow: boolean;
  backgroundOpacity: number;
  animation: 'static' | 'karaoke' | 'kinetic';
};

export type ClipInspectorState = {
  scale: number;
  x: number;
  y: number;
  opacity: number;
  gain: number;
  speed: number;
  transition: TransitionKind;
  colorGrade: ColorGradeState;
};

export type VideoEditorWorkspaceProps = {
  selectedModule?: ContentModule;
  scenes: EpisodeSceneCard[];
  activeSegments: EpisodeTimelineSegment[];
  themeCharacterRefs: ThemeCharacterReference[];
  assets: EpisodeAssetBinItem[];
  selectedSceneId: string;
  sceneSelectionVersion: number;
  finalVideoUrl?: string;
  activeProgress: number;
  activeStatusText: string;
  canRender: boolean;
  isRendering: boolean;
  renderDisabledReason: string;
  canSequentialGenerate?: boolean;
  isSequentialGenerating?: boolean;
  sequentialDisabledReason?: string;
  approvalProgressText?: string;
  approvalBusy?: boolean;
  soundEnabled: boolean;
  audioModel: string;
  videoModel: string;
  videoModels: AiModelOption[];
  moduleDestinations: string[];
  transitions: Record<string, TransitionKind>;
  sceneAudioMuted: Record<string, boolean>;
  audioLayers: TimelineAudioLayer[];
  reusableAudioAssets: ReusableAudioAsset[];
  brollLayers: TimelineBrollLayer[];
  onTransitionChange: (sceneId: string, transition: TransitionKind) => void;
  onSceneAudioMuteChange: (sceneId: string, muted: boolean) => void;
  onAddAudioLayer: (layer: TimelineAudioLayer) => void;
  onUpdateAudioLayer: (id: string, patch: Partial<TimelineAudioLayer>) => void;
  onRemoveAudioLayer: (id: string) => void;
  onAddBrollLayer: (sceneId: string) => void;
  onUpdateBrollLayer: (id: string, patch: Partial<TimelineBrollLayer>) => void;
  onRemoveBrollLayer: (id: string) => void;
  onUploadAudioFile: (file: File, kind: TimelineAudioLayer['kind'], options?: { saveToLibrary?: boolean; scope?: ContentAudioScope; label?: string }) => Promise<string>;
  onSelectScene: (sceneId: string) => void;
  onUpdateScene: (sceneId: string, patch: Partial<EpisodeSceneCard>) => void;
  onGenerateSceneVideo: (scene: EpisodeSceneCard) => void;
  onImproveScene: (scene: EpisodeSceneCard) => void;
  onGenerateSceneTts: (sceneId: string) => void;
  onReorderScene: (draggedSceneId: string, targetSceneId: string) => void;
  onRenderMaster: (options?: TimelineRenderOptions) => void;
  onSequentialGenerate?: () => void;
  onApproveScene?: (scene: EpisodeSceneCard) => void;
  onRetryScene?: (scene: EpisodeSceneCard) => void;
  onEditRetryScene?: (scene: EpisodeSceneCard, editedBeat: string) => void;
  onCancelScene?: (scene: EpisodeSceneCard) => void;
  onVideoModelChange: (model: string) => void;
};
