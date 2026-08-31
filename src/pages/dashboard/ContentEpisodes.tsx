import { useCallback, useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertTriangle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Film,
  Headphones,
  ImageIcon,
  Layers3,
  Loader2,
  LockKeyhole,
  MonitorPlay,
  Palette,
  PencilLine,
  Play,
  Plus,
  RefreshCcw,
  Route,
  Save,
  Sparkles,
  Timer,
  Trash2,
  UploadCloud,
  Volume2,
  Wand2,
} from 'lucide-react';
import {
  buildEmptySceneBoard,
  episodeSourceRequirementsMet,
  resolveEpisodeGenerationContext,
  resolveSceneVideoGenerationContext,
  sceneHasGenerationContent,
  scenesReadyForGeneration,
  type EpisodeScriptWorkflow,
} from './content-episodes/episodeGeneration';
import { playEpisodeAudio } from './content-episodes/episodeAudioPlayback';
import { episodeSceneCardFromDoc, mergeSceneMediaFromDoc, sceneDocEpisodeKey, shouldApplySceneDocToCard } from './content-episodes/sceneMediaState';
import { ProtectedStudioVideo } from './content-episodes/ProtectedStudioVideo';
import { studioStreamMediaUrl } from './content-episodes/studioMediaUrl';
import {
  buildSceneCards,
  createSceneCard,
  extractHandles,
  inferBackgroundLoras,
  parseThemeCharacterMentions,
  parseThemeCharacterReferences,
  themeCharacterJsonSource,
  retimeScenes,
  resolveSceneVoiceProfile,
  sceneCountForDuration,
  timestamp,
  voiceProfileLabel,
  type EpisodeSceneCard,
} from './content-episodes/storyboard';
import { fitImageFileToCanvas } from './content-episodes/imageFit';
import { composeEpisodeThumbnail } from './content-episodes/thumbnailComposer';
import { SceneMarkdownEditor } from './content-episodes/SceneMarkdownEditor';
import {
  parseThemeCharacterTtsProfiles,
  resolveLineTtsFromSpeaker,
} from './content-episodes/characterTts';
import { ThemeCharacterTtsSummary } from './content-episodes/ThemeCharacterTtsSummary';
import { SceneDialogueTtsPanel } from './content-episodes/SceneDialogueTtsPanel';
import { TtsVoiceSelect } from './content-episodes/TtsVoiceSelect';
import { tonePresetLabel, TTS_TONE_PRESETS, type EpisodeTtsTone, type EpisodeTtsTonePreset } from './content-episodes/ttsTone';
import {
  addSceneTtsLine,
  ensureSceneTtsLines,
  invalidateSceneTtsLines,
  removeSceneTtsLine,
  sceneHasReadyTts,
  sceneIsGeneratingTts,
  syncSceneLegacyTtsFields,
  ttsLineTimelineWindow,
  updateSceneTtsLine,
  type EpisodeSceneTtsLine,
} from './content-episodes/sceneTts';
import { VideoEditorWorkspace } from './content-episodes/video-editor/VideoEditorWorkspace';
import {
  generateEpisodeImage as generateEpisodeImageRequest,
  generateEpisodeMedia as generateEpisodeMediaRequest,
  generateEpisodeSceneVideo as generateEpisodeSceneVideoRequest,
  generateEpisodeScript as generateEpisodeScriptRequest,
  generateEpisodeTts as generateEpisodeTtsRequest,
  getContentStudioDraft,
  getContentEpisode,
  listContentEpisodes,
  listReusableAudioAssets,
  listSocialConnections,
  listAvailableAiModels,
  listContentModules,
  listThemes,
  pollKlingStatus,
  publishEpisode as publishEpisodeRequest,
  publishEpisodeToWebsite,
  renderEpisodeTimeline as renderEpisodeTimelineRequest,
  saveEpisodeThumbnail as saveEpisodeThumbnailRequest,
  uploadEpisodeAudio as uploadEpisodeAudioRequest,
  uploadEpisodeImage as uploadEpisodeImageRequest,
  improveEpisodeScene as improveEpisodeSceneRequest,
  refineEpisodeImagePrompt as refineEpisodeImagePromptRequest,
  saveContentStudioDraft,
  type AiModelOption,
  type AvailableAiModels,
  type ContentEpisode,
  type ContentEpisodeScene,
  type ContentModule,
  type EpisodeStatusResult,
} from '@/api/content';
import { Select, type SelectOption } from '@/components/Select';
import toast from 'react-hot-toast';
import type { TimelineAudioLayer, TimelineBrollLayer, TimelineRenderOptions, TransitionKind } from './content-episodes/video-editor/types';
import { assignDedicatedLane } from './content-episodes/video-editor/audioLaneLayout';

type GenerationMode = 'text' | 'media';
type IntroSource = 'upload' | 'ai';
type ReviewState = 'idle' | 'generating' | 'ready' | 'editing' | 'queued';
type ScriptState = 'idle' | 'generating' | 'ready';
type ScriptWorkflow = EpisodeScriptWorkflow;
type ScriptView = 'edit' | 'preview';
type OverlayAlign = 'left' | 'center' | 'right';
type ModelUse = 'text' | 'image' | 'video' | 'audio';
type PublishPlatform = 'youtube' | 'tiktok' | 'instagram';

function publishPlatformLabel(platform: PublishPlatform) {
  return platform === 'youtube' ? 'YouTube' : platform === 'tiktok' ? 'TikTok' : 'Instagram';
}

function cleanPublishDescription({
  title,
  basePrompt,
  moduleTitle,
  moduleDescription,
}: {
  title: string;
  basePrompt: string;
  moduleTitle?: string;
  moduleDescription?: string;
}) {
  const lines = [
    title.trim(),
    basePrompt.trim() || moduleDescription?.trim(),
    moduleTitle ? `Series: ${moduleTitle}` : '',
  ].filter(Boolean);
  return lines.join('\n\n').slice(0, 2200);
}

type EpisodeAsset = {
  id: string;
  name: string;
  tag: string;
  url?: string;
};

const FONT_OPTIONS: SelectOption<string>[] = [
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Lora', label: 'Lora' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Bebas Neue', label: 'Bebas Neue' },
  { value: 'Roboto Slab', label: 'Roboto Slab' },
  { value: 'Nunito Sans', label: 'Nunito Sans' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'Cinzel', label: 'Cinzel' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond' },
  { value: 'DM Serif Display', label: 'DM Serif Display' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
  { value: 'Source Sans 3', label: 'Source Sans 3' },
  { value: 'Work Sans', label: 'Work Sans' },
  { value: 'Ubuntu', label: 'Ubuntu' },
  { value: 'Rubik', label: 'Rubik' },
  { value: 'Anton', label: 'Anton' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Arial', label: 'Arial' },
];

const TARGET_DURATION_OPTIONS = [30, 60, 90];

const PLATFORM_TAGS = [
  { needle: 'youtube', label: 'Official Studio YouTube' },
  { needle: 'tiktok', label: 'Official Studio TikTok' },
  { needle: 'instagram', label: 'Official Studio Instagram' },
];

const EMPTY_AI_MODELS: AvailableAiModels = {
  text: [],
  image: [],
  video: [],
  audio: [],
};

const EPISODE_MODULE_SESSION_KEY = 'content-studio-episode-module-id';

const PROVIDER_ORDER: AiModelOption['provider'][] = ['openai', 'anthropic', 'google', 'xai', 'kling', 'elevenlabs'];
type EpisodeCanvasDraft = {
  moduleId: string;
  title: string;
  basePrompt: string;
  mode: GenerationMode;
  duration: number;
  extendedCut: boolean;
  soundEnabled: boolean;
  textModel: string;
  imageModel: string;
  videoModel: string;
  audioModel: string;
  voiceProfile: string;
  defaultTtsTonePreset?: EpisodeTtsTonePreset;
  defaultTtsToneDirection?: string;
  introSource: IntroSource;
  introPrompt: string;
  thumbnailPreviewUrl: string;
  thumbnailPreviewLabel: string;
  committedThumbnailUrl: string;
  committedThumbnailLabel: string;
  overlayText: string;
  overlayFont: string;
  overlayColor: string;
  overlayAlign: OverlayAlign;
  overlayX: number;
  overlayY: number;
  overlayOpacity: number;
  scriptWorkflow: ScriptWorkflow;
  scriptDraft: string;
  scriptApproved: boolean;
  selectedCharacterRefIds: string[];
  scenes: EpisodeSceneCard[];
  selectedTimelineSceneId: string;
  timelineTransitions: Record<string, TransitionKind>;
  sceneAudioMuted: Record<string, boolean>;
  timelineAudioLayers: TimelineAudioLayer[];
  timelineBrollLayers: TimelineBrollLayer[];
  assets: EpisodeAsset[];
  finalDraft: string;
};

function Panel({
  title,
  kicker,
  icon: Icon,
  children,
}: {
  title: string;
  kicker: string;
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-tea-green)]/45">
          <Icon size={18} className="text-[var(--color-ash-brown)]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-dark">{title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{kicker}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function TagPill({ icon: Icon, label }: { icon: ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-tea-green)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-ash-brown)]">
      <Icon size={13} />
      {label}
    </span>
  );
}

function allModels(models: AvailableAiModels) {
  return [...models.text, ...models.image, ...models.video, ...models.audio];
}

function findModel(value: string, models: AvailableAiModels) {
  return allModels(models).find((option) => option.value === value);
}

function ModelSelect({
  label,
  value,
  use,
  options,
  onChange,
}: {
  label: string;
  value: string;
  use: ModelUse;
  options: AiModelOption[];
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value);
  const hasOptions = options.length > 0;

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      <select className="input-field text-sm" value={value} onChange={(e) => onChange(e.target.value)} disabled={!hasOptions}>
        {!hasOptions && <option value="">No models available</option>}
        {PROVIDER_ORDER.map((provider) => {
          const providerOptions = options.filter((option) => option.provider === provider);
          if (providerOptions.length === 0) return null;
          const providerLabel = providerOptions[0].providerLabel;
          return (
            <optgroup key={provider} label={providerLabel}>
              {providerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        {selected ? `${selected.providerLabel} powers this ${use} stage.` : `No ${use} model is currently available.`}
      </p>
    </div>
  );
}

function getPlatformLabels(module?: ContentModule) {
  if (!module) return ['Select a module'];
  const source = `${module.creativePrompt} ${module.genre} ${module.themeLine}`.toLowerCase();
  const found = PLATFORM_TAGS.filter((platform) => source.includes(platform.needle)).map((platform) => platform.label);
  return found.length ? found : ['Official Studio YouTube', 'Official Studio TikTok'];
}

function modelLabel(value: string, models: AvailableAiModels) {
  const option = findModel(value, models);
  return option ? `${option.providerLabel} ${option.label}` : value;
}

export function ContentEpisodes() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const draftHydratedRef = useRef(false);
  const pendingModuleIdRef = useRef<string | null>(null);
  const { data: modules = [] } = useQuery({
    queryKey: ['content', 'modules'],
    queryFn: listContentModules,
  });
  const { data: themes = [] } = useQuery({
    queryKey: ['content', 'themes'],
    queryFn: listThemes,
  });
  const { data: aiModels = EMPTY_AI_MODELS } = useQuery({
    queryKey: ['content', 'ai-provider-capabilities'],
    queryFn: listAvailableAiModels,
  });
  const { data: episodeDraft } = useQuery({
    queryKey: ['content', 'drafts', 'episode'],
    queryFn: () => getContentStudioDraft<EpisodeCanvasDraft>('episode'),
  });
  const { data: reusableAudioAssets = [] } = useQuery({
    queryKey: ['content', 'audio-library'],
    queryFn: () => listReusableAudioAssets(),
  });
  const { data: socialConnections = [] } = useQuery({
    queryKey: ['content', 'social', 'connections', 'episodes'],
    queryFn: listSocialConnections,
  });

  const [moduleId, setModuleId] = useState('');
  const [title, setTitle] = useState('');
  const [basePrompt, setBasePrompt] = useState('');
  const [mode, setMode] = useState<GenerationMode>('media');
  const [duration, setDuration] = useState(30);
  const [extendedCut, setExtendedCut] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [textModel, setTextModel] = useState('');
  const [imageModel, setImageModel] = useState('');
  const [videoModel, setVideoModel] = useState('');
  const [audioModel, setAudioModel] = useState('');
  const [voiceProfile, setVoiceProfile] = useState('lagos-warm-female');
  const [defaultTtsTonePreset, setDefaultTtsTonePreset] = useState<EpisodeTtsTonePreset>('neutral');
  const [defaultTtsToneDirection, setDefaultTtsToneDirection] = useState('');
  const defaultTtsTone = useMemo<EpisodeTtsTone>(() => ({
    preset: defaultTtsTonePreset,
    direction: defaultTtsToneDirection.trim() || undefined,
  }), [defaultTtsTonePreset, defaultTtsToneDirection]);
  const [introSource, setIntroSource] = useState<IntroSource>('upload');
  const [introPrompt, setIntroPrompt] = useState('');
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState('');
  const [thumbnailPreviewLabel, setThumbnailPreviewLabel] = useState('');
  const [committedThumbnailUrl, setCommittedThumbnailUrl] = useState('');
  const [committedThumbnailLabel, setCommittedThumbnailLabel] = useState('');
  const [overlayText, setOverlayText] = useState('Episode Title');
  const [overlayFont, setOverlayFont] = useState('Poppins');
  const [overlayColor, setOverlayColor] = useState('#f0ead2');
  const [overlayAlign, setOverlayAlign] = useState<OverlayAlign>('center');
  const [overlayX, setOverlayX] = useState(50);
  const [overlayY, setOverlayY] = useState(82);
  const [overlayOpacity, setOverlayOpacity] = useState(70);
  const [scriptWorkflow, setScriptWorkflow] = useState<ScriptWorkflow>('direct');
  const [scriptState, setScriptState] = useState<ScriptState>('idle');
  const [scriptView, setScriptView] = useState<ScriptView>('edit');
  const [scriptDraft, setScriptDraft] = useState('');
  const [scriptApproved, setScriptApproved] = useState(false);
  const [selectedCharacterRefIds, setSelectedCharacterRefIds] = useState<string[]>([]);
  const [scenes, setScenes] = useState<EpisodeSceneCard[]>([]);
  const [selectedTimelineSceneId, setSelectedTimelineSceneId] = useState('');
  const [sceneSelectionVersion, setSceneSelectionVersion] = useState(0);
  const [timelineTransitions, setTimelineTransitions] = useState<Record<string, TransitionKind>>({});
  const [sceneAudioMuted, setSceneAudioMuted] = useState<Record<string, boolean>>({});
  const [timelineAudioLayers, setTimelineAudioLayers] = useState<TimelineAudioLayer[]>([]);
  const [timelineBrollLayers, setTimelineBrollLayers] = useState<TimelineBrollLayer[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionRange, setMentionRange] = useState({ start: 0, end: 0 });
  const [imageMentionOpen, setImageMentionOpen] = useState(false);
  const [imageMentionQuery, setImageMentionQuery] = useState('');
  const [imageMentionRange, setImageMentionRange] = useState({ start: 0, end: 0 });
  const [assets, setAssets] = useState<EpisodeAsset[]>([]);
  const [reviewState, setReviewState] = useState<ReviewState>('idle');
  const [finalDraft, setFinalDraft] = useState('');
  const [publishPlatform, setPublishPlatform] = useState<PublishPlatform>('youtube');
  const [publishDescription, setPublishDescription] = useState('');
  const [activeEpisode, setActiveEpisode] = useState<ContentEpisode | null>(null);
  const [activeEpisodeScenes, setActiveEpisodeScenes] = useState<ContentEpisodeScene[]>([]);
  const syncSceneVideoDocs = useCallback((sceneDocs: ContentEpisodeScene[], pollEpisodeId?: string) => {
    setActiveEpisodeScenes((current) => {
      const merged = new Map(current.map((scene) => [sceneDocEpisodeKey(scene), scene]));
      sceneDocs.forEach((scene) => {
        merged.set(sceneDocEpisodeKey(scene), scene);
      });
      return Array.from(merged.values()).sort((left, right) => left.sceneNumber - right.sceneNumber);
    });

    setScenes((current) =>
      current.map((scene) => {
        const sceneDoc = sceneDocs.find((item) => shouldApplySceneDocToCard(scene, item, pollEpisodeId));
        if (!sceneDoc) return scene;
        return mergeSceneMediaFromDoc(scene, sceneDoc);
      }),
    );
  }, []);
  const applyEpisodePollResult = useCallback((result: EpisodeStatusResult) => {
    queryClient.setQueryData<ContentModule[]>(['content', 'modules'], (current) =>
      (current ?? []).map((item) => (item._id === result.module._id ? result.module : item)),
    );
    if (result.episode && !result.episode.sceneOnly) {
      setActiveEpisode(result.episode);
    }
    if (result.scenes) {
      syncSceneVideoDocs(result.scenes, result.episode?._id);
    }
  }, [queryClient, syncSceneVideoDocs]);
  const [voiceSamplePending, setVoiceSamplePending] = useState(false);
  const [thumbnailRenderPending, setThumbnailRenderPending] = useState(false);
  const { data: savedEpisodes = [], isLoading: savedEpisodesLoading } = useQuery({
    queryKey: ['content', 'episodes', moduleId],
    queryFn: () => listContentEpisodes({ moduleId }),
    enabled: Boolean(moduleId),
  });
  const moduleEpisodes = useMemo(
    () => savedEpisodes.filter((episode) => episode.moduleId === moduleId),
    [moduleId, savedEpisodes],
  );
  const latestSavedEpisode = moduleEpisodes[0];
  const { data: latestSavedEpisodeDetail } = useQuery({
    queryKey: ['content', 'episodes', latestSavedEpisode?._id, 'detail'],
    queryFn: () => getContentEpisode(latestSavedEpisode!._id),
    enabled: Boolean(latestSavedEpisode?._id && activeEpisode?._id !== latestSavedEpisode._id),
  });

  const generateImageMut = useMutation({
    mutationFn: generateEpisodeImageRequest,
    onSuccess: (result) => {
      setThumbnailPreviewUrl(result.image.cloudinaryUrl || result.image.s3Url);
      setThumbnailPreviewLabel(`${modelLabel(result.model, aiModels)} preview`);
      toast.success('Episode thumbnail generated.');
    },
    onError: () => toast.error('Could not generate episode image.'),
  });

  const uploadImageMut = useMutation({
    mutationFn: uploadEpisodeImageRequest,
    onSuccess: (image) => {
      setThumbnailPreviewUrl(image.cloudinaryUrl || image.s3Url);
      toast.success('Episode thumbnail uploaded.');
    },
    onError: () => toast.error('Could not upload episode thumbnail.'),
  });

  const saveThumbnailMut = useMutation({
    mutationFn: saveEpisodeThumbnailRequest,
    onSuccess: (episode) => {
      setActiveEpisode(episode);
      setCommittedThumbnailUrl(episode.thumbnailUrl ?? thumbnailPreviewUrl);
      setCommittedThumbnailLabel(episode.thumbnailLabel ?? (thumbnailPreviewLabel || 'Episode thumbnail'));
      queryClient.invalidateQueries({ queryKey: ['content', 'episodes'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'stories'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('Episode cover image saved.');
    },
    onError: () => toast.error('Could not save episode thumbnail.'),
  });

  const refineImagePromptMut = useMutation({
    mutationFn: refineEpisodeImagePromptRequest,
    onSuccess: (result) => {
      setIntroPrompt(result.prompt);
      toast.success('Image prompt refined.');
    },
    onError: () => toast.error('Could not refine image prompt.'),
  });

  const generateScriptMut = useMutation({
    mutationFn: generateEpisodeScriptRequest,
    onSuccess: (result) => {
      setScriptDraft(result.script);
      const nextScenes = buildSceneCards(title, result.script || basePrompt, duration, themeCharacterMentions, voiceProfile);
      setScenes(nextScenes);
      inheritSceneAudioMute(nextScenes);
      setSelectedTimelineSceneId(nextScenes[0]?.id ?? '');
      setScriptState('ready');
      setScriptApproved(false);
      toast.success('Script blueprint generated with module and theme context.');
    },
    onError: () => {
      setScriptState('idle');
      toast.error('Could not generate script blueprint.');
    },
  });

  const generateMediaMut = useMutation({
    mutationFn: generateEpisodeMediaRequest,
    onSuccess: (result) => {
      if (result.outputMode === 'text') {
        setFinalDraft(result.text || 'Generated text output was empty.');
        if (result.episode) setActiveEpisode(result.episode);
        setReviewState('ready');
      } else {
        const videoUrl = result.episode?.episodeVideoUrl || result.episode?.masterVideoCloudinaryUrl || result.episode?.masterVideoS3Url || result.module?.masterVideoCloudinaryUrl || result.module?.masterVideoS3Url || result.module?.videoUrl;
        setFinalDraft(
          [
            `MEDIA GENERATION ${result.status.toUpperCase()}: ${title || 'Untitled episode'}`,
            '',
            `Model: ${modelLabel(result.model, aiModels)}`,
            `Duration: ${duration} seconds`,
            `Take ID: ${result.takeId ?? 'Pending'}`,
            `Routing: ${platformLabels.join(', ')}`,
            videoUrl ? `Video URL: ${videoUrl}` : 'Video URL: Rendering. Use module status refresh/polling to fetch the finished output.',
            '',
            'Backend prompt used:',
            result.prompt,
          ].join('\n'),
        );
        if (result.episode) setActiveEpisode(result.episode);
        setReviewState('ready');
        queryClient.invalidateQueries({ queryKey: ['content', 'modules'] });
      }
      toast.success(result.outputMode === 'text' ? 'Text output generated.' : 'Media generation started.');
    },
    onError: () => {
      setReviewState('idle');
      toast.error('Could not generate final output.');
    },
  });

  const renderTimelineMut = useMutation({
    mutationFn: renderEpisodeTimelineRequest,
    onSuccess: (result) => {
      setActiveEpisode(result.episode);
      setActiveEpisodeScenes(result.scenes);
      setFinalDraft(
        [
          `TIMELINE RENDER READY: ${title || 'Untitled episode'}`,
          '',
          'Renderer: FFmpeg timeline compiler',
          `Duration: ${duration} seconds`,
          `Scenes stitched: ${result.scenes.length}`,
          `Routing: ${platformLabels.join(', ')}`,
          `Video URL: ${result.videoUrl}`,
        ].join('\n'),
      );
      setReviewState('ready');
      queryClient.invalidateQueries({ queryKey: ['content', 'modules'] });
      queryClient.invalidateQueries({ queryKey: ['content', 'episodes'] });
      toast.success('Timeline stitched into the episode master MP4.');
    },
    onError: (error: unknown) => {
      setReviewState('idle');
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? (error as { response: { data: { message: string } } }).response.data.message
          : 'Could not stitch the timeline.';
      toast.error(message);
    },
  });

  const publishEpisodeMut = useMutation({
    mutationFn: (input: {
      id: string;
      payload: {
        platform: PublishPlatform;
        title: string;
        description?: string;
        youtubePlaylistId?: string;
      };
    }) => publishEpisodeRequest(input.id, input.payload),
    onSuccess: ({ message, result }) => {
      toast.success(message);
      setReviewState('queued');
      setActiveEpisode((current) =>
        current
          ? {
              ...current,
              status: 'published',
              youtubeVideoId: result.youtubeVideoId ?? current.youtubeVideoId,
              publishedPlatform: result.platform,
              publishedPlatforms: Array.from(new Set([...(current.publishedPlatforms ?? []), result.platform])),
              publishedPlatformDetails: result.publishedPlatformDetails ?? [
                ...(current.publishedPlatformDetails ?? []).filter((post) => post.platform !== result.platform),
                {
                  platform: result.platform,
                  postId: result.postId ?? undefined,
                  postUrl: result.postUrl ?? undefined,
                  status: result.publishStatus ?? undefined,
                  publishedAt: new Date().toISOString(),
                },
              ],
              socialPosts: result.socialPosts ?? result.publishedPlatformDetails ?? [
                ...(current.socialPosts ?? []).filter((post) => post.platform !== result.platform),
                {
                  platform: result.platform,
                  postId: result.postId ?? undefined,
                  postUrl: result.postUrl ?? undefined,
                  status: result.publishStatus ?? undefined,
                  publishedAt: new Date().toISOString(),
                },
              ],
              publishedAt: new Date().toISOString(),
            }
          : current,
      );
      const postLine = result.postUrl
        ? `Published to ${publishPlatformLabel(result.platform)}: ${result.postUrl}`
        : result.postId
          ? `Submitted to ${publishPlatformLabel(result.platform)}: ${result.postId}`
          : '';
      if (postLine) {
        setFinalDraft((current) =>
          [
            current.trim(),
            '',
            postLine,
          ]
            .filter(Boolean)
            .join('\n'),
        );
      }
      queryClient.invalidateQueries({ queryKey: ['content', 'modules'] });
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? (error as { response: { data: { message: string } } }).response.data.message
          : 'Could not publish this episode.';
      toast.error(message);
    },
  });

  const publishWebsiteMut = useMutation({
    mutationFn: publishEpisodeToWebsite,
    onSuccess: (result) => {
      setActiveEpisode(result.episode);
      setActiveEpisodeScenes(result.scenes);
      queryClient.invalidateQueries({ queryKey: ['content', 'episodes'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'stories'] });
      toast.success('Episode published on the platform website.');
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? (error as { response: { data: { message: string } } }).response.data.message
          : 'Could not publish episode on the platform website.';
      toast.error(message);
    },
  });

  const generateTtsMut = useMutation({
    mutationFn: generateEpisodeTtsRequest,
    onSuccess: (result, variables) => {
      const audioUrl = studioStreamMediaUrl(result.audio.cloudinaryUrl, result.audio.s3Url);
      if (!audioUrl) {
        toast.error('TTS generated but no playable audio URL was returned.');
        if (variables.sceneId && variables.ttsLineId) {
          setScenes((current) => current.map((scene) =>
            scene.id === variables.sceneId
              ? updateSceneTtsLine(scene, variables.ttsLineId!, { status: 'idle' }, voiceProfile)
              : scene,
          ));
        } else if (variables.sceneId) {
          updateScene(variables.sceneId, { ttsStatus: 'idle' });
        }
        return;
      }
      const targetSceneId = result.sceneId ?? variables.sceneId;
      const label = `${modelLabel(result.model, aiModels)} ┬╖ ${voiceProfileLabel(variables.voiceProfile)}${variables.tonePreset && variables.tonePreset !== 'neutral' ? ` ┬╖ ${tonePresetLabel(variables.tonePreset)}` : ''}${variables.toneDirection ? ` ┬╖ ${variables.toneDirection}` : ''}${variables.speaker ? ` ┬╖ ${variables.speaker}` : ''}`;
      if (targetSceneId && variables.ttsLineId) {
        let nextSceneForTimeline: EpisodeSceneCard | undefined;
        setScenes((current) =>
          current.map((item) => {
            if (item.id !== targetSceneId) return item;
            const nextScene = updateSceneTtsLine(item, variables.ttsLineId!, {
              status: 'ready',
              audioUrl,
              label,
              voiceProfile: variables.voiceProfile,
            }, voiceProfile);
            nextSceneForTimeline = nextScene;
            return nextScene;
          }),
        );
        if (nextSceneForTimeline && variables.ttsLineId) {
          const lines = ensureSceneTtsLines(nextSceneForTimeline, voiceProfile);
          const lineIndex = lines.findIndex((line) => line.id === variables.ttsLineId);
          const line = lines[lineIndex];
          if (line) {
            upsertSceneTtsLineTimelineLayer(nextSceneForTimeline, line, lineIndex, lines.length, label);
          }
        }
      }
      void playEpisodeAudio(audioUrl).catch(() => toast.error('TTS saved, but browser playback was blocked. Use the audio player below or the timeline preview.'));
      toast.success('Dialogue TTS generated and added to the timeline.');
    },
    onError: (_error, variables) => {
      if (variables.sceneId && variables.ttsLineId) {
        setScenes((current) => current.map((scene) =>
          scene.id === variables.sceneId
            ? updateSceneTtsLine(scene, variables.ttsLineId!, { status: 'idle' }, voiceProfile)
            : scene,
        ));
      } else if (variables.sceneId) {
        updateScene(variables.sceneId, { ttsStatus: 'idle' });
      }
      toast.error('Could not generate scene TTS.');
    },
  });

  const improveSceneMut = useMutation({
    mutationFn: improveEpisodeSceneRequest,
    onSuccess: (result) => {
      updateScene(result.sceneId, {
        voiceOver: result.voiceOver,
        visualPrompt: result.visualPrompt,
        characterHandles: extractHandles(`${result.voiceOver} ${result.visualPrompt}`),
      });
      toast.success('Scene improved with AI.');
    },
    onError: () => toast.error('Could not improve this scene.'),
  });

  const generateSceneVideoMut = useMutation({
    mutationFn: generateEpisodeSceneVideoRequest,
    onSuccess: (result, variables) => {
      if (result.takeId) {
        const sceneOnlyEpisode = Boolean((result.episode as { sceneOnly?: boolean } | undefined)?.sceneOnly);
        if (result.episode && !sceneOnlyEpisode) {
          setActiveEpisode(result.episode);
        }
        updateScene(variables.scene.id, {
          sceneVideoStatus: result.status === 'ready' ? 'ready' : 'generating',
          sceneVideoTakeId: result.episodeId ?? result.takeId,
        });
      }
      if (result.scenes?.length) {
        syncSceneVideoDocs(result.scenes, result.episodeId);
      }
      void pollKlingStatus(variables.moduleId)
        .then(applyEpisodePollResult)
        .catch(() => queryClient.invalidateQueries({ queryKey: ['content', 'modules'] }));
      if (result.module) {
        queryClient.setQueryData<ContentModule[]>(['content', 'modules'], (current) =>
          (current ?? []).map((item) => (item._id === result.module?._id ? result.module as ContentModule : item)),
        );
      } else {
        queryClient.invalidateQueries({ queryKey: ['content', 'modules'] });
      }
      toast.success('Scene video generation started.');
    },
    onError: (error: unknown, variables) => {
      updateScene(variables.scene.id, { sceneVideoStatus: 'failed' });
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? (error as { response: { data: { message: string } } }).response.data.message
          : 'Could not generate this scene video.';
      toast.error(message);
    },
  });

  const saveEpisodeDraftMut = useMutation({
    mutationFn: (payload: EpisodeCanvasDraft) => saveContentStudioDraft('episode', payload as unknown as Record<string, unknown>),
    onSuccess: () => toast.success('Episode draft saved to your workspace.'),
    onError: () => toast.error('Could not save episode draft.'),
  });

  const loadSavedEpisodeMut = useMutation({
    mutationFn: (episodeId: string) => getContentEpisode(episodeId),
    onSuccess: ({ episode, scenes: episodeScenes }) => {
      if (episode.moduleId !== moduleId) {
        toast.error('That episode belongs to a different module.');
        return;
      }
      setActiveEpisode(episode);
      setActiveEpisodeScenes(episodeScenes);
      syncSceneVideoDocs(episodeScenes, episode._id);
      setTitle(episode.title);
      setBasePrompt(episode.basePrompt);
      setDuration(episode.durationSeconds);
      setSoundEnabled(episode.soundEnabled);
      setMode(episode.outputMode);
      setCommittedThumbnailUrl(episode.thumbnailUrl ?? '');
      setCommittedThumbnailLabel(episode.thumbnailLabel ?? '');
      setThumbnailPreviewUrl(episode.thumbnailUrl ?? '');
      setThumbnailPreviewLabel(episode.thumbnailLabel ?? '');
      setScenes((current) => {
        if (current.length === 0) {
          return episodeScenes.map((scene) => episodeSceneCardFromDoc(scene));
        }
        return current.map((scene) => {
          const sceneDoc = episodeScenes.find((item) =>
            shouldApplySceneDocToCard(scene, item, episode._id),
          );
          if (!sceneDoc) return scene;
          return mergeSceneMediaFromDoc(scene, sceneDoc);
        });
      });
      const savedVideoUrl = episode.episodeVideoUrl || episode.masterVideoCloudinaryUrl || episode.masterVideoS3Url;
      if (savedVideoUrl) {
        setFinalDraft(
          [
            `SAVED EPISODE: ${episode.title || 'Untitled episode'}`,
            '',
            `Status: ${episode.status}`,
            `Duration: ${episode.durationSeconds} seconds`,
            `Video URL: ${savedVideoUrl}`,
          ].join('\n'),
        );
        setReviewState('ready');
      } else {
        setFinalDraft('');
        setReviewState(episode.status === 'generating' ? 'generating' : 'idle');
      }
      toast.success(`Loaded ${episode.title || 'episode'}.`);
    },
    onError: () => toast.error('Could not load that episode.'),
  });

  const uploadAudioMut = useMutation({
    mutationFn: ({ file, kind, options }: { file: File; kind: TimelineAudioLayer['kind']; options?: { saveToLibrary?: boolean; scope?: 'workspace' | 'public'; label?: string } }) =>
      uploadEpisodeAudioRequest(file, kind, options),
    onError: () => toast.error('Could not upload audio layer.'),
  });

  function clearActiveEpisodeRenderState() {
    setActiveEpisode(null);
    setActiveEpisodeScenes([]);
    setReviewState('idle');
    setFinalDraft('');
  }

  function startFreshEpisodeWorkspace() {
    clearActiveEpisodeRenderState();
    setTitle('');
    setBasePrompt('');
    setScenes([]);
    setSelectedTimelineSceneId('');
    setScriptDraft('');
    setScriptApproved(false);
    setScriptState('idle');
    setThumbnailPreviewUrl('');
    setThumbnailPreviewLabel('');
    setCommittedThumbnailUrl('');
    setCommittedThumbnailLabel('');
    setSelectedCharacterRefIds([]);
    setTimelineTransitions({});
    setSceneAudioMuted({});
    setTimelineAudioLayers([]);
    setTimelineBrollLayers([]);
    setAssets([]);
  }

  function handleModuleChange(nextModuleId: string) {
    if (nextModuleId === moduleId) return;
    setModuleId(nextModuleId);
    startFreshEpisodeWorkspace();
    const next = new URLSearchParams(searchParams);
    if (nextModuleId) next.set('moduleId', nextModuleId);
    else next.delete('moduleId');
    setSearchParams(next, { replace: true });
  }

  useEffect(() => {
    if (draftHydratedRef.current) return;
    if (episodeDraft === undefined) return;
    draftHydratedRef.current = true;

    const sessionModuleId = sessionStorage.getItem(EPISODE_MODULE_SESSION_KEY);
    if (sessionModuleId) {
      pendingModuleIdRef.current = sessionModuleId;
      sessionStorage.removeItem(EPISODE_MODULE_SESSION_KEY);
    }

    const urlModuleId = searchParams.get('moduleId');
    if (urlModuleId) {
      pendingModuleIdRef.current = urlModuleId;
    }

    const draft = episodeDraft?.payload;
    if (!draft) return;

    if (!pendingModuleIdRef.current && draft.moduleId) {
      pendingModuleIdRef.current = draft.moduleId;
    }
    setTitle(draft.title ?? '');
    setBasePrompt(draft.basePrompt ?? '');
    setMode(draft.mode ?? 'media');
    setDuration(draft.duration ?? 30);
    setExtendedCut(Boolean(draft.extendedCut));
    setSoundEnabled(Boolean(draft.soundEnabled));
    setTextModel(draft.textModel ?? '');
    setImageModel(draft.imageModel ?? '');
    setVideoModel(draft.videoModel ?? '');
    setAudioModel(draft.audioModel ?? '');
    setVoiceProfile(draft.voiceProfile ?? 'lagos-warm-female');
    setDefaultTtsTonePreset(draft.defaultTtsTonePreset ?? 'neutral');
    setDefaultTtsToneDirection(draft.defaultTtsToneDirection ?? '');
    setIntroSource(draft.introSource ?? 'upload');
    setIntroPrompt(draft.introPrompt ?? '');
    setThumbnailPreviewUrl(draft.thumbnailPreviewUrl ?? '');
    setThumbnailPreviewLabel(draft.thumbnailPreviewLabel ?? '');
    setCommittedThumbnailUrl(draft.committedThumbnailUrl ?? '');
    setCommittedThumbnailLabel(draft.committedThumbnailLabel ?? '');
    setOverlayText(draft.overlayText ?? 'Episode Title');
    setOverlayFont(draft.overlayFont ?? 'Poppins');
    setOverlayColor(draft.overlayColor ?? '#f0ead2');
    setOverlayAlign(draft.overlayAlign ?? 'center');
    setOverlayX(draft.overlayX ?? 50);
    setOverlayY(draft.overlayY ?? 82);
    setOverlayOpacity(draft.overlayOpacity ?? 70);
    setScriptWorkflow(draft.scriptWorkflow ?? 'direct');
    setScriptDraft(draft.scriptDraft ?? '');
    setScriptApproved(Boolean(draft.scriptApproved));
    setSelectedCharacterRefIds(draft.selectedCharacterRefIds ?? []);
    setScenes(draft.scenes ?? []);
    setSelectedTimelineSceneId(draft.selectedTimelineSceneId ?? '');
    setTimelineTransitions(draft.timelineTransitions ?? {});
    setSceneAudioMuted(draft.sceneAudioMuted ?? {});
    setTimelineAudioLayers(draft.timelineAudioLayers ?? []);
    setTimelineBrollLayers(draft.timelineBrollLayers ?? []);
    setAssets(draft.assets ?? []);
    setFinalDraft(draft.finalDraft ?? '');
  }, [episodeDraft, searchParams]);

  useEffect(() => {
    if (modules.length === 0) return;

    const pendingModuleId = pendingModuleIdRef.current;
    if (pendingModuleId) {
      pendingModuleIdRef.current = null;
      if (modules.some((module) => module._id === pendingModuleId) && pendingModuleId !== moduleId) {
        setModuleId(pendingModuleId);
      }
      return;
    }

    if (moduleId && modules.some((module) => module._id === moduleId)) return;

    const fallbackModuleId = modules[0]!._id;
    if (fallbackModuleId !== moduleId) {
      setModuleId(fallbackModuleId);
    }
  }, [moduleId, modules]);

  useEffect(() => {
    if (!activeEpisode) return;
    if (activeEpisode.moduleId === moduleId) return;
    clearActiveEpisodeRenderState();
  }, [activeEpisode, moduleId]);

  useEffect(() => {
    if (aiModels.text.length > 0 && !aiModels.text.some((model) => model.value === textModel)) {
      setTextModel(aiModels.text[0].value);
    } else if (aiModels.text.length === 0 && textModel) {
      setTextModel('');
    }
    if (aiModels.image.length > 0 && !aiModels.image.some((model) => model.value === imageModel)) {
      setImageModel(aiModels.image[0].value);
    } else if (aiModels.image.length === 0 && imageModel) {
      setImageModel('');
    }
    if (aiModels.video.length > 0 && !aiModels.video.some((model) => model.value === videoModel)) {
      setVideoModel(aiModels.video[0].value);
    } else if (aiModels.video.length === 0 && videoModel) {
      setVideoModel('');
    }
    if (aiModels.audio.length > 0 && !aiModels.audio.some((model) => model.value === audioModel)) {
      setAudioModel(aiModels.audio[0].value);
    } else if (aiModels.audio.length === 0 && audioModel) {
      setAudioModel('');
    }
  }, [aiModels, audioModel, imageModel, textModel, videoModel]);

  const selectedModule = modules.find((module) => module._id === moduleId);
  const selectedTheme = themes.find((theme) => theme._id === selectedModule?.themeId);
  const themeCharacterRefs = useMemo(() => parseThemeCharacterReferences(selectedTheme), [selectedTheme]);
  const themeCharacterMentions = useMemo(() => parseThemeCharacterMentions(selectedTheme), [selectedTheme]);
  const characterTtsProfiles = useMemo(
    () => parseThemeCharacterTtsProfiles(themeCharacterJsonSource(selectedTheme), themeCharacterMentions, voiceProfile),
    [selectedTheme, themeCharacterMentions, voiceProfile],
  );
  const selectedCharacterRefs = useMemo(
    () => themeCharacterRefs.filter((reference) => selectedCharacterRefIds.includes(reference.id)),
    [selectedCharacterRefIds, themeCharacterRefs],
  );
  const characterMentionOptions = useMemo(() => {
    const query = mentionQuery.toLowerCase();
    return themeCharacterMentions.filter((character) => character.handle.toLowerCase().includes(query) || character.name.toLowerCase().includes(query)).slice(0, 6);
  }, [mentionQuery, themeCharacterMentions]);
  const imageMentionOptions = useMemo(() => {
    const query = imageMentionQuery.toLowerCase();
    return themeCharacterMentions.filter((character) => character.handle.toLowerCase().includes(query) || character.name.toLowerCase().includes(query)).slice(0, 6);
  }, [imageMentionQuery, themeCharacterMentions]);
  const backgroundLoras = useMemo(
    () => inferBackgroundLoras(`${selectedModule?.title ?? ''} ${selectedModule?.genre ?? ''} ${selectedModule?.themeLine ?? ''} ${selectedModule?.creativePrompt ?? ''} ${selectedTheme?.title ?? ''} ${selectedTheme?.defaultGenre ?? ''} ${basePrompt} ${introPrompt}`),
    [basePrompt, introPrompt, selectedModule, selectedTheme],
  );
  const activeEpisodeForModule = useMemo(
    () => (activeEpisode?.moduleId === moduleId ? activeEpisode : null),
    [activeEpisode, moduleId],
  );
  const thumbnailOverlayBaseUrl = thumbnailPreviewUrl || committedThumbnailUrl;
  const showLiveThumbnailOverlay = Boolean(
    thumbnailPreviewUrl
    && (!committedThumbnailUrl || thumbnailPreviewUrl !== committedThumbnailUrl),
  );
  const thumbnailOverlayText = useMemo(() => {
    const trimmedOverlay = overlayText.trim();
    const trimmedTitle = title.trim();
    if (trimmedOverlay && trimmedOverlay !== 'Episode Title') return trimmedOverlay;
    return trimmedTitle || trimmedOverlay || 'Episode Title';
  }, [overlayText, title]);
  const activeProgress = activeEpisodeForModule?.progress?.pct ?? (reviewState === 'generating' ? 10 : 0);
  const activeSegments = activeEpisodeForModule ? activeEpisodeScenes : [];
  const editorSegments = useMemo(() => {
    const byScene = new Map<number, typeof activeSegments[number]>();
    activeSegments.forEach((segment) => byScene.set(segment.sceneNumber, segment));
    scenes.forEach((scene) => {
      if (!scene.sceneVideoStatus || scene.sceneVideoStatus === 'idle') return;
      const existing = byScene.get(scene.sceneNumber);
      if (existing?.status === 'ready' && !scene.sceneVideoUrl) return;
      byScene.set(scene.sceneNumber, {
        ...(existing ?? {
          _id: scene.episodeSceneDocId ?? scene.id,
          episodeId: scene.sceneVideoTakeId ?? activeEpisodeForModule?._id ?? '',
          moduleId: moduleId ?? '',
          sceneNumber: scene.sceneNumber,
          startSec: scene.startSec,
          endSec: scene.endSec,
          voiceOver: scene.voiceOver,
          visualPrompt: scene.visualPrompt,
          characterHandles: scene.characterHandles,
          status: 'queued' as const,
        }),
        status: scene.sceneVideoStatus === 'generating' ? 'generating' : scene.sceneVideoStatus,
        videoUrl: scene.sceneVideoUrl ?? existing?.videoUrl,
        cloudinaryUrl: scene.sceneVideoUrl ?? existing?.cloudinaryUrl,
        s3Url: existing?.s3Url,
      });
    });
    return Array.from(byScene.values()).sort((a, b) => a.sceneNumber - b.sceneNumber);
  }, [activeEpisodeForModule?._id, activeSegments, moduleId, scenes]);
  const readySceneVideoUrls = useMemo(() => {
    const byScene = new Map<number, string>();
    editorSegments.forEach((segment) => {
      const url = segment.cloudinaryUrl || segment.videoUrl || segment.s3Url;
      if (segment.status === 'ready' && url) byScene.set(segment.sceneNumber, url);
    });
    scenes.forEach((scene) => {
      if (scene.sceneVideoStatus === 'ready' && scene.sceneVideoUrl) {
        byScene.set(scene.sceneNumber, scene.sceneVideoUrl);
      }
    });
    return byScene;
  }, [editorSegments, scenes]);
  const platformLabels = useMemo(() => getPlatformLabels(selectedModule), [selectedModule]);
  const moduleOptions: SelectOption<string>[] = [
    { value: '', label: 'Select parent module' },
    ...modules.map((module) => ({ value: module._id, label: module.title })),
  ];

  const activeFinalModel = mode === 'media' ? 'ffmpeg:timeline-render' : textModel;
  const activeFinalModelAvailable = mode === 'media' ? true : Boolean(textModel);
  const targetSceneCount = sceneCountForDuration(duration);
  const allScenesApproved = scenes.length > 0 && scenes.every((scene) => scene.approved);
  const allSceneVideosReady = mode !== 'media' || (scenes.length > 0 && scenes.every((scene) => {
    const status = scene.sceneVideoStatus ?? 'idle';
    return status === 'ready' && Boolean(readySceneVideoUrls.get(scene.sceneNumber));
  }));
  const anySceneVideoGenerating = scenes.some((scene) => scene.sceneVideoStatus === 'generating')
    || editorSegments.some((segment) => segment.status === 'generating' || segment.status === 'queued');
  const stitchGateLocked = mode === 'media' && !allScenesApproved;
  const scriptGateLocked = scriptWorkflow === 'script' && !scriptApproved;
  const scenesGateLocked = scriptWorkflow === 'scenes' && !scenesReadyForGeneration(scenes);
  const finalVideoUrl = activeEpisodeForModule?.episodeVideoUrl
    || activeEpisodeForModule?.masterVideoCloudinaryUrl
    || activeEpisodeForModule?.masterVideoS3Url;
  const defaultPublishDescription = cleanPublishDescription({
    title: title || activeEpisodeForModule?.title || 'Untitled episode',
    basePrompt,
    moduleTitle: selectedModule?.title,
    moduleDescription: selectedModule?.themeLine || selectedModule?.creativePrompt,
  });
  const youtubeConnection = socialConnections.find((connection) => connection.platform === 'youtube');
  const tiktokConnection = socialConnections.find((connection) => connection.platform === 'tiktok');
  const instagramConnection = socialConnections.find((connection) => connection.platform === 'instagram');
  const socialConnectionLabel = (connection: typeof youtubeConnection) =>
    connection?.displayName || (connection?.platform === 'youtube' ? connection.channelId : undefined) || 'account';
  const selectedPublishConnection =
    publishPlatform === 'youtube'
      ? youtubeConnection
      : publishPlatform === 'tiktok'
        ? tiktokConnection
        : instagramConnection;
  const episodeSocialPosts = activeEpisodeForModule?.publishedPlatformDetails ?? activeEpisodeForModule?.socialPosts ?? [];
  const selectedSocialPost = episodeSocialPosts.find((post) => post.platform === publishPlatform);
  const selectedPlatformAlreadyPublished = Boolean(selectedSocialPost) || (publishPlatform === 'youtube' && Boolean(activeEpisodeForModule?.youtubeVideoId));
  const isWebsitePublished = activeEpisodeForModule?.status === 'published';
  const websitePublishMediaReady = Boolean(finalVideoUrl || committedThumbnailUrl || activeEpisodeForModule?.thumbnailUrl);
  const canPublishWebsite = Boolean(activeEpisodeForModule?._id && websitePublishMediaReady && !publishWebsiteMut.isPending);
  const canPublishEpisode = Boolean(activeEpisodeForModule?._id && finalVideoUrl && isWebsitePublished && selectedPublishConnection && !selectedPlatformAlreadyPublished && !publishEpisodeMut.isPending);
  const publishDisabledReason = !activeEpisodeForModule?._id
    ? 'Render and stitch an episode first.'
    : !finalVideoUrl
      ? 'The episode master video is not ready yet.'
      : !isWebsitePublished
        ? 'Publish this episode on the platform website before social posting.'
      : selectedPlatformAlreadyPublished
        ? `Already published to ${publishPlatformLabel(publishPlatform)}.`
      : !selectedPublishConnection
        ? `Connect ${publishPlatformLabel(publishPlatform)} before publishing.`
        : '';
  const canRenderTimeline = Boolean(
    selectedModule
    && title.trim()
    && scenes.length > 0
    && allSceneVideosReady
    && !anySceneVideoGenerating
    && reviewState !== 'generating'
    && (scriptWorkflow !== 'scenes' || scenesReadyForGeneration(scenes)),
  );
  const canGenerateFinal = Boolean(
    title.trim()
    && selectedModule
    && activeFinalModelAvailable
    && !scriptGateLocked
    && !scenesGateLocked
    && !stitchGateLocked
    && allSceneVideosReady
    && reviewState !== 'generating',
  );
  const timelineRenderDisabledReason = !selectedModule
    ? 'Select a parent module first.'
    : !title.trim()
      ? 'Add an episode title first.'
      : scriptWorkflow === 'scenes' && !scenesReadyForGeneration(scenes)
        ? 'Fill every scene card with a voice-over or visual prompt before rendering.'
        : anySceneVideoGenerating
          ? 'Wait for every scene video to finish generating.'
        : !allSceneVideosReady
          ? `Render all ${scenes.length} scene clip${scenes.length === 1 ? '' : 's'} before stitching with FFmpeg.`
          : '';
  const generateDisabledReason = !selectedModule
    ? 'Select a parent module first.'
    : !title.trim()
      ? 'Add an episode title first.'
      : !activeFinalModelAvailable
        ? `No ${mode === 'media' ? 'media' : 'text'} model is available.`
        : scriptGateLocked
          ? 'Approve the script blueprint before final media generation.'
          : scenesGateLocked
            ? 'Fill every scene card with a voice-over or visual prompt before generating from scenes.'
            : stitchGateLocked
            ? 'Approve every 10-second scene card before rendering the assembly.'
            : !allSceneVideosReady
              ? 'Render each scene clip before stitching the final MP4.'
              : '';

  const shouldPollEpisodeVideo = Boolean(
    selectedModule
    && (
      selectedModule.status === 'generating'
      || activeEpisodeForModule?.status === 'generating'
      || scenes.some((scene) => scene.sceneVideoStatus === 'generating')
    ),
  );

  useEffect(() => {
    if (!shouldPollEpisodeVideo || !selectedModule) return;
    const poll = () => {
      pollKlingStatus(selectedModule._id)
        .then(applyEpisodePollResult)
        .catch(() => queryClient.invalidateQueries({ queryKey: ['content', 'modules'] }));
    };
    poll();
    const timer = window.setInterval(poll, 5000);
    return () => window.clearInterval(timer);
  }, [applyEpisodePollResult, queryClient, selectedModule, shouldPollEpisodeVideo]);

  useEffect(() => {
    setSelectedCharacterRefIds((current) => current.filter((id) => themeCharacterRefs.some((reference) => reference.id === id)));
  }, [themeCharacterRefs]);

  useEffect(() => {
    if (!latestSavedEpisodeDetail?.episode) return;
    if (latestSavedEpisodeDetail.episode.moduleId !== moduleId) return;
    if (activeEpisode?._id === latestSavedEpisodeDetail.episode._id) return;
    if (scenes.length > 0 || title.trim() || basePrompt.trim()) return;

    const savedVideoUrl =
      latestSavedEpisodeDetail.episode.episodeVideoUrl ||
      latestSavedEpisodeDetail.episode.masterVideoCloudinaryUrl ||
      latestSavedEpisodeDetail.episode.masterVideoS3Url;

    setActiveEpisode(latestSavedEpisodeDetail.episode);
    setActiveEpisodeScenes(latestSavedEpisodeDetail.scenes);
    if (savedVideoUrl) {
      setFinalDraft(
        [
          `SAVED TIMELINE RENDER: ${latestSavedEpisodeDetail.episode.title || 'Untitled episode'}`,
          '',
          'Renderer: FFmpeg timeline compiler',
          `Duration: ${latestSavedEpisodeDetail.episode.durationSeconds} seconds`,
          `Scenes stitched: ${latestSavedEpisodeDetail.scenes.length}`,
          `Video URL: ${savedVideoUrl}`,
        ].join('\n'),
      );
      setReviewState('ready');
    }
  }, [activeEpisode?._id, basePrompt, latestSavedEpisodeDetail, moduleId, scenes.length, title]);

  function addEpisodeAssets(files: FileList | null) {
    if (!files?.length) return;
    setAssets((current) => [
      ...current,
      ...Array.from(files).map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        tag: '',
        url: URL.createObjectURL(file),
      })),
    ]);
  }

  function handleScriptDraftChange(value: string, caret: number) {
    setScriptDraft(value);
    setScriptApproved(false);
    const beforeCaret = value.slice(0, caret);
    const mentionMatch = beforeCaret.match(/(^|\s)@([\w-]*)$/);
    if (!mentionMatch) {
      setMentionOpen(false);
      setMentionQuery('');
      return;
    }
    const query = mentionMatch[2] ?? '';
    setMentionOpen(true);
    setMentionQuery(query);
    setMentionRange({ start: caret - query.length - 1, end: caret });
  }

  function insertCharacterMention(handle: string) {
    setScriptDraft((current) => `${current.slice(0, mentionRange.start)}${handle} ${current.slice(mentionRange.end)}`);
    setScriptApproved(false);
    setMentionOpen(false);
    setMentionQuery('');
  }

  function handleImagePromptChange(value: string, caret: number) {
    setIntroPrompt(value);
    const beforeCaret = value.slice(0, caret);
    const mentionMatch = beforeCaret.match(/(^|\s)@([\w-]*)$/);
    if (!mentionMatch) {
      setImageMentionOpen(false);
      setImageMentionQuery('');
      return;
    }
    const query = mentionMatch[2] ?? '';
    setImageMentionOpen(true);
    setImageMentionQuery(query);
    setImageMentionRange({ start: caret - query.length - 1, end: caret });
  }

  function insertImageCharacterMention(handle: string) {
    setIntroPrompt((current) => `${current.slice(0, imageMentionRange.start)}${handle} ${current.slice(imageMentionRange.end)}`);
    setImageMentionOpen(false);
    setImageMentionQuery('');
  }

  function toggleCharacterReference(referenceId: string) {
    setSelectedCharacterRefIds((current) => (current.includes(referenceId) ? current.filter((id) => id !== referenceId) : [...current, referenceId]));
  }

  function handleConvertIdeaToScenes() {
    const nextScenes = buildSceneCards(title, basePrompt, duration, themeCharacterMentions, voiceProfile);
    setScenes(nextScenes);
    inheritSceneAudioMute(nextScenes);
    setSelectedTimelineSceneId(nextScenes[0]?.id ?? '');
    setScriptDraft(nextScenes.map((scene) => `### Scene ${scene.sceneNumber}: ${timestamp(scene.startSec)} - ${timestamp(scene.endSec)}\n\n${scene.voiceOver}\n\n${scene.visualPrompt}`).join('\n\n'));
    setScriptApproved(false);
    toast.success(`Storyboard created as ${nextScenes.length} 10-second scenes.`);
  }

  function handleInitializeSceneBoard() {
    const nextScenes = buildEmptySceneBoard(duration, themeCharacterMentions, voiceProfile);
    setScenes(nextScenes);
    inheritSceneAudioMute(nextScenes);
    setSelectedTimelineSceneId(nextScenes[0]?.id ?? '');
    setScriptApproved(false);
    toast.success(`Initialized ${nextScenes.length} empty scene cards. Write each scene directlyΓÇöno base-prompt script conversion.`);
  }

  function updateScene(sceneId: string, patch: Partial<EpisodeSceneCard>) {
    const contentChanged = patch.voiceOver !== undefined || patch.visualPrompt !== undefined || patch.characterHandles !== undefined;
    setScenes((current) => current.map((scene) => {
      if (scene.id !== sceneId) return scene;
      const voiceChanged = patch.voiceProfile !== undefined && patch.voiceProfile !== scene.voiceProfile;
      const nextScene = {
        ...scene,
        ...patch,
        approved: patch.approved ?? (contentChanged ? false : scene.approved),
        ...(contentChanged ? { sceneVideoStatus: 'idle' as const, sceneVideoUrl: undefined, sceneVideoTakeId: undefined } : {}),
      };
      if (contentChanged) {
        return invalidateSceneTtsLines(nextScene, voiceProfile);
      }
      if (voiceChanged) {
        const lines = ensureSceneTtsLines(nextScene, voiceProfile).map((line) => ({
          ...line,
          status: 'idle' as const,
          audioUrl: undefined,
          label: undefined,
        }));
        return { ...nextScene, ...syncSceneLegacyTtsFields({ ...nextScene, ttsLines: lines }) };
      }
      return nextScene;
    }));
  }

  function updateSceneDialogueLine(sceneId: string, lineId: string, patch: Partial<EpisodeSceneTtsLine>) {
    setScenes((current) => current.map((scene) => {
      if (scene.id !== sceneId) return scene;
      const currentLine = ensureSceneTtsLines(scene, voiceProfile).find((line) => line.id === lineId);
      let nextPatch = { ...patch };
      if (patch.speaker !== undefined) {
        const resolved = resolveLineTtsFromSpeaker(patch.speaker, characterTtsProfiles, voiceProfile, defaultTtsTone);
        nextPatch = {
          ...nextPatch,
          voiceProfile: resolved.voiceProfile,
          tonePreset: resolved.tone.preset,
          toneDirection: resolved.tone.direction,
          tonePace: resolved.tone.pace,
          tonePitch: resolved.tone.pitch,
          status: 'idle',
          audioUrl: undefined,
          label: undefined,
        };
      }
      const textChanged = patch.text !== undefined && patch.text !== currentLine?.text;
      const speakerChanged = patch.speaker !== undefined && patch.speaker !== currentLine?.speaker;
      const nextScene = updateSceneTtsLine(scene, lineId, {
        ...nextPatch,
        ...(textChanged || speakerChanged ? { status: 'idle' as const, audioUrl: undefined, label: undefined } : {}),
      }, voiceProfile);
      return nextScene;
    }));
  }

  function addSceneDialogueLine(sceneId: string) {
    setScenes((current) => current.map((scene) => {
      if (scene.id !== sceneId) return scene;
      return addSceneTtsLine(scene, voiceProfile, defaultTtsTone);
    }));
  }

  function removeSceneDialogueLine(sceneId: string, lineId: string) {
    setScenes((current) => current.map((scene) => scene.id === sceneId ? removeSceneTtsLine(scene, lineId, voiceProfile) : scene));
  }

  function toggleSceneCharacterReference(sceneId: string, referenceId: string) {
    setScenes((current) => current.map((scene) => {
      if (scene.id !== sceneId) return scene;
      const existing = scene.selectedCharacterRefIds ?? [];
      const next = existing.includes(referenceId)
        ? existing.filter((id) => id !== referenceId)
        : [...existing, referenceId];
      return {
        ...scene,
        selectedCharacterRefIds: next,
        approved: false,
        sceneVideoStatus: 'idle',
        sceneVideoUrl: undefined,
        sceneVideoTakeId: undefined,
      };
    }));
  }

  function addScene() {
    setScenes((current) => {
      const nextScene = createSceneCard(current.length, basePrompt.trim() || title.trim(), themeCharacterMentions.slice(0, 2).map((mention) => mention.handle), voiceProfile);
      const shouldMuteSourceAudio = current.length > 0 && current.every((scene) => sceneAudioMuted[scene.id]);
      if (shouldMuteSourceAudio) {
        setSceneAudioMuted((muted) => ({ ...muted, [nextScene.id]: true }));
      }
      return retimeScenes([...current, nextScene]);
    });
  }

  function deleteScene(sceneId: string) {
    setScenes((current) => retimeScenes(current.filter((scene) => scene.id !== sceneId)));
    if (selectedTimelineSceneId === sceneId) setSelectedTimelineSceneId('');
  }

  function moveScene(sceneId: string, direction: -1 | 1) {
    setScenes((current) => {
      const index = current.findIndex((scene) => scene.id === sceneId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return retimeScenes(next);
    });
  }

  function reorderScene(draggedSceneId: string, targetSceneId: string) {
    setScenes((current) => {
      const from = current.findIndex((scene) => scene.id === draggedSceneId);
      const to = current.findIndex((scene) => scene.id === targetSceneId);
      if (from < 0 || to < 0 || from === to) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return retimeScenes(next);
    });
    setSelectedTimelineSceneId(draggedSceneId);
  }

  function updateTimelineTransition(sceneId: string, transition: TransitionKind) {
    setTimelineTransitions((current) => ({ ...current, [sceneId]: transition }));
  }

  function selectTimelineScene(sceneId: string) {
    setSelectedTimelineSceneId(sceneId);
    setSceneSelectionVersion((current) => current + 1);
  }

  function updateSceneAudioMuted(sceneId: string, muted: boolean) {
    setSceneAudioMuted((current) => ({ ...current, [sceneId]: muted }));
  }

  function sceneAudioMutedByDefault() {
    return scenes.length > 0 && scenes.every((scene) => sceneAudioMuted[scene.id]);
  }

  function inheritSceneAudioMute(nextScenes: EpisodeSceneCard[]) {
    if (!sceneAudioMutedByDefault()) return;
    setSceneAudioMuted((current) => ({
      ...current,
      ...Object.fromEntries(nextScenes.map((scene) => [scene.id, true])),
    }));
  }

  function addTimelineAudioLayer(layer: TimelineAudioLayer) {
    setTimelineAudioLayers((current) => {
      if (layer.kind === 'tts' || layer.lane !== undefined) {
        return [...current, layer];
      }
      return [...current, { ...layer, lane: assignDedicatedLane(current, layer) }];
    });
  }

  function updateTimelineAudioLayer(id: string, patch: Partial<TimelineAudioLayer>) {
    setTimelineAudioLayers((current) =>
      current.map((layer) => {
        if (layer.id !== id) return layer;
        const next = { ...layer, ...patch };
        if (patch.fx) {
          next.fx = { ...(layer.fx ?? {}), ...patch.fx } as TimelineAudioLayer['fx'];
        }
        return next;
      }),
    );
  }

  function removeTimelineAudioLayer(id: string) {
    setTimelineAudioLayers((current) => current.filter((layer) => layer.id !== id));
  }

  function addTimelineBrollLayer(sceneId: string) {
    const scene = scenes.find((item) => item.id === sceneId) ?? buildSceneCards(title, basePrompt, duration, themeCharacterMentions).find((item) => item.id === sceneId);
    if (!scene) return;
    const asset = assets[0];
    setTimelineBrollLayers((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        sceneId,
        label: asset?.tag || asset?.name || `Scene ${scene.sceneNumber} B-roll`,
        source: asset ? 'episode-asset' : 'manual',
        sourceUrl: asset?.url,
        startSec: scene.startSec,
        endSec: scene.endSec,
        opacity: 62,
      },
    ]);
    toast.success('B-roll overlay added to this scene.');
  }

  function updateTimelineBrollLayer(id: string, patch: Partial<TimelineBrollLayer>) {
    setTimelineBrollLayers((current) => current.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)));
  }

  function removeTimelineBrollLayer(id: string) {
    setTimelineBrollLayers((current) => current.filter((layer) => layer.id !== id));
  }

  async function uploadTimelineAudioFile(file: File, kind: TimelineAudioLayer['kind'], options?: { saveToLibrary?: boolean; scope?: 'workspace' | 'public'; label?: string }) {
    const result = await uploadAudioMut.mutateAsync({ file, kind, options });
    if (options?.saveToLibrary) queryClient.invalidateQueries({ queryKey: ['content', 'audio-library'] });
    return result.cloudinaryUrl || result.s3Url;
  }

  function upsertSceneTtsLineTimelineLayer(
    scene: EpisodeSceneCard,
    line: EpisodeSceneTtsLine,
    lineIndex: number,
    lineCount: number,
    label?: string,
  ) {
    const streamUrl = studioStreamMediaUrl(line.audioUrl) ?? line.audioUrl;
    if (!streamUrl) return;
    const window = ttsLineTimelineWindow(scene, lineIndex, lineCount);
    setTimelineAudioLayers((current) => {
      const filtered = current.filter((layer) => !(layer.kind === 'tts' && layer.label?.includes(line.id)));
      return [
        ...filtered,
        {
          id: `tts-${scene.id}-${line.id}`,
          kind: 'tts' as const,
          label: label || line.label || `${line.speaker ? `${line.speaker} ┬╖ ` : ''}Scene ${scene.sceneNumber} line ${lineIndex + 1}`,
          url: streamUrl,
          startSec: window.startSec,
          endSec: window.endSec,
          volume: 90,
        },
      ];
    });
    setSceneAudioMuted((current) => ({ ...current, [scene.id]: true }));
  }

  function upsertAllSceneTtsTimelineLayers(scene: EpisodeSceneCard) {
    const lines = ensureSceneTtsLines(scene, voiceProfile).filter((line) => line.status === 'ready' && line.audioUrl);
    lines.forEach((line, index) => {
      upsertSceneTtsLineTimelineLayer(scene, line, index, lines.length, line.label);
    });
  }

  function playAudioUrl(url: string) {
    const streamUrl = studioStreamMediaUrl(url) ?? url;
    void playEpisodeAudio(streamUrl).catch(() => toast.error('Could not play generated audio. Try the audio controls below.'));
  }

  function canUseSceneTts(scene: EpisodeSceneCard) {
    return sceneHasReadyTts(scene) || Boolean(audioModel && ensureSceneTtsLines(scene, voiceProfile).some((line) => line.text.trim()));
  }

  function handleSceneTtsLine(sceneId: string, lineId: string) {
    const scene = scenes.find((item) => item.id === sceneId);
    if (!scene) return;
    const lines = ensureSceneTtsLines(scene, voiceProfile);
    const line = lines.find((item) => item.id === lineId);
    if (!line) return;
    if (line.audioUrl && line.status === 'ready') {
      playAudioUrl(line.audioUrl);
      const lineIndex = lines.findIndex((item) => item.id === lineId);
      upsertSceneTtsLineTimelineLayer(scene, line, lineIndex, lines.length, line.label);
      return;
    }
    if (!audioModel) {
      toast.error('Select an audio / TTS model in Section 2 first.');
      return;
    }
    if (!line.text.trim()) {
      toast.error('Add dialogue text before generating TTS.');
      return;
    }
    setScenes((current) => current.map((item) =>
      item.id === sceneId ? updateSceneTtsLine(item, lineId, { status: 'generating' }, voiceProfile) : item,
    ));
    const resolved = resolveLineTtsFromSpeaker(line.speaker, characterTtsProfiles, voiceProfile, defaultTtsTone);
    generateTtsMut.mutate({
      sceneId,
      ttsLineId: lineId,
      sceneNumber: scene.sceneNumber,
      episodeId: scene.sceneVideoTakeId,
      speaker: line.speaker,
      text: line.text.trim(),
      model: audioModel,
      voiceProfile: resolved.voiceProfile,
      tonePreset: resolved.tone.preset,
      toneDirection: resolved.tone.direction,
      tonePace: resolved.tone.pace,
      tonePitch: resolved.tone.pitch,
    });
  }

  function handleSceneTts(sceneId: string, lineId?: string) {
    if (lineId) {
      handleSceneTtsLine(sceneId, lineId);
      return;
    }
    const scene = scenes.find((item) => item.id === sceneId);
    if (!scene) return;
    if (sceneHasReadyTts(scene)) {
      upsertAllSceneTtsTimelineLayers(scene);
      const firstReady = ensureSceneTtsLines(scene, voiceProfile).find((line) => line.audioUrl);
      if (firstReady?.audioUrl) playAudioUrl(firstReady.audioUrl);
      return;
    }
    const pendingLine = ensureSceneTtsLines(scene, voiceProfile).find((line) => line.text.trim());
    if (pendingLine) {
      handleSceneTtsLine(sceneId, pendingLine.id);
    }
  }

  function handleImproveScene(scene: EpisodeSceneCard) {
    const sourceCheck = episodeSourceRequirementsMet(scriptWorkflow, title, basePrompt, scriptWorkflow === 'scenes' ? scenes : []);
    if (!selectedModule || !title.trim() || !textModel) {
      toast.error('Select a module, title, and text model first.');
      return;
    }
    if (!sourceCheck.ok && scriptWorkflow !== 'scenes') {
      toast.error(sourceCheck.message ?? 'Episode source requirements are not met.');
      return;
    }
    const generationContext = scriptWorkflow === 'scenes'
      ? resolveSceneVideoGenerationContext(scriptWorkflow, scene, title, basePrompt)
      : { basePrompt: basePrompt.trim() || title.trim() };
    improveSceneMut.mutate({
      moduleId: selectedModule._id,
      title: title.trim(),
      basePrompt: generationContext.basePrompt,
      model: textModel,
      scene: {
        id: scene.id,
        sceneNumber: scene.sceneNumber,
        startSec: scene.startSec,
        endSec: scene.endSec,
        voiceOver: scene.voiceOver,
        visualPrompt: scene.visualPrompt,
        characterHandles: extractHandles(`${scene.voiceOver} ${scene.visualPrompt}`),
      },
    });
  }

  function sceneCharacterReferenceAssets(scene: EpisodeSceneCard) {
    const ids = scene.selectedCharacterRefIds ?? selectedCharacterRefIds;
    return themeCharacterRefs
      .filter((reference) => ids.includes(reference.id))
      .map((reference) => ({
        name: reference.label,
        tag: 'theme-character-reference',
        url: reference.url,
        s3Url: reference.s3Url,
        s3Key: reference.s3Key,
        publicId: reference.publicId,
        characterHandle: reference.handle,
      }));
  }

  function handleGenerateSceneVideo(scene: EpisodeSceneCard) {
    const sourceCheck = episodeSourceRequirementsMet(
      scriptWorkflow,
      title,
      basePrompt,
      scriptWorkflow === 'scenes' ? scenes : [],
    );
    if (!selectedModule || !title.trim() || !videoModel) {
      toast.error('Select a module, title, and video model first.');
      return;
    }
    if (!sourceCheck.ok && scriptWorkflow === 'scenes') {
      toast.error(sourceCheck.message ?? 'Complete every scene card before rendering.');
      return;
    }
    if (!basePrompt.trim() && scriptWorkflow !== 'scenes') {
      toast.error('Add a base prompt in Section 1 first.');
      return;
    }
    if (scriptWorkflow === 'scenes' && !sceneHasGenerationContent(scene)) {
      toast.error('Add a voice-over or visual prompt to this scene before rendering.');
      return;
    }
    const generationContext = resolveSceneVideoGenerationContext(scriptWorkflow, scene, title, basePrompt);
    updateScene(scene.id, { sceneVideoStatus: 'generating' });
    const selectedSceneRefIds = scene.selectedCharacterRefIds ?? selectedCharacterRefIds;
    const selectedSceneRefs = sceneCharacterReferenceAssets(scene);
    generateSceneVideoMut.mutate({
      moduleId: selectedModule._id,
      title: title.trim(),
      basePrompt: generationContext.basePrompt,
      model: videoModel,
      soundEnabled: scene.sceneVideoAudioEnabled ?? soundEnabled,
      scene: {
        id: scene.id,
        sceneNumber: scene.sceneNumber,
        startSec: scene.startSec,
        endSec: scene.endSec,
        voiceOver: scene.voiceOver,
        visualPrompt: scene.visualPrompt,
        characterHandles: extractHandles(`${scene.voiceOver} ${scene.visualPrompt}`),
        selectedCharacterRefIds: selectedSceneRefIds,
        referenceAssets: selectedSceneRefs,
        approved: true,
        videoAudioEnabled: scene.sceneVideoAudioEnabled ?? soundEnabled,
        voiceProfile: resolveSceneVoiceProfile(scene, voiceProfile),
        audioModel,
      },
      assets: [
        ...assets.map((asset) => ({ name: asset.name, tag: asset.tag || undefined })),
        ...selectedSceneRefs,
      ],
    });
  }

  async function playVoiceSample() {
    if (!audioModel) {
      toast.error('Select an audio / TTS model in Section 2 first.');
      return;
    }
    try {
      setVoiceSamplePending(true);
      const result = await generateEpisodeTtsRequest({
        text: 'This is a preview of the selected voice-over tone for your segmented episode.',
        model: audioModel,
        voiceProfile,
        tonePreset: defaultTtsTone.preset,
        toneDirection: defaultTtsTone.direction,
      });
      const audioUrl = studioStreamMediaUrl(result.audio.cloudinaryUrl, result.audio.s3Url);
      if (audioUrl) playAudioUrl(audioUrl);
    } catch {
      toast.error('Could not generate voice sample.');
    } finally {
      setVoiceSamplePending(false);
    }
  }

  function handleGenerateImage() {
    if (!introPrompt.trim() || !imageModel) return;
    generateImageMut.mutate({
      prompt: introPrompt.trim(),
      model: imageModel,
      moduleId: moduleId || undefined,
      selectedCharacterRefIds: selectedCharacterRefIds.length ? selectedCharacterRefIds : undefined,
    });
  }

  function handleRefineImagePrompt() {
    if (!introPrompt.trim() || !textModel) return;
    refineImagePromptMut.mutate({
      prompt: introPrompt.trim(),
      model: textModel,
      moduleId: selectedModule?._id,
    });
  }

  async function handleSaveThumbnail() {
    if (!moduleId || !thumbnailPreviewUrl || thumbnailPreviewUrl.startsWith('blob:')) {
      toast.error('Upload or generate a thumbnail before saving.');
      return;
    }
    try {
      setThumbnailRenderPending(true);
      const editedFile = await composeEpisodeThumbnail({
        imageUrl: thumbnailPreviewUrl,
        text: thumbnailOverlayText,
        fontFamily: overlayFont,
        textColor: overlayColor,
        align: overlayAlign,
        xPercent: overlayX,
        yPercent: overlayY,
        opacity: overlayOpacity,
      });
      const uploaded = await uploadEpisodeImageRequest(editedFile);
      const editedUrl = uploaded.cloudinaryUrl || uploaded.s3Url;
      if (!editedUrl) throw new Error('Edited thumbnail upload did not return a URL.');
      saveThumbnailMut.mutate({
        episodeId: activeEpisode?._id ?? latestSavedEpisode?._id,
        moduleId,
        title: title.trim() || 'Untitled episode',
        basePrompt: basePrompt.trim() || title.trim() || 'Episode thumbnail draft',
        outputMode: mode,
        generationModel: videoModel || textModel || imageModel || 'thumbnail-only',
        durationSeconds: duration,
        soundEnabled,
        thumbnailUrl: editedUrl,
        thumbnailLabel: `${thumbnailPreviewLabel || 'Episode thumbnail'} with title overlay`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not render edited thumbnail.');
    } finally {
      setThumbnailRenderPending(false);
    }
  }

  function episodeDraftSnapshot(): EpisodeCanvasDraft {
    return {
      moduleId,
      title,
      basePrompt,
      mode,
      duration,
      extendedCut,
      soundEnabled,
      textModel,
      imageModel,
      videoModel,
      audioModel,
      voiceProfile,
      defaultTtsTonePreset,
      defaultTtsToneDirection,
      introSource,
      introPrompt,
      thumbnailPreviewUrl,
      thumbnailPreviewLabel,
      committedThumbnailUrl,
      committedThumbnailLabel,
      overlayText,
      overlayFont,
      overlayColor,
      overlayAlign,
      overlayX,
      overlayY,
      overlayOpacity,
      scriptWorkflow,
      scriptDraft,
      scriptApproved,
      selectedCharacterRefIds,
      scenes,
      selectedTimelineSceneId,
      timelineTransitions,
      sceneAudioMuted,
      timelineAudioLayers,
      timelineBrollLayers,
      assets,
      finalDraft,
    };
  }

  function handleSaveEpisodeDraft() {
    saveEpisodeDraftMut.mutate(episodeDraftSnapshot());
  }

  function handleGenerateScript() {
    if (!selectedModule || !title.trim() || !basePrompt.trim() || !textModel) return;
    setScriptState('generating');
    setScriptApproved(false);
    generateScriptMut.mutate({
      moduleId: selectedModule._id,
      title: title.trim(),
      basePrompt: basePrompt.trim(),
      durationSeconds: duration,
      model: textModel,
    });
  }

  function handleFinalGenerate(options?: TimelineRenderOptions) {
    if (!selectedModule) return;
    if (mode === 'media') {
      if (!canRenderTimeline) {
        if (timelineRenderDisabledReason) toast.error(timelineRenderDisabledReason);
        return;
      }
      setReviewState('generating');
      const transitions = options?.transitions ?? timelineTransitions;
      const timelineScenes = scenes.map((scene) => ({
          sceneNumber: scene.sceneNumber,
          startSec: scene.startSec,
          endSec: scene.endSec,
          videoUrl: readySceneVideoUrls.get(scene.sceneNumber) ?? '',
          transition: transitions[scene.id] ?? 'cut',
          transitionDuration: transitions[scene.id] === 'cut' ? 0.1 : 0.55,
          sourceAudioMuted: Boolean(sceneAudioMuted[scene.id]),
          voiceOver: scene.voiceOver,
          visualPrompt: scene.visualPrompt,
          characterHandles: extractHandles(`${scene.voiceOver} ${scene.visualPrompt}`),
        }));
      const missingSceneVideos = timelineScenes.filter((scene) => !scene.videoUrl);
      if (missingSceneVideos.length > 0) {
        setReviewState('idle');
        toast.error(`Render all ${scenes.length} scene clips before stitching. ${missingSceneVideos.length} still missing.`);
        return;
      }
      renderTimelineMut.mutate({
        moduleId: selectedModule._id,
        title: title.trim(),
        basePrompt: resolveEpisodeGenerationContext({
          workflow: scriptWorkflow,
          title,
          basePrompt,
          scriptDraft,
          scriptApproved,
          scenes,
        }).basePrompt || undefined,
        durationSeconds: Math.max(5, Math.min(90, Math.ceil(Math.max(...timelineScenes.map((scene) => scene.endSec))))),
        soundEnabled,
        thumbnailLabel: committedThumbnailLabel || thumbnailPreviewLabel || undefined,
        thumbnailUrl: committedThumbnailUrl || thumbnailPreviewUrl || undefined,
        scenes: timelineScenes,
        audioLayers: timelineAudioLayers
          .filter((layer) => /^https?:\/\//i.test(layer.url))
          .map((layer) => ({
            id: layer.id,
            kind: layer.kind,
            label: layer.label,
            url: layer.url,
            startSec: layer.startSec,
            endSec: layer.endSec,
            volume: layer.volume,
            muted: layer.muted,
            clipOffsetSec: layer.clipOffsetSec,
          })),
      });
      return;
    }

    if (!canGenerateFinal) return;
    setReviewState('generating');
    const generationContext = resolveEpisodeGenerationContext({
      workflow: scriptWorkflow,
      title,
      basePrompt,
      scriptDraft,
      scriptApproved,
      scenes,
    });
    generateMediaMut.mutate({
      moduleId: selectedModule._id,
      title: title.trim(),
      basePrompt: generationContext.basePrompt,
      approvedScript: generationContext.approvedScript,
      durationSeconds: duration,
      soundEnabled,
      outputMode: mode,
      model: activeFinalModel,
      thumbnailLabel: committedThumbnailLabel || thumbnailPreviewLabel || undefined,
      thumbnailUrl: committedThumbnailUrl || thumbnailPreviewUrl || undefined,
      assets: [
        ...assets.map((asset) => ({ name: asset.name, tag: asset.tag || undefined })),
        ...selectedCharacterRefs.map((reference) => ({
          name: reference.label,
          tag: 'theme-character-reference',
          url: reference.url,
          s3Url: reference.s3Url,
          s3Key: reference.s3Key,
          publicId: reference.publicId,
          characterHandle: reference.handle,
        })),
        ...scenes.flatMap((scene) => sceneCharacterReferenceAssets(scene)),
      ],
      loras: backgroundLoras,
      scenes: scenes.map((scene) => ({
        id: scene.id,
        sceneNumber: scene.sceneNumber,
        startSec: scene.startSec,
        endSec: scene.endSec,
        voiceOver: scene.voiceOver,
        visualPrompt: scene.visualPrompt,
        characterHandles: extractHandles(`${scene.visualPrompt} ${scene.voiceOver}`),
        selectedCharacterRefIds: scene.selectedCharacterRefIds ?? selectedCharacterRefIds,
        referenceAssets: sceneCharacterReferenceAssets(scene),
        approved: scene.approved,
        videoAudioEnabled: scene.sceneVideoAudioEnabled ?? soundEnabled,
      })),
    });
  }

  function handlePublishWebsite() {
    if (!activeEpisode?._id) {
      toast.error('Render and stitch an episode first.');
      return;
    }
    if (!websitePublishMediaReady) {
      toast.error('Render and stitch the episode, or save an episode cover image first.');
      return;
    }
    publishWebsiteMut.mutate(activeEpisode._id);
  }

  function handlePublishEpisode() {
    if (!activeEpisode?._id) {
      toast.error('Render and stitch an episode first.');
      return;
    }
    if (!finalVideoUrl) {
      toast.error('The episode master video is not ready yet.');
      return;
    }
    if (!isWebsitePublished) {
      toast.error('Publish this episode on the platform website before social posting.');
      return;
    }
    if (selectedPlatformAlreadyPublished) {
      toast.error(`Already published to ${publishPlatformLabel(publishPlatform)}.`);
      return;
    }
    if (!selectedPublishConnection) {
      toast.error(`Connect ${publishPlatformLabel(publishPlatform)} before publishing.`);
      return;
    }
    publishEpisodeMut.mutate({
      id: activeEpisode._id,
      payload: {
        platform: publishPlatform,
        title: title.trim() || activeEpisode.title || 'Untitled episode',
        description: publishDescription.trim() || defaultPublishDescription || undefined,
      },
    });
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={handleSaveEpisodeDraft}
        disabled={saveEpisodeDraftMut.isPending}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-[var(--color-ash-brown)] px-4 py-3 text-sm font-semibold text-[var(--color-vanilla-cream)] shadow-lg ring-1 ring-white/70 disabled:opacity-45"
      >
        {saveEpisodeDraftMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saveEpisodeDraftMut.isPending ? 'Saving draft...' : 'Save draft'}
      </button>
      <header className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-tea-green)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-faded-copper)]">
              <MonitorPlay size={12} /> Episode Generation
            </div>
            <h1 className="text-2xl font-semibold text-dark">Creator&apos;s Canvas</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
              Move through initialization, model routing, thumbnail creation, optional script blueprinting, and final review without losing inherited module context.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TagPill icon={Layers3} label={selectedModule?.title ?? 'Module not selected'} />
            <TagPill icon={Palette} label={selectedTheme?.title ?? 'Theme inherited from module'} />
            {platformLabels.map((label) => (
              <TagPill key={label} icon={Route} label={label} />
            ))}
            <button type="button" onClick={handleSaveEpisodeDraft} disabled={saveEpisodeDraftMut.isPending} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-muted-olive)] px-3 py-1.5 text-xs font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45">
              {saveEpisodeDraftMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saveEpisodeDraftMut.isPending ? 'Saving...' : 'Save draft'}
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[18rem_1fr]">
        <aside className="space-y-4">
          <Panel title="Context" kicker="Read-only inheritance for the active episode." icon={Layers3}>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted">Parent Module</label>
                <Select aria-label="Parent module" value={moduleId} options={moduleOptions} onChange={handleModuleChange} className="mt-1" />
              </div>
              {selectedModule?.status === 'generating' && (
                <div className="rounded-xl border border-[var(--color-faded-copper)]/40 bg-[var(--color-faded-copper)]/10 p-3 text-xs leading-relaxed text-[var(--color-ash-brown)]">
                  This module has cover or long-form video generation in progress. You can still render individual scene clips and stitch them here, but module-level status may show as generating until that job finishes.
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startFreshEpisodeWorkspace}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-dark hover:border-[var(--color-muted-olive)]"
                >
                  <Plus size={13} /> New episode for this module
                </button>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Theme</p>
                <p className="mt-1 text-sm font-semibold text-dark">{selectedTheme?.title ?? 'Inherited after module selection'}</p>
                <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted">{selectedTheme?.defaultStoryPrompt ?? 'Theme bible appears here as read-only context.'}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-tea-green)] bg-white p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Routing Destinations</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {platformLabels.map((label) => (
                    <span key={label} className="rounded-full bg-[var(--color-tea-green)]/40 px-2.5 py-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Module Episodes" kicker="Episodes saved for the selected module only." icon={Film}>
            {!moduleId ? (
              <p className="text-xs leading-relaxed text-muted">Select a module to see its episodes.</p>
            ) : savedEpisodesLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted">
                <Loader2 size={14} className="animate-spin" />
                Loading episodesΓÇª
              </div>
            ) : moduleEpisodes.length === 0 ? (
              <p className="text-xs leading-relaxed text-muted">No episodes yet for this module. Use ΓÇ£New episode for this moduleΓÇ¥ to start one.</p>
            ) : (
              <ul className="space-y-2">
                {moduleEpisodes.map((episode) => {
                  const isActive = activeEpisodeForModule?._id === episode._id;
                  return (
                    <li key={episode._id}>
                      <button
                        type="button"
                        onClick={() => loadSavedEpisodeMut.mutate(episode._id)}
                        disabled={loadSavedEpisodeMut.isPending}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${isActive ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/25' : 'border-border bg-white hover:border-[var(--color-muted-olive)]/60'}`}
                      >
                        <p className="text-sm font-semibold text-dark line-clamp-1">{episode.title || 'Untitled episode'}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted">
                          {episode.status.replace(/_/g, ' ')} ┬╖ {episode.durationSeconds}s
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Timeline" kicker="Sequential generation flow." icon={Clock3}>
            {['Initialize', 'Models', 'Thumbnail', 'Script Gate', 'Generate', 'Review'].map((item, index) => (
              <div key={item} className="flex gap-3 pb-4 last:pb-0">
                <div className="flex flex-col items-center">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${index <= 1 || reviewState !== 'idle' || scriptApproved ? 'bg-[var(--color-muted-olive)] text-[var(--color-vanilla-cream)]' : 'border border-border text-muted'}`}>
                    {index + 1}
                  </span>
                  {index < 5 && <span className="h-full w-px bg-border" />}
                </div>
                <p className="pt-1 text-xs font-semibold text-dark">{item}</p>
              </div>
            ))}
          </Panel>
        </aside>

        <main className="space-y-5">
          <Panel title="1. Episode Initialization & Context Inheritance" kicker="Capture the raw idea and keep inherited module, theme, and routing indicators visible." icon={FileText}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted">Episode Title</label>
                <input className="input-field mt-1 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Episode 04: The Lagos Launch" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Active Module</label>
                <div className="mt-1 rounded-xl border border-border bg-white px-3 py-3 text-sm font-semibold text-dark">{selectedModule?.title ?? 'Select from Context'}</div>
              </div>
              <div className="lg:col-span-2">
                <label className="text-xs font-medium text-muted">Base Textual Prompt</label>
                <textarea className="input-field mt-1 min-h-[120px] text-sm" value={basePrompt} onChange={(e) => setBasePrompt(e.target.value)} placeholder="Write the raw episode idea, conflict, lesson, product angle, or story beat." />
              </div>
            </div>
          </Panel>

          <Panel title="2. System Configuration & Voice Selector" kicker="Set target runtime, scene count, AI routing, and optional text-to-speech voice-over." icon={Timer}>
            <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-3">
                {[
                  { id: 'text' as const, label: 'Text-Only Mode', detail: 'Scripts, stories, or blog posts.', icon: FileText },
                  { id: 'media' as const, label: 'Media Mode', detail: 'Video clips or image sequences.', icon: MonitorPlay },
                ].map(({ id, label, detail, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMode(id)}
                    className={`w-full rounded-xl border p-4 text-left ${mode === id ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/25' : 'border-border bg-white hover:border-[var(--color-muted-olive)]/60'}`}
                  >
                    <Icon size={18} className="text-[var(--color-ash-brown)]" />
                    <p className="mt-3 text-sm font-semibold text-dark">{label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{detail}</p>
                  </button>
                ))}

                <div className={`rounded-xl border p-4 ${mode === 'media' ? 'border-border bg-white' : 'border-border bg-white opacity-55'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-dark">Target Runtime</p>
                      <p className="text-xs text-muted">{targetSceneCount} 10-second scenes</p>
                    </div>
                    <span className="rounded-full bg-[var(--color-tea-green)]/40 px-3 py-1 text-xs font-semibold text-[var(--color-ash-brown)]">{duration}s</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {TARGET_DURATION_OPTIONS.map((seconds) => (
                      <button key={seconds} type="button" disabled={mode !== 'media'} onClick={() => setDuration(seconds)} className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40 ${duration === seconds ? 'border-[var(--color-muted-olive)] bg-[var(--color-muted-olive)] text-[var(--color-vanilla-cream)]' : 'border-border text-dark hover:border-[var(--color-muted-olive)]'}`}>
                        {seconds}s
                      </button>
                    ))}
                  </div>
                  <label className="mt-5 flex items-center gap-3 rounded-xl border border-border p-3 text-sm font-semibold text-dark">
                    <input type="checkbox" checked={extendedCut} disabled={mode !== 'media'} onChange={(e) => setExtendedCut(e.target.checked)} />
                    Extended Cut up to 1:30 / 9 scenes
                  </label>
                  {extendedCut && (
                    <input type="range" min={15} max={90} value={duration} disabled={mode !== 'media'} onChange={(e) => setDuration(Number(e.target.value))} className="mt-4 w-full accent-[var(--color-muted-olive)]" />
                  )}
                  <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm font-semibold text-dark">
                    <span>
                      Default scene video audio
                      <span className="mt-0.5 block text-[11px] font-normal text-muted">Default for new scene cards. TTS is always mixed on the timeline separately.</span>
                    </span>
                    <input type="checkbox" checked={soundEnabled} disabled={mode !== 'media'} onChange={(e) => setSoundEnabled(e.target.checked)} />
                  </label>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-4">
                <ModelSelect label="Script / Context Model" use="text" value={textModel} options={aiModels.text} onChange={setTextModel} />
                <ModelSelect label="Image Model" use="image" value={imageModel} options={aiModels.image} onChange={setImageModel} />
                <ModelSelect label="Video Renderer" use="video" value={videoModel} options={aiModels.video} onChange={setVideoModel} />
                <ModelSelect label="Audio / TTS Model" use="audio" value={audioModel} options={aiModels.audio} onChange={setAudioModel} />
                <div className="lg:col-span-4 rounded-xl border border-[var(--color-tea-green)] bg-white p-4">
                  <div className="flex items-start gap-3">
                    <Headphones size={17} className="mt-0.5 text-[var(--color-ash-brown)]" />
                    <div className="grid flex-1 gap-3 md:grid-cols-[1fr_auto]">
                      <div>
                        <p className="text-sm font-semibold text-dark">Voice-Over Control Panel</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">
                          Set episode mood for narrator lines only. Theme characters keep their own voice and tone presets ΓÇö pick them as dialogue speakers in Section 4.
                        </p>
                      </div>
                      <button type="button" onClick={playVoiceSample} disabled={!audioModel || voiceSamplePending} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-ash-brown)] disabled:opacity-45">
                        {voiceSamplePending ? <Loader2 size={15} className="animate-spin" /> : <Volume2 size={15} />}
                        {voiceSamplePending ? 'Generating...' : 'Play Sample'}
                      </button>
                      <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
                        <TtsVoiceSelect
                          label="Narrator voice"
                          ariaLabel="Narrator TTS voice"
                          value={voiceProfile}
                          onChange={setVoiceProfile}
                        />
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Episode mood preset</p>
                          <Select aria-label="Episode mood preset" value={defaultTtsTonePreset} options={[...TTS_TONE_PRESETS]} onChange={(value) => setDefaultTtsTonePreset(value as EpisodeTtsTonePreset)} />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Episode mood direction</p>
                        <input
                          className="input-field text-sm"
                          value={defaultTtsToneDirection}
                          placeholder="Optional mood notes for narrator lines in this episode"
                          onChange={(event) => setDefaultTtsToneDirection(event.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Theme character TTS presets (read-only)</p>
                        <ThemeCharacterTtsSummary
                          characters={themeCharacterMentions}
                          profiles={characterTtsProfiles}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="3. Episodic Image Intro & Thumbnail Creator" kicker="Episode thumbnails can be uploaded or generated. Episode-level intro videos are blocked." icon={ImageIcon}>
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-[var(--color-faded-copper)]/30 bg-white p-4">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--color-faded-copper)]" />
              <div>
                <p className="text-sm font-semibold text-dark">No episode intro videos</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">Intro videos are handled at the Module level. This episode workspace only accepts thumbnail/title-card images.</p>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'upload' as const, label: 'Author Upload', icon: UploadCloud },
                    { id: 'ai' as const, label: 'AI Image Generator', icon: Sparkles },
                  ].map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" onClick={() => setIntroSource(id)} className={`rounded-xl border p-3 text-left text-xs font-semibold ${introSource === id ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/25 text-[var(--color-ash-brown)]' : 'border-border text-dark'}`}>
                      <Icon size={16} className="mb-2" />
                      {label}
                    </button>
                  ))}
                </div>

                {introSource === 'upload' ? (
                  <label className="block cursor-pointer rounded-xl border border-dashed border-[var(--color-tea-green)] p-5 text-center">
                    <UploadCloud size={24} className="mx-auto text-[var(--color-ash-brown)]" />
                    <p className="mt-2 text-sm font-semibold text-dark">Upload thumbnail image</p>
                    <p className="mt-1 text-xs text-muted">The uploaded image appears in the preview canvas before you commit it.</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        void fitImageFileToCanvas(file, 1024, 1024, 'cover')
                          .then((fittedFile) => {
                            setThumbnailPreviewUrl(URL.createObjectURL(fittedFile));
                            setThumbnailPreviewLabel(`${file.name} reformatted to 1024x1024`);
                            uploadImageMut.mutate(fittedFile);
                          })
                          .catch(() => {
                            setThumbnailPreviewUrl(URL.createObjectURL(file));
                            setThumbnailPreviewLabel(file.name);
                            uploadImageMut.mutate(file);
                            toast.error('Could not reformat image automatically. Using original upload.');
                          });
                      }}
                    />
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <textarea
                        className="input-field min-h-[110px] text-sm"
                        value={introPrompt}
                        onChange={(e) => handleImagePromptChange(e.target.value, e.currentTarget.selectionStart)}
                        placeholder="Describe the thumbnail/title-card image to generate. Type @ to reference theme characters."
                      />
                      {imageMentionOpen && (
                        <div className="absolute left-3 top-12 z-20 w-64 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
                          {imageMentionOptions.length > 0 ? (
                            imageMentionOptions.map((character) => (
                              <button
                                key={character.handle}
                                type="button"
                                onClick={() => insertImageCharacterMention(character.handle)}
                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-[var(--color-tea-green)]/25"
                              >
                                <span className="font-semibold text-dark">{character.handle}</span>
                                <span className="truncate text-muted">{character.name}</span>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-xs leading-relaxed text-muted">No character handles found in the active Theme.</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={handleRefineImagePrompt} disabled={!introPrompt.trim() || !textModel || refineImagePromptMut.isPending} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-ash-brown)] disabled:opacity-45">
                        {refineImagePromptMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <PencilLine size={15} />}
                        {refineImagePromptMut.isPending ? 'Refining...' : 'Refine Prompt'}
                      </button>
                      <button type="button" onClick={handleGenerateImage} disabled={!introPrompt.trim() || !imageModel || generateImageMut.isPending} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45">
                        {generateImageMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                        {generateImageMut.isPending ? 'Generating...' : 'Generate Image'}
                      </button>
                    </div>
                    {themeCharacterRefs.length > 0 && (
                      <div className="rounded-xl border border-border bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-dark">Character references for cover image</p>
                          <span className="rounded-full bg-[var(--color-tea-green)]/40 px-2.5 py-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">
                            {selectedCharacterRefs.length} selected
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted">
                          Pick saved theme variants to lock identities into the thumbnail. Type @ in the prompt or select variants below.
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {themeCharacterRefs.map((reference) => {
                            const checked = selectedCharacterRefIds.includes(reference.id);
                            return (
                              <button
                                key={reference.id}
                                type="button"
                                onClick={() => toggleCharacterReference(reference.id)}
                                className={`overflow-hidden rounded-lg border text-left transition ${checked ? 'border-[var(--color-muted-olive)] ring-2 ring-[var(--color-tea-green)]/60' : 'border-border hover:border-[var(--color-muted-olive)]/60'}`}
                              >
                                <div className="aspect-square bg-[var(--color-tea-green)]/25">
                                  <img src={reference.url} alt={reference.label} className="h-full w-full object-cover" />
                                </div>
                                <div className="p-2">
                                  <p className="truncate text-[10px] font-semibold text-dark">{reference.handle}</p>
                                  <p className="truncate text-[10px] text-muted">{reference.label}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-semibold text-dark">Preview Canvas</p>
                  <div className="mt-3 aspect-video overflow-hidden rounded-lg border border-border bg-[var(--color-muted-olive)]">
                    {generateImageMut.isPending ? (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(135deg,#adc178,#a98467)] p-5 text-center">
                        <Loader2 size={34} className="animate-spin text-[var(--color-vanilla-cream)]" />
                        <p className="mt-3 text-xs font-semibold text-[var(--color-vanilla-cream)]">Generating episode thumbnail...</p>
                      </div>
                    ) : thumbnailPreviewUrl ? (
                      <img src={thumbnailPreviewUrl} alt="Episode thumbnail preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(135deg,#adc178,#a98467)] p-5 text-center">
                        <ImageIcon size={34} className="text-[var(--color-vanilla-cream)]" />
                        <p className="mt-3 text-xs font-semibold text-[var(--color-vanilla-cream)]">{thumbnailPreviewLabel || 'Generate or upload an image to preview.'}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={handleGenerateImage} disabled={introSource !== 'ai' || !introPrompt.trim() || !imageModel || generateImageMut.isPending} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-dark disabled:opacity-45">
                      {generateImageMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />} Regenerate
                    </button>
                    <button type="button" onClick={handleSaveThumbnail} disabled={!thumbnailPreviewUrl || thumbnailPreviewUrl.startsWith('blob:') || thumbnailRenderPending || saveThumbnailMut.isPending || uploadImageMut.isPending} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-ash-brown)] px-3 py-2 text-xs font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45">
                      {saveThumbnailMut.isPending || uploadImageMut.isPending || thumbnailRenderPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {uploadImageMut.isPending ? 'Uploading...' : thumbnailRenderPending ? 'Rendering edits...' : saveThumbnailMut.isPending ? 'Saving...' : 'Save to Episode Thumbnails'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-[var(--color-muted-olive)]">
                  {thumbnailOverlayBaseUrl ? (
                    <img src={thumbnailOverlayBaseUrl} alt="Thumbnail overlay preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(135deg,#adc178,#a98467)] p-5 text-center">
                      <ImageIcon size={42} className="text-[var(--color-vanilla-cream)]" />
                      <p className="mt-3 max-w-xs text-xs font-semibold text-[var(--color-vanilla-cream)]">{committedThumbnailLabel || 'Generate or upload a preview image before styling the title overlay.'}</p>
                    </div>
                  )}
                  {showLiveThumbnailOverlay && (
                    <div
                      className="absolute w-[min(84%,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg px-4 py-3"
                      style={{
                        left: `${overlayX}%`,
                        top: `${overlayY}%`,
                        backgroundColor: `rgba(108, 88, 76, ${overlayOpacity / 100})`,
                      }}
                    >
                      <p className="text-lg font-semibold" style={{ color: overlayColor, fontFamily: overlayFont, textAlign: overlayAlign }}>
                        {thumbnailOverlayText}
                      </p>
                    </div>
                  )}
                  {committedThumbnailUrl && !showLiveThumbnailOverlay && (
                    <p className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white">
                      Saved thumbnail with title baked in
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input className="input-field text-sm" value={overlayText} onChange={(e) => setOverlayText(e.target.value)} placeholder="Overlay title text (defaults to episode title)" />
                  <Select aria-label="Overlay font" value={overlayFont} options={FONT_OPTIONS} onChange={setOverlayFont} />
                  <div className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-dark sm:col-span-2" style={{ fontFamily: overlayFont }}>
                    {thumbnailOverlayText} <span className="ml-2 text-[10px] font-normal text-muted">font preview</span>
                  </div>
                  <input type="color" value={overlayColor} onChange={(e) => setOverlayColor(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-white p-1" />
                  <div className="flex rounded-xl border border-border p-1">
                    {[
                      { id: 'left' as const, icon: AlignLeft },
                      { id: 'center' as const, icon: AlignCenter },
                      { id: 'right' as const, icon: AlignRight },
                    ].map(({ id, icon: Icon }) => (
                      <button key={id} type="button" onClick={() => setOverlayAlign(id)} className={`flex flex-1 items-center justify-center rounded-lg py-2 ${overlayAlign === id ? 'bg-[var(--color-tea-green)]/45 text-[var(--color-ash-brown)]' : 'text-muted'}`}>
                        <Icon size={16} />
                      </button>
                    ))}
                  </div>
                  <label className="sm:col-span-2 text-xs font-medium text-muted">
                    Text block background opacity
                    <input type="range" min={0} max={95} value={overlayOpacity} onChange={(e) => setOverlayOpacity(Number(e.target.value))} className="mt-2 w-full accent-[var(--color-muted-olive)]" />
                  </label>
                  <label className="text-xs font-medium text-muted">
                    Title horizontal position
                    <input type="range" min={8} max={92} value={overlayX} onChange={(e) => setOverlayX(Number(e.target.value))} className="mt-2 w-full accent-[var(--color-muted-olive)]" />
                  </label>
                  <label className="text-xs font-medium text-muted">
                    Title vertical position
                    <input type="range" min={10} max={92} value={overlayY} onChange={(e) => setOverlayY(Number(e.target.value))} className="mt-2 w-full accent-[var(--color-muted-olive)]" />
                  </label>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="4. Phase 1 - Scene-by-Scene Scripting & TTS Generation" kicker={scriptWorkflow === 'scenes' ? 'Build scene cards as the authoritative source, attach character references, then render each clip.' : 'Convert the idea into 10-second cards, approve each segment, and test voice pacing before rendering.'} icon={Wand2}>
            <div className="grid gap-3 lg:grid-cols-3">
              {[
                { id: 'scenes' as const, title: 'Generate From Scenes', body: 'Write 10-second scene cards directly. Final rendering uses each scene\'s voice-over and visual prompt, with per-scene character referencesΓÇönot the Section 1 base prompt.' },
                { id: 'direct' as const, title: 'Direct From Base Prompt', body: 'Skip script blueprinting. Text output uses the Section 1 base prompt. For media, still build scene clips in the editor below.' },
                { id: 'script' as const, title: 'Generate Script First', body: 'Expand the raw idea into a Markdown script blueprint, approve it, then continue to scene cards and rendering.' },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setScriptWorkflow(option.id);
                    setScriptApproved(false);
                  }}
                  className={`rounded-xl border p-4 text-left ${scriptWorkflow === option.id ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/25' : 'border-border bg-white hover:border-[var(--color-muted-olive)]/60'}`}
                >
                  <p className="text-sm font-semibold text-dark">{option.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{option.body}</p>
                </button>
              ))}
            </div>

            {scriptWorkflow === 'scenes' ? (
              <div className="mt-4 rounded-xl border border-[var(--color-muted-olive)]/40 bg-[var(--color-tea-green)]/15 p-4">
                <p className="text-sm font-semibold text-dark">Scene-first generation active</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Initialize empty scene cards, write each 10-second beat directly, and attach theme character references per scene. This path does not convert the Section 1 base prompt into a script.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={handleInitializeSceneBoard} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)]">
                    <Plus size={15} /> Initialize scene board
                  </button>
                  {scenesGateLocked && scenes.length > 0 && (
                    <span className="inline-flex items-center rounded-full bg-[var(--color-faded-copper)]/15 px-3 py-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">
                      Add voice-over or visual prompt to every scene
                    </span>
                  )}
                </div>
              </div>
            ) : scriptWorkflow === 'direct' ? (
              <div className="mt-4 rounded-xl border border-[var(--color-tea-green)] bg-white p-4">
                <p className="text-sm font-semibold text-dark">Script blueprint bypassed</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">Text generation uses the Section 1 base prompt. For media episodes, build and render scene clips in the editor below, then stitch the timeline.</p>
              </div>
            ) : (
              <div className="mt-4 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-semibold text-dark">Prompt-to-Script Converter</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Powered by {modelLabel(textModel, aiModels) || 'the selected text model'} and grounded in the selected module&apos;s linked theme.
                  </p>
                  <button type="button" onClick={handleGenerateScript} disabled={!selectedModule || !title.trim() || !basePrompt.trim() || !textModel || generateScriptMut.isPending} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45">
                    {generateScriptMut.isPending || scriptState === 'generating' ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Generate Script First
                  </button>
                  {!selectedModule && <p className="mt-2 text-xs text-[var(--color-faded-copper)]">Select a parent module so the script can inherit its theme bible.</p>}
                  {scriptGateLocked && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--color-faded-copper)]/30 p-3">
                      <LockKeyhole size={15} className="mt-0.5 text-[var(--color-faded-copper)]" />
                      <p className="text-xs leading-relaxed text-muted">Final media generation is locked until the script blueprint is approved.</p>
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-border p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-dark">Script Editor Canvas</p>
                    <div className="flex items-center gap-2">
                      <div className="flex rounded-lg border border-border p-1">
                        {(['edit', 'preview'] as ScriptView[]).map((view) => (
                          <button
                            key={view}
                            type="button"
                            onClick={() => setScriptView(view)}
                            className={`rounded-md px-2.5 py-1 text-[10px] font-semibold capitalize ${scriptView === view ? 'bg-[var(--color-tea-green)]/45 text-[var(--color-ash-brown)]' : 'text-muted'}`}
                          >
                            {view}
                          </button>
                        ))}
                      </div>
                      {scriptApproved && <span className="rounded-full bg-[var(--color-tea-green)]/45 px-2.5 py-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">Approved</span>}
                    </div>
                  </div>
                  {scriptView === 'edit' ? (
                    <div className="relative">
                      <textarea
                        className="input-field min-h-[260px] text-sm"
                        value={scriptDraft}
                        onChange={(e) => handleScriptDraftChange(e.target.value, e.currentTarget.selectionStart)}
                        placeholder="Generated Markdown script blueprint appears here for review and edits. Type @ to reference theme characters."
                      />
                      {mentionOpen && (
                        <div className="absolute left-3 top-12 z-20 w-64 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
                          {characterMentionOptions.length > 0 ? (
                            characterMentionOptions.map((character) => (
                              <button
                                key={character.handle}
                                type="button"
                                onClick={() => insertCharacterMention(character.handle)}
                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-[var(--color-tea-green)]/25"
                              >
                                <span className="font-semibold text-dark">{character.handle}</span>
                                <span className="truncate text-muted">{character.name}</span>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-xs leading-relaxed text-muted">No character handles found in the active Theme.</div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="markdown-preview min-h-[260px] rounded-xl border border-border bg-white p-4 text-sm text-dark">
                      {scriptDraft.trim() ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{scriptDraft}</ReactMarkdown>
                      ) : (
                        <p className="text-muted">Generated Markdown preview appears here after script generation.</p>
                      )}
                    </div>
                  )}
                  <button type="button" onClick={() => setScriptApproved(true)} disabled={!scriptDraft.trim()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--color-ash-brown)] px-4 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45">
                    <FileCheck2 size={15} /> Approve Script Blueprint
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 rounded-xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-dark">Character Reference Selector</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {scriptWorkflow === 'scenes'
                      ? 'Choose theme character variants for the episode default, then override references on individual scene cards below.'
                      : 'Choose saved character variants from the active theme to inject into this episode\'s media generation.'}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--color-tea-green)]/40 px-2.5 py-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">
                  {selectedCharacterRefs.length} active references
                </span>
              </div>
              {themeCharacterRefs.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-border p-5 text-center">
                  <Palette size={24} className="mx-auto text-[var(--color-ash-brown)]" />
                  <p className="mt-2 text-sm font-semibold text-dark">No theme character images saved yet</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">Open Themes, generate character images, and save variants to the Theme Asset Library.</p>
                </div>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {themeCharacterRefs.map((reference) => {
                    const checked = selectedCharacterRefIds.includes(reference.id);
                    return (
                      <button
                        key={reference.id}
                        type="button"
                        onClick={() => toggleCharacterReference(reference.id)}
                        className={`overflow-hidden rounded-xl border bg-white text-left transition ${checked ? 'border-[var(--color-muted-olive)] ring-2 ring-[var(--color-tea-green)]/60' : 'border-border hover:border-[var(--color-muted-olive)]/60'}`}
                      >
                        <div className="aspect-video bg-[var(--color-tea-green)]/25">
                          <img src={reference.url} alt={reference.label} className="h-full w-full object-cover" />
                        </div>
                        <div className="flex items-start gap-3 p-3">
                          <input type="checkbox" readOnly checked={checked} className="mt-0.5 accent-[var(--color-muted-olive)]" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-dark">{reference.handle}</p>
                            <p className="mt-0.5 truncate text-[11px] text-muted">{reference.label}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-5 rounded-xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-dark">10-Second Scene Cards</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{duration}s target runtime creates {targetSceneCount} chronological scene blocks.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {scriptWorkflow === 'scenes' ? (
                    <button type="button" onClick={handleInitializeSceneBoard} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)]">
                      <Plus size={15} /> Initialize scene board
                    </button>
                  ) : (
                    <button type="button" onClick={handleConvertIdeaToScenes} disabled={!basePrompt.trim() && !title.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45">
                      <Sparkles size={15} /> Convert Idea to Script
                    </button>
                  )}
                  <button type="button" onClick={addScene} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-ash-brown)]">
                    <Plus size={15} /> Add Scene
                  </button>
                </div>
              </div>

              {scenes.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
                  <Clock3 size={26} className="mx-auto text-[var(--color-ash-brown)]" />
                  <p className="mt-3 text-sm font-semibold text-dark">No scenes generated yet</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">Convert the idea into timed 10-second scene cards before media rendering.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {scenes.map((scene, index) => {
                    const sceneRefIds = scene.selectedCharacterRefIds ?? selectedCharacterRefIds;
                    const sceneRefs = themeCharacterRefs.filter((reference) => sceneRefIds.includes(reference.id));
                    const sceneVideoUrl = scene.sceneVideoUrl;
                    const sceneVideoStatus = scene.sceneVideoStatus ?? 'idle';
                    const linkedSceneDoc = activeEpisodeScenes.find((segment) => (
                      segment.sceneNumber === scene.sceneNumber
                      && (!scene.sceneVideoTakeId || segment.episodeId === scene.sceneVideoTakeId)
                    ));
                    const sceneBusy = improveSceneMut.isPending || (generateSceneVideoMut.isPending && generateSceneVideoMut.variables?.scene.id === scene.id) || scene.ttsStatus === 'generating';
                    return (
                    <div key={scene.id} className={`rounded-xl border p-4 ${scene.approved ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/10' : 'border-border bg-white'}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-dark">Scene {scene.sceneNumber}: {timestamp(scene.startSec)} - {timestamp(scene.endSec)}</p>
                          <p className="mt-1 text-xs text-muted">10-second segment with independent VO, prompt, TTS, and approval.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => moveScene(scene.id, -1)} disabled={index === 0} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:border-[var(--color-muted-olive)] disabled:opacity-35" aria-label="Move scene up">
                            <ArrowUp size={15} />
                          </button>
                          <button type="button" onClick={() => moveScene(scene.id, 1)} disabled={index === scenes.length - 1} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:border-[var(--color-muted-olive)] disabled:opacity-35" aria-label="Move scene down">
                            <ArrowDown size={15} />
                          </button>
                          <button type="button" onClick={() => deleteScene(scene.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:border-red-300 hover:text-red-600" aria-label="Delete scene">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
                        <SceneMarkdownEditor
                          label="Voice-Over Text"
                          value={scene.voiceOver}
                          placeholder="Write the spoken script for this 10-second scene. Markdown is supported."
                          onChange={(value) => updateScene(scene.id, { voiceOver: value })}
                        />
                        <SceneMarkdownEditor
                          label="Character @mention & Visual Prompt"
                          value={scene.visualPrompt}
                          placeholder="Write visual direction for this scene. Use @character handles and Markdown notes."
                          onChange={(value) => updateScene(scene.id, { visualPrompt: value, characterHandles: extractHandles(value) })}
                        />
                      </div>
                      <SceneDialogueTtsPanel
                        scene={scene}
                        characters={themeCharacterMentions}
                        characterProfiles={characterTtsProfiles}
                        narratorVoice={voiceProfile}
                        narratorTone={defaultTtsTone}
                        audioModel={audioModel}
                        onUpdateLine={(lineId, patch) => updateSceneDialogueLine(scene.id, lineId, patch)}
                        onAddLine={() => addSceneDialogueLine(scene.id)}
                        onRemoveLine={(lineId) => removeSceneDialogueLine(scene.id, lineId)}
                        onGenerateLine={(lineId) => handleSceneTtsLine(scene.id, lineId)}
                      />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-1.5">
                          {extractHandles(`${scene.visualPrompt} ${scene.voiceOver}`).length ? (
                            extractHandles(`${scene.visualPrompt} ${scene.voiceOver}`).map((handle) => (
                              <span key={handle} className="rounded-full bg-[var(--color-tea-green)]/40 px-2.5 py-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">{handle}</span>
                            ))
                          ) : (
                            <span className="text-xs text-muted">No character handles in this scene.</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-dark">
                            <input
                              type="checkbox"
                              checked={scene.sceneVideoAudioEnabled ?? soundEnabled}
                              onChange={(event) => updateScene(scene.id, { sceneVideoAudioEnabled: event.target.checked })}
                            />
                            Clip audio
                          </label>
                          <button type="button" onClick={() => handleImproveScene(scene)} disabled={sceneBusy || !textModel || !selectedModule} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-muted-olive)] px-3 py-2 text-xs font-semibold text-[var(--color-ash-brown)] disabled:opacity-45">
                            {improveSceneMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                            Improve Scene
                          </button>
                          <button type="button" onClick={() => handleSceneTts(scene.id)} disabled={!canUseSceneTts(scene) || sceneIsGeneratingTts(scene)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-muted-olive)] px-3 py-2 text-xs font-semibold text-[var(--color-ash-brown)] disabled:opacity-45">
                            {sceneIsGeneratingTts(scene) ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
                            {sceneHasReadyTts(scene) ? 'Add dialogue to timeline' : 'Generate first line'}
                          </button>
                          <button type="button" onClick={() => handleGenerateSceneVideo(scene)} disabled={!selectedModule || !videoModel || sceneVideoStatus === 'generating' || (generateSceneVideoMut.isPending && generateSceneVideoMut.variables?.scene.id === scene.id)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-ash-brown)] px-3 py-2 text-xs font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45">
                            {sceneVideoStatus === 'generating' || (generateSceneVideoMut.isPending && generateSceneVideoMut.variables?.scene.id === scene.id) ? <Loader2 size={14} className="animate-spin" /> : <MonitorPlay size={14} />}
                            Generate Scene Video
                          </button>
                          <button type="button" onClick={() => updateScene(scene.id, { approved: !scene.approved })} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${scene.approved ? 'bg-[var(--color-muted-olive)] text-[var(--color-vanilla-cream)]' : 'border border-border text-dark hover:border-[var(--color-muted-olive)]'}`}>
                            <CheckCircle2 size={14} /> {scene.approved ? 'Approved' : 'Approve Scene'}
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 rounded-xl border border-border bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-dark">Scene character references (video only)</p>
                            <p className="mt-0.5 text-[11px] text-muted">Pick saved visual variants for this scene&apos;s video generation. Dialogue speakers are set in the TTS panel above.</p>
                          </div>
                          <span className="rounded-full bg-[var(--color-tea-green)]/35 px-2 py-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">{sceneRefs.length} selected</span>
                        </div>
                        {themeCharacterRefs.length > 0 ? (
                          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                            {themeCharacterRefs.map((reference) => {
                              const checked = sceneRefIds.includes(reference.id);
                              return (
                                <button
                                  key={reference.id}
                                  type="button"
                                  onClick={() => toggleSceneCharacterReference(scene.id, reference.id)}
                                  className={`min-w-28 overflow-hidden rounded-lg border bg-white text-left ${checked ? 'border-[var(--color-muted-olive)] ring-2 ring-[var(--color-tea-green)]/50' : 'border-border'}`}
                                >
                                  <div className="aspect-video bg-[var(--color-tea-green)]/25">
                                    <img src={reference.url} alt={reference.label} className="h-full w-full object-cover" />
                                  </div>
                                  <div className="p-2">
                                    <p className="truncate text-[10px] font-semibold text-dark">{reference.handle}</p>
                                    <p className="truncate text-[10px] text-muted">{reference.label}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-muted">No theme character references are available yet.</p>
                        )}
                      </div>
                      {(sceneVideoUrl || sceneVideoStatus !== 'idle') && (
                        <div className="mt-3 rounded-xl border border-[var(--color-tea-green)] bg-white p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-dark">Scene Video</p>
                            <span className="text-[10px] font-semibold capitalize text-[var(--color-ash-brown)]">{sceneVideoStatus}</span>
                          </div>
                          {sceneVideoUrl ? (
                            <ProtectedStudioVideo key={`${scene.id}-${sceneVideoUrl}`} originUrl={sceneVideoUrl} className="aspect-video w-full" videoClassName="rounded-lg" />
                          ) : (
                            <div className="flex aspect-video items-center justify-center rounded-lg bg-[var(--color-ash-brown)] text-[var(--color-vanilla-cream)]">
                              {sceneVideoStatus === 'generating' ? <Loader2 size={24} className="animate-spin" /> : <MonitorPlay size={24} />}
                            </div>
                          )}
                          {linkedSceneDoc?.error && <p className="mt-2 text-xs leading-relaxed text-red-600">{linkedSceneDoc.error}</p>}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-5">
              <label className="block cursor-pointer rounded-xl border border-dashed border-[var(--color-tea-green)] p-5 text-center">
                <UploadCloud size={24} className="mx-auto text-[var(--color-ash-brown)]" />
                <p className="mt-2 text-sm font-semibold text-dark">Episode-Level Asset Bin</p>
                <p className="mt-1 text-xs text-muted">Upload image references needed only for this episode&apos;s specific scenes.</p>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addEpisodeAssets(e.target.files)} />
              </label>
              {assets.length > 0 && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {assets.map((asset) => (
                    <div key={asset.id} className="rounded-xl border border-border p-3">
                      <p className="truncate text-xs font-semibold text-dark">{asset.name}</p>
                      <input className="input-field mt-2 text-xs" value={asset.tag} onChange={(e) => setAssets((current) => current.map((item) => (item.id === asset.id ? { ...item, tag: e.target.value } : item)))} placeholder="Label what this reference represents" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          <VideoEditorWorkspace
            selectedModule={selectedModule}
            scenes={scenes.length > 0 ? scenes : scriptWorkflow === 'scenes' ? [] : buildSceneCards(title, basePrompt, duration, themeCharacterMentions, voiceProfile)}
            activeSegments={editorSegments}
            themeCharacterRefs={themeCharacterRefs}
            assets={assets}
            selectedSceneId={selectedTimelineSceneId}
            sceneSelectionVersion={sceneSelectionVersion}
            finalVideoUrl={finalVideoUrl}
            activeProgress={activeProgress}
            activeStatusText={activeEpisodeForModule?.progress?.phase?.replace(/_/g, ' ') ?? (activeEpisodeForModule?.status?.replace(/_/g, ' ') ?? 'No active render')}
            canRender={canRenderTimeline}
            isRendering={generateMediaMut.isPending || renderTimelineMut.isPending}
            renderDisabledReason={timelineRenderDisabledReason}
            soundEnabled={soundEnabled}
            audioModel={audioModel}
            videoModel={videoModel}
            videoModels={aiModels.video}
            moduleDestinations={platformLabels}
            transitions={timelineTransitions}
            sceneAudioMuted={sceneAudioMuted}
            audioLayers={timelineAudioLayers}
            reusableAudioAssets={reusableAudioAssets}
            brollLayers={timelineBrollLayers}
            onTransitionChange={updateTimelineTransition}
            onSceneAudioMuteChange={updateSceneAudioMuted}
            onAddAudioLayer={addTimelineAudioLayer}
            onUpdateAudioLayer={updateTimelineAudioLayer}
            onRemoveAudioLayer={removeTimelineAudioLayer}
            onAddBrollLayer={addTimelineBrollLayer}
            onUpdateBrollLayer={updateTimelineBrollLayer}
            onRemoveBrollLayer={removeTimelineBrollLayer}
            onUploadAudioFile={uploadTimelineAudioFile}
            onSelectScene={selectTimelineScene}
            onUpdateScene={updateScene}
            onGenerateSceneVideo={handleGenerateSceneVideo}
            onImproveScene={handleImproveScene}
            onGenerateSceneTts={handleSceneTts}
            onReorderScene={reorderScene}
            onRenderMaster={handleFinalGenerate}
            onVideoModelChange={setVideoModel}
          />

          <Panel title="6. Final Review & Automated Broadcasting" kicker="Inspect the stitched master asset, tweak the workspace if needed, then approve direct posting." icon={CheckCircle2}>
            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="min-h-[320px] rounded-xl border border-border bg-white p-4">
                {reviewState === 'generating' ? (
                  <div className="flex h-[280px] flex-col items-center justify-center text-center">
                    <Loader2 size={30} className="animate-spin text-[var(--color-ash-brown)]" />
                    <p className="mt-3 text-sm font-semibold text-dark">{mode === 'media' ? 'Stitching timeline with FFmpeg' : 'Synthesizing final output'}</p>
                    <p className="mt-1 text-xs text-muted">
                      {mode === 'media'
                        ? scriptWorkflow === 'scenes'
                          ? 'Compiling approved scene clips, per-scene character references, transitions, and the final episode master asset.'
                          : 'Compiling the approved scene clips, transition gaps, and final episode master asset.'
                        : `Translating the ${scriptWorkflow === 'script' ? 'approved script blueprint' : scriptWorkflow === 'scenes' ? 'approved scene cards' : 'base prompt'}, selected references, background style tuning, and episode assets with ${modelLabel(activeFinalModel, aiModels)}.`}
                    </p>
                  </div>
                ) : mode === 'media' ? (
                  <div className="space-y-4">
                    {finalVideoUrl ? (
                      <ProtectedStudioVideo originUrl={finalVideoUrl} className="w-full" videoClassName="rounded-xl border border-border" />
                    ) : (
                      <div className="flex aspect-video items-center justify-center rounded-xl border border-border bg-[var(--color-ash-brown)] text-center">
                        <div>
                          <MonitorPlay size={38} className="mx-auto text-[var(--color-vanilla-cream)]" />
                          <p className="mt-3 text-sm font-semibold text-[var(--color-vanilla-cream)]">Playback window</p>
                          <p className="mt-1 text-xs text-[var(--color-vanilla-cream)]/80">Final media appears here after generation.</p>
                        </div>
                      </div>
                    )}
                    <textarea
                      className="min-h-[130px] w-full resize-none rounded-lg border border-border bg-white p-3 text-sm leading-relaxed text-dark outline-none focus:border-[var(--color-muted-olive)]"
                      value={finalDraft}
                      onChange={(e) => {
                        setFinalDraft(e.target.value);
                        setReviewState('editing');
                      }}
                      placeholder="Generation notes, transcript, or manual edits appear here after synthesis."
                    />
                  </div>
                ) : (
                  <textarea
                    className="min-h-[280px] w-full resize-none rounded-lg border border-border bg-white p-3 text-sm leading-relaxed text-dark outline-none focus:border-[var(--color-muted-olive)]"
                    value={finalDraft}
                    onChange={(e) => {
                      setFinalDraft(e.target.value);
                      setReviewState('editing');
                    }}
                    placeholder="Rich-text review canvas appears here after generation."
                  />
                )}
              </div>

              <div className="space-y-3">
                <button type="button" onClick={() => handleFinalGenerate()} disabled={(mode === 'media' ? !canRenderTimeline : !canGenerateFinal) || generateMediaMut.isPending || renderTimelineMut.isPending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-4 py-3 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45">
                  {generateMediaMut.isPending || renderTimelineMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  {generateMediaMut.isPending || renderTimelineMut.isPending ? 'Sending to backend...' : mode === 'media' ? 'Render Timeline MP4' : 'Generate Text'}
                </button>
                {generateDisabledReason && <p className="text-xs leading-relaxed text-[var(--color-faded-copper)]">{generateDisabledReason}</p>}
                <button type="button" onClick={() => handleFinalGenerate()} disabled={!selectedModule || reviewState === 'generating' || generateMediaMut.isPending || renderTimelineMut.isPending} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-dark hover:border-[var(--color-muted-olive)] disabled:opacity-45">
                  <RefreshCcw size={16} /> Regenerate
                </button>
                <button type="button" onClick={() => setReviewState('editing')} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-dark hover:border-[var(--color-muted-olive)]">
                  <FileText size={16} /> Manually Tweak Workspace
                </button>
                <div className="rounded-xl border border-[var(--color-tea-green)] bg-white p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Platform Website</p>
                      <p className="mt-1 text-sm font-semibold text-dark">
                        {isWebsitePublished ? 'Published on website' : 'Publish out of draft first'}
                      </p>
                    </div>
                    {publishWebsiteMut.isPending && <Loader2 size={16} className="animate-spin text-[var(--color-ash-brown)]" />}
                  </div>
                  <p className="text-xs leading-relaxed text-muted">
                    Website publishing exposes only module cover media, episode cover images, and social platform badges.
                  </p>
                    <button
                      type="button"
                      onClick={handlePublishWebsite}
                    disabled={!canPublishWebsite}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-4 py-3 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45"
                    >
                      {publishWebsiteMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <FileCheck2 size={16} />}
                    {publishWebsiteMut.isPending ? 'Publishing website...' : isWebsitePublished ? 'Sync Website Story' : 'Publish to Platform Website'}
                    </button>
                </div>
                <div className="rounded-xl border border-[var(--color-tea-green)] bg-white p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Manual Publishing</p>
                      <p className="mt-1 text-sm font-semibold text-dark">Post stitched episode to a linked channel</p>
                    </div>
                    {publishEpisodeMut.isPending && <Loader2 size={16} className="animate-spin text-[var(--color-ash-brown)]" />}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['youtube', 'tiktok', 'instagram'] as PublishPlatform[]).map((platform) => {
                      const connected = platform === 'youtube' ? youtubeConnection : platform === 'tiktok' ? tiktokConnection : instagramConnection;
                      const alreadyPublished = Boolean(episodeSocialPosts.some((post) => post.platform === platform)) || (platform === 'youtube' && Boolean(activeEpisode?.youtubeVideoId));
                      return (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => setPublishPlatform(platform)}
                          className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold capitalize transition-colors ${
                            alreadyPublished
                              ? 'border-[var(--color-muted-olive)] bg-[var(--color-muted-olive)]/15 text-[var(--color-ash-brown)]'
                              : publishPlatform === platform
                              ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/35 text-[var(--color-ash-brown)]'
                              : 'border-border bg-white text-muted hover:border-[var(--color-muted-olive)]'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1">
                            {alreadyPublished && <CheckCircle2 size={12} />}
                            {publishPlatformLabel(platform)}
                          </span>
                          <span className="mt-1 block text-[10px] font-medium normal-case">
                            {alreadyPublished ? 'Published' : connected ? `Linked ${socialConnectionLabel(connected)}` : 'Not linked'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    className="mt-3 min-h-[86px] w-full resize-none rounded-lg border border-border bg-white p-3 text-xs leading-relaxed text-dark outline-none focus:border-[var(--color-muted-olive)]"
                    value={publishDescription}
                    onChange={(event) => setPublishDescription(event.target.value)}
                    placeholder="Custom social caption/description for this post. If empty, a clean description is generated from the episode title, base idea, and module."
                  />
                  <p className="mt-1 text-[10px] leading-relaxed text-muted">
                    Internal render notes are never sent as social descriptions.
                  </p>
                  <button
                    type="button"
                    onClick={handlePublishEpisode}
                    disabled={!canPublishEpisode}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-ash-brown)] px-4 py-3 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45"
                  >
                    {publishEpisodeMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {publishEpisodeMut.isPending ? 'Publishing...' : `Publish to ${publishPlatformLabel(publishPlatform)}`}
                  </button>
                  {publishDisabledReason && <p className="mt-2 text-xs leading-relaxed text-[var(--color-faded-copper)]">{publishDisabledReason}</p>}
                  {((episodeSocialPosts.length ?? 0) > 0 || activeEpisode?.youtubeVideoId) && (
                    <div className="mt-3 space-y-1.5">
                      {episodeSocialPosts.map((post) => (
                        post.postUrl ? (
                          <a
                            key={`${post.platform}-${post.postUrl}`}
                            href={post.postUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-tea-green)] bg-[var(--color-tea-green)]/15 px-3 py-2 text-xs font-semibold text-[var(--color-muted-olive)] hover:text-[var(--color-ash-brown)]"
                          >
                            <span>View {publishPlatformLabel(post.platform)} post</span>
                            <CheckCircle2 size={14} />
                          </a>
                        ) : (
                          <div
                            key={`${post.platform}-${post.postId ?? post.publishedAt ?? 'posted'}`}
                            className="rounded-lg border border-border bg-white px-3 py-2 text-xs text-muted"
                          >
                            <span className="font-semibold text-[var(--color-ash-brown)]">{publishPlatformLabel(post.platform)}:</span>{' '}
                            {post.postId ? `Publish id ${post.postId}` : post.status ?? 'Published'}
                          </div>
                        )
                      ))}
                      {activeEpisode?.youtubeVideoId && !episodeSocialPosts.some((post) => post.platform === 'youtube') && (
                        <a
                          href={`https://www.youtube.com/watch?v=${activeEpisode.youtubeVideoId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-tea-green)] bg-[var(--color-tea-green)]/15 px-3 py-2 text-xs font-semibold text-[var(--color-muted-olive)] hover:text-[var(--color-ash-brown)]"
                        >
                          <span>View YouTube post</span>
                          <CheckCircle2 size={14} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-[var(--color-tea-green)] bg-white p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Workflow State</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-dark">{reviewState.replace('-', ' ')}</p>
                </div>
                <div className="rounded-xl border border-border bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Episode Render</p>
                      <p className="mt-1 text-sm font-semibold capitalize text-dark">
                        {activeEpisodeForModule?.status?.replace(/_/g, ' ') ?? 'No episode selected'}
                      </p>
                    </div>
                    {activeEpisodeForModule?.status === 'generating' && <Loader2 size={16} className="animate-spin text-[var(--color-ash-brown)]" />}
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-tea-green)]/35">
                    <div className="h-full rounded-full bg-[var(--color-muted-olive)] transition-[width]" style={{ width: `${Math.min(100, Math.max(0, activeProgress))}%` }} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {activeEpisodeForModule
                      ? `${activeEpisodeForModule.progress?.phase?.replace(/_/g, ' ') ?? activeEpisodeForModule.status}${activeEpisodeForModule.progress?.scene ? ` ┬╖ ${activeEpisodeForModule.progress.scene}/${activeEpisodeForModule.progress.totalScenes}` : ''}`
                      : 'Select or create an episode for this module to track render progress.'}
                  </p>
                  {activeSegments.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      {activeSegments.map((segment) => (
                        <button
                          key={segment.sceneNumber}
                          type="button"
                          onClick={() => {
                            const scene = scenes.find((item) => item.sceneNumber === segment.sceneNumber);
                            if (scene) setSelectedTimelineSceneId(scene.id);
                          }}
                          className={`rounded-md px-2 py-1 text-[10px] font-semibold ${segment.status === 'ready' ? 'bg-[var(--color-muted-olive)] text-[var(--color-vanilla-cream)]' : segment.status === 'failed' ? 'bg-red-100 text-red-700' : segment.status === 'generating' ? 'bg-[var(--color-faded-copper)]/20 text-[var(--color-ash-brown)]' : 'bg-[var(--color-tea-green)]/30 text-[var(--color-ash-brown)]'}`}
                        >
                          Scene {segment.sceneNumber}
                        </button>
                      ))}
                    </div>
                  )}
                  {activeEpisodeForModule?.lastError && <p className="mt-2 text-xs text-red-600">{activeEpisodeForModule.lastError}</p>}
                </div>
              </div>
            </div>
          </Panel>
        </main>
      </div>
    </div>
  );
}
