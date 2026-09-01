import apiClient from "@/lib/axios";
import { normalizeToneDirection } from "@/lib/ttsToneDirection";

/** All paths are relative to studio `/api/v1` (see `VITE_STUDIO_API_URL`). Called directly — no gateway. */

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ReferenceImage {
  cloudinaryUrl: string;
  s3Key: string;
  s3Url: string;
  publicId: string;
}

export interface VideoRendition {
  videoUrl: string;
  masterVideoCloudinaryUrl?: string;
  masterVideoS3Url?: string;
  masterVideoPublicId?: string;
  masterVideoS3Key?: string;
  createdAt: string;
}

export interface VideoTakeProgress {
  phase?: string;
  segment?: number;
  totalSegments?: number;
  pct?: number;
}

export interface VideoTakeSegment {
  sceneNumber: number;
  startSec: number;
  endSec: number;
  status: "queued" | "generating" | "ready" | "failed";
  taskId?: string;
  videoUrl?: string;
  cloudinaryUrl?: string;
  s3Url?: string;
  s3Key?: string;
  publicId?: string;
  error?: string;
  updatedAt?: string;
}

export interface VideoTake {
  _id: string;
  status: "queued" | "generating" | "ready" | "failed";
  progress?: VideoTakeProgress;
  klingLongFormPending?: boolean;
  klingTaskId?: string;
  klingJobKind?: "text2video" | "image2video";
  lastError?: string;
  videoUrl?: string;
  masterVideoCloudinaryUrl?: string;
  masterVideoS3Url?: string;
  segments?: VideoTakeSegment[];
  sceneOnly?: boolean;
  createdAt?: string;
}

export interface ContentModule {
  _id: string;
  title: string;
  themeLine: string;
  genre: string;
  creativePrompt: string;
  durationSeconds: number;
  soundEnabled: boolean;
  generationMode: "text2video" | "image2video";
  referenceImages: ReferenceImage[];
  status: "draft" | "generating" | "ready" | "published" | "failed";
  klingLongFormPending?: boolean;
  klingTaskId?: string;
  klingJobKind?: "text2video" | "image2video";
  videoUrl?: string;
  masterVideoCloudinaryUrl?: string;
  masterVideoS3Url?: string;
  videoRenditions?: VideoRendition[];
  videoTakes?: VideoTake[];
  coverImageUrl?: string;
  coverVideoUrl?: string;
  publishedPlatforms?: Array<"youtube" | "tiktok" | "instagram">;
  publishedAt?: string;
  videoProvider?: "kling" | "openai" | "veo" | "xai";
  openaiVideoId?: string;
  openaiVideoModel?: "sora-2" | "sora-2-pro";
  veoOperationJson?: string;
  lastError?: string;
  storyId?: string;
  themeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentEpisode {
  _id: string;
  moduleId: string;
  themeId?: string;
  title: string;
  basePrompt: string;
  outputMode: "text" | "media";
  generationModel: string;
  videoProvider?: "kling" | "openai" | "veo" | "xai";
  durationSeconds: number;
  soundEnabled: boolean;
  status: "draft" | "queued" | "generating" | "ready" | "failed" | "published";
  progress?: { phase?: string; scene?: number; totalScenes?: number; pct?: number };
  thumbnailLabel?: string;
  thumbnailUrl?: string;
  episodeVideoUrl?: string;
  masterVideoCloudinaryUrl?: string;
  masterVideoS3Url?: string;
  youtubeVideoId?: string;
  publishedPlatform?: "youtube" | "tiktok" | "instagram";
  publishedPlatforms?: Array<"youtube" | "tiktok" | "instagram">;
  publishedPlatformDetails?: SocialPost[];
  socialPosts?: SocialPost[];
  publishedAt?: string;
  textOutput?: string;
  sceneOnly?: boolean;
  lastError?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContentEpisodeScene {
  _id: string;
  episodeId: string;
  moduleId: string;
  sceneNumber: number;
  startSec: number;
  endSec: number;
  voiceOver: string;
  visualPrompt: string;
  characterHandles: string[];
  referenceAssets?: Array<{ name: string; tag?: string; url?: string; s3Url?: string; s3Key?: string; publicId?: string; characterHandle?: string }>;
  provider?: "kling" | "openai" | "veo" | "xai";
  status: "queued" | "generating" | "ready" | "failed";
  taskId?: string;
  videoUrl?: string;
  cloudinaryUrl?: string;
  s3Url?: string;
  s3Key?: string;
  publicId?: string;
  ttsAudioUrl?: string;
  ttsLabel?: string;
  voiceProfile?: string;
  ttsLines?: Array<{
    id: string;
    speaker?: string;
    text: string;
    voiceProfile?: string;
    tonePreset?: string;
    toneDirection?: string;
    tonePace?: string;
    tonePitch?: number;
    audioUrl?: string;
    label?: string;
    audioModel?: string;
  }>;
  error?: string;
}

export interface ContentTheme {
  _id: string;
  title: string;
  slug: string;
  authorName: string;
  defaultGenre?: string;
  defaultStoryPrompt?: string;
  referenceImages?: ReferenceImage[];
  createdAt: string;
  updatedAt: string;
}

export interface SocialConnection {
  platform: "youtube" | "tiktok" | "instagram";
  channelId?: string;
  openId?: string;
  displayName?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface SocialPost {
  platform: "youtube" | "tiktok" | "instagram";
  postId?: string;
  postUrl?: string;
  status?: string;
  publishedAt?: string;
}

export interface AiModelOption {
  value: string;
  label: string;
  provider: "openai" | "anthropic" | "google" | "xai" | "kling" | "elevenlabs";
  providerLabel: string;
}

export interface AvailableAiModels {
  text: AiModelOption[];
  image: AiModelOption[];
  video: AiModelOption[];
  audio: AiModelOption[];
}

export interface TtsVoiceOption {
  value: string;
  label: string;
  provider: "elevenlabs" | "google" | "studio";
  providerLabel: string;
  language?: string;
  gender?: string;
}

export const listTtsVoices = async (): Promise<TtsVoiceOption[]> => {
  const { data } = await apiClient.get<ApiResponse<{ voices: TtsVoiceOption[] }>>("/content/tts/voices");
  return data.data.voices;
};

export type ContentStudioDraftKind = "module" | "theme" | "episode";

export interface ContentStudioDraft<T = unknown> {
  kind: ContentStudioDraftKind;
  payload: T | null;
  updatedAt: string | null;
}

export const getContentStudioDraft = async <T>(
  kind: ContentStudioDraftKind,
): Promise<ContentStudioDraft<T>> => {
  const { data } = await apiClient.get<ApiResponse<ContentStudioDraft<T>>>(
    `/content/drafts/${kind}`,
  );
  return data.data;
};

export const saveContentStudioDraft = async <T extends Record<string, unknown>>(
  kind: ContentStudioDraftKind,
  payload: T,
): Promise<ContentStudioDraft<T>> => {
  const { data } = await apiClient.put<ApiResponse<ContentStudioDraft<T>>>(
    `/content/drafts/${kind}`,
    { payload },
  );
  return data.data;
};

export const listAvailableAiModels = async (): Promise<AvailableAiModels> => {
  const { data } = await apiClient.get<
    ApiResponse<{ models: Partial<AvailableAiModels> }>
  >("/content/ai-providers/capabilities");
  return {
    text: data.data.models.text ?? [],
    image: data.data.models.image ?? [],
    video: data.data.models.video ?? [],
    audio: data.data.models.audio ?? [],
  };
};

export interface EpisodeGeneratedImage {
  model: string;
  prompt: string;
  image: MediaUploadResult;
}

export interface MediaUploadResult {
  cloudinaryUrl: string;
  s3Key: string;
  s3Url: string;
  publicId: string;
  format: string;
}

export const generateEpisodeImage = async (payload: {
  prompt: string;
  model: string;
  moduleId?: string;
  selectedCharacterRefIds?: string[];
}): Promise<EpisodeGeneratedImage> => {
  const { data } = await apiClient.post<
    ApiResponse<EpisodeGeneratedImage>
  >("/content/episodes/images/generate", payload, {
    timeout: 120_000,
  });
  return data.data;
};

export const uploadEpisodeImage = async (file: File): Promise<MediaUploadResult> => {
  const form = new FormData();
  form.append("image", file);
  const { data } = await apiClient.post<ApiResponse<{ image: MediaUploadResult }>>(
    "/content/episodes/images/upload",
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
    },
  );
  return data.data.image;
};

export const saveEpisodeThumbnail = async (payload: {
  episodeId?: string;
  moduleId: string;
  title: string;
  basePrompt?: string;
  outputMode?: "text" | "media";
  generationModel?: string;
  durationSeconds?: number;
  soundEnabled?: boolean;
  thumbnailUrl: string;
  thumbnailLabel?: string;
}): Promise<ContentEpisode> => {
  const { data } = await apiClient.post<ApiResponse<{ episode: ContentEpisode }>>(
    "/content/episodes/thumbnails/save",
    payload,
  );
  return data.data.episode;
};

export const generateModuleCoverImage = async (
  id: string,
  payload: {
    prompt: string;
    model: string;
  },
): Promise<EpisodeGeneratedImage & { module: ContentModule }> => {
  const { data } = await apiClient.post<
    ApiResponse<EpisodeGeneratedImage & { module: ContentModule }>
  >(`/content/modules/${id}/cover/image/generate`, payload, {
    timeout: 120_000,
  });
  return data.data;
};

export interface EpisodeRefinedImagePrompt {
  model: string;
  prompt: string;
}

export const refineEpisodeImagePrompt = async (payload: {
  prompt: string;
  model: string;
  moduleId?: string;
}): Promise<EpisodeRefinedImagePrompt> => {
  const { data } = await apiClient.post<ApiResponse<EpisodeRefinedImagePrompt>>(
    "/content/episodes/images/refine-prompt",
    payload,
    {
      timeout: 120_000,
    },
  );
  return data.data;
};

export interface EpisodeGeneratedScript {
  model: string;
  script: string;
  context: {
    moduleId: string;
    moduleTitle: string;
    themeId?: string;
    themeTitle?: string;
    routingDestinations: string[];
  };
}

export const generateEpisodeScript = async (payload: {
  moduleId: string;
  title: string;
  basePrompt: string;
  durationSeconds: number;
  model: string;
}): Promise<EpisodeGeneratedScript> => {
  const { data } = await apiClient.post<ApiResponse<EpisodeGeneratedScript>>(
    "/content/episodes/scripts/generate",
    payload,
    {
      timeout: 120_000,
    },
  );
  return data.data;
};

export interface EpisodeGeneratedTts {
  sceneId?: string;
  model: string;
  voiceProfile: string;
  voiceId: string;
  text: string;
  audio: MediaUploadResult;
}

export type ContentAudioKind = "tts" | "upload" | "mic" | "music" | "sfx";
export type ContentAudioScope = "workspace" | "public";

export interface ReusableAudioAsset {
  _id: string;
  label: string;
  kind: ContentAudioKind;
  scope: ContentAudioScope;
  url: string;
  cloudinaryUrl?: string;
  s3Url?: string;
  s3Key?: string;
  publicId?: string;
  mimeType?: string;
  source?: string;
  durationSec?: number;
  createdAt: string;
}

export const generateEpisodeTts = async (payload: {
  sceneId?: string;
  ttsLineId?: string;
  episodeId?: string;
  sceneNumber?: number;
  speaker?: string;
  text: string;
  model: string;
  voiceProfile: string;
  tonePreset?: string;
  toneDirection?: string;
  tonePace?: string;
  tonePitch?: number;
  ttsLabel?: string;
}): Promise<EpisodeGeneratedTts> => {
  const toneDirection = normalizeToneDirection(payload.toneDirection);
  const body = {
    ...payload,
    ...(toneDirection ? { toneDirection } : {}),
  };
  if (!toneDirection) {
    delete body.toneDirection;
  }
  const { data } = await apiClient.post<ApiResponse<EpisodeGeneratedTts>>(
    "/content/episodes/tts/generate",
    body,
    {
      timeout: 120_000,
    },
  );
  return data.data;
};

export const uploadEpisodeAudio = async (
  file: File,
  kind: ContentAudioKind,
  options?: { saveToLibrary?: boolean; scope?: ContentAudioScope; label?: string },
): Promise<MediaUploadResult & { libraryAsset?: ReusableAudioAsset }> => {
  const form = new FormData();
  form.append("audio", file);
  form.append("kind", kind);
  if (options?.saveToLibrary) form.append("saveToLibrary", "true");
  if (options?.scope) form.append("scope", options.scope);
  if (options?.label) form.append("label", options.label);
  const { data } = await apiClient.post<ApiResponse<{ audio: MediaUploadResult; libraryAsset?: ReusableAudioAsset }>>(
    "/content/episodes/audio/upload",
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 180_000,
    },
  );
  return { ...data.data.audio, libraryAsset: data.data.libraryAsset };
};

export const listReusableAudioAssets = async (kind?: ContentAudioKind): Promise<ReusableAudioAsset[]> => {
  const { data } = await apiClient.get<ApiResponse<{ assets: ReusableAudioAsset[] }>>(
    "/content/episodes/audio/library",
    { params: kind ? { kind } : undefined },
  );
  return data.data.assets;
};

export interface EpisodeImprovedScene {
  sceneId: string;
  voiceOver: string;
  visualPrompt: string;
}

export const improveEpisodeScene = async (payload: {
  moduleId: string;
  title: string;
  basePrompt: string;
  model: string;
  scene: {
    id: string;
    sceneNumber: number;
    startSec: number;
    endSec: number;
    voiceOver: string;
    visualPrompt: string;
    characterHandles: string[];
  };
}): Promise<EpisodeImprovedScene> => {
  const { data } = await apiClient.post<ApiResponse<EpisodeImprovedScene>>(
    "/content/episodes/scenes/improve",
    payload,
    { timeout: 120_000 },
  );
  return data.data;
};

export const generateEpisodeSceneVideo = async (payload: {
  moduleId: string;
  title: string;
  basePrompt: string;
  model: string;
  soundEnabled?: boolean;
  scene: {
    id: string;
    sceneNumber: number;
    startSec: number;
    endSec: number;
    voiceOver: string;
    visualPrompt: string;
    characterHandles: string[];
    selectedCharacterRefIds?: string[];
    referenceAssets?: Array<{ name: string; tag?: string; url?: string; s3Url?: string; s3Key?: string; publicId?: string; characterHandle?: string }>;
    approved?: boolean;
    videoAudioEnabled?: boolean;
    ttsEnabled?: boolean;
    voiceProfile?: string;
    audioModel?: string;
    ttsAudioUrl?: string;
    ttsLabel?: string;
  };
  assets?: Array<{ name: string; tag?: string; url?: string; s3Url?: string; s3Key?: string; publicId?: string; characterHandle?: string }>;
}): Promise<EpisodeGeneratedMedia> => {
  const { data } = await apiClient.post<ApiResponse<EpisodeGeneratedMedia>>(
    "/content/episodes/scenes/video/generate",
    payload,
    { timeout: 600_000 },
  );
  return data.data;
};

export interface EpisodeGeneratedMedia {
  outputMode: "text" | "media";
  model: string;
  prompt: string;
  text?: string;
  module?: ContentModule;
  episode?: ContentEpisode;
  episodeId?: string;
  takeId?: string;
  status: "ready" | "generating" | "queued";
  scenes?: ContentEpisodeScene[];
}

export const generateEpisodeMedia = async (payload: {
  moduleId: string;
  title: string;
  basePrompt: string;
  approvedScript?: string;
  durationSeconds: number;
  soundEnabled?: boolean;
  outputMode: "text" | "media";
  model: string;
  thumbnailLabel?: string;
  thumbnailUrl?: string;
  assets?: Array<{ name: string; tag?: string; url?: string; s3Url?: string; s3Key?: string; publicId?: string; characterHandle?: string }>;
  loras?: Array<{ id: string; label: string; category?: string; weight: number }>;
  scenes?: Array<{ id: string; sceneNumber: number; startSec: number; endSec: number; voiceOver: string; visualPrompt: string; characterHandles: string[]; selectedCharacterRefIds?: string[]; referenceAssets?: Array<{ name: string; tag?: string; url?: string; s3Url?: string; s3Key?: string; publicId?: string; characterHandle?: string }>; approved: boolean; ttsEnabled?: boolean; voiceProfile?: string; audioModel?: string; ttsAudioUrl?: string; ttsLabel?: string; ttsLines?: Array<{ id: string; speaker?: string; text: string; voiceProfile?: string; tonePreset?: string; toneDirection?: string; tonePace?: string; tonePitch?: number; status?: 'idle' | 'generating' | 'ready'; audioUrl?: string; label?: string }> }>;
}): Promise<EpisodeGeneratedMedia> => {
  const { data } = await apiClient.post<ApiResponse<EpisodeGeneratedMedia>>(
    "/content/episodes/media/generate",
    payload,
    {
      timeout: 600_000,
    },
  );
  return data.data;
};

export interface EpisodeTimelineRenderResult {
  episode: ContentEpisode;
  scenes: ContentEpisodeScene[];
  videoUrl: string;
}

export const renderEpisodeTimeline = async (payload: {
  moduleId: string;
  title: string;
  basePrompt?: string;
  durationSeconds: number;
  soundEnabled?: boolean;
  thumbnailLabel?: string;
  thumbnailUrl?: string;
  scenes: Array<{
    sceneNumber: number;
    startSec: number;
    endSec: number;
    videoUrl: string;
    transition?: "cut" | "dissolve" | "wipe" | "fade-black" | "slide-left" | "zoom";
    transitionDuration?: number;
    sourceAudioMuted?: boolean;
    voiceOver?: string;
    visualPrompt?: string;
    characterHandles?: string[];
  }>;
  audioLayers?: Array<{
    id?: string;
    kind?: "tts" | "upload" | "mic" | "music" | "sfx";
    label?: string;
    url: string;
    startSec: number;
    endSec: number;
    volume: number;
    muted?: boolean;
  }>;
}): Promise<EpisodeTimelineRenderResult> => {
  const { data } = await apiClient.post<ApiResponse<EpisodeTimelineRenderResult>>(
    "/content/episodes/timeline/render",
    payload,
    {
      timeout: 900_000,
    },
  );
  return data.data;
};

export const listContentEpisodes = async (params?: {
  moduleId?: string;
  status?: ContentEpisode["status"];
}): Promise<ContentEpisode[]> => {
  const { data } = await apiClient.get<
    ApiResponse<{ episodes: ContentEpisode[] }>
  >("/content/episodes", { params });
  return data.data.episodes;
};

export const getContentEpisode = async (
  id: string,
): Promise<{ episode: ContentEpisode; scenes: ContentEpisodeScene[] }> => {
  const { data } = await apiClient.get<
    ApiResponse<{ episode: ContentEpisode; scenes: ContentEpisodeScene[] }>
  >(`/content/episodes/${id}`);
  return data.data;
};

export const listContentModules = async (): Promise<ContentModule[]> => {
  const { data } =
    await apiClient.get<ApiResponse<{ modules: ContentModule[] }>>(
      "/content/modules",
    );
  return data.data.modules;
};

export const createContentModule = async (payload: {
  title: string;
  themeLine: string;
  genre: string;
  creativePrompt: string;
  durationSeconds?: number;
  soundEnabled?: boolean;
  generationMode?: "text2video" | "image2video";
  storyId?: string;
  themeId?: string;
}): Promise<ContentModule> => {
  const { data } = await apiClient.post<ApiResponse<{ module: ContentModule }>>(
    "/content/modules",
    payload,
  );
  return data.data.module;
};

export const updateContentModule = async (
  id: string,
  payload: Partial<{
    title: string;
    status: ContentModule["status"];
    themeLine: string;
    genre: string;
    creativePrompt: string;
    durationSeconds: number;
    soundEnabled: boolean;
    generationMode: "text2video" | "image2video";
    storyId: string | null;
    themeId: string | null;
    coverImageUrl: string;
    coverVideoUrl: string;
    videoProvider: "kling" | "openai" | "veo";
    openaiVideoModel: "sora-2" | "sora-2-pro";
  }>,
): Promise<ContentModule> => {
  const { data } = await apiClient.patch<
    ApiResponse<{ module: ContentModule }>
  >(`/content/modules/${id}`, payload);
  return data.data.module;
};

export const uploadModuleReferences = async (
  id: string,
  files: File[],
): Promise<ContentModule> => {
  const form = new FormData();
  files.forEach((f) => form.append("images", f));
  const { data } = await apiClient.post<ApiResponse<{ module: ContentModule }>>(
    `/content/modules/${id}/references`,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return data.data.module;
};

export const generateModuleVideo = async (
  id: string,
  payload?: {
    durationSeconds?: number;
    soundEnabled?: boolean;
    generationMode?: "text2video" | "image2video";
    videoProvider?: "kling" | "openai" | "veo";
    openaiVideoModel?: "sora-2" | "sora-2-pro";
    coverVideoPrompt?: string;
  },
): Promise<ContentModule> => {
  const { data } = await apiClient.post<ApiResponse<{ module: ContentModule }>>(
    `/content/modules/${id}/generate`,
    payload ?? {},
  );
  return data.data.module;
};

/** @deprecated use generateModuleVideo */
export const generateKling = generateModuleVideo;

export interface EpisodeStatusResult {
  module: ContentModule;
  episode?: ContentEpisode;
  scenes?: ContentEpisodeScene[];
}

export const pollKlingStatus = async (id: string): Promise<EpisodeStatusResult> => {
  const { data } = await apiClient.get<ApiResponse<EpisodeStatusResult>>(
    `/content/modules/${id}/kling-status`,
    {
      timeout: 300_000,
    },
  );
  return data.data;
};

export const getSocialConnectUrls = async (): Promise<{
  youtube: string | null;
  tiktok: string | null;
  instagram: string | null;
  tiktokRedirectUri?: string | null;
  instagramRedirectUri?: string | null;
  instagramOAuthMode?: "instagram" | "facebook";
  state: string;
}> => {
  const { data } = await apiClient.get<
    ApiResponse<{
      youtube: string | null;
      tiktok: string | null;
      instagram: string | null;
      tiktokRedirectUri?: string | null;
      instagramRedirectUri?: string | null;
      instagramOAuthMode?: "instagram" | "facebook";
      state: string;
    }>
  >("/content/social/connect-urls");
  return data.data;
};

export const listSocialConnections = async (): Promise<SocialConnection[]> => {
  const { data } = await apiClient.get<
    ApiResponse<{ connections: SocialConnection[] }>
  >("/content/social/connections");
  return data.data.connections;
};

export const disconnectSocialConnection = async (
  platform: SocialConnection["platform"],
): Promise<void> => {
  await apiClient.delete(`/content/social/connections/${platform}`);
};

export interface PublishModuleResult {
  moduleId: string;
  platform: "youtube" | "tiktok" | "instagram";
  title: string;
  description: string;
  videoUrl: string;
  youtubeVideoId?: string | null;
  tiktokPublishId?: string | null;
  instagramMediaId?: string | null;
  postId?: string | null;
  postUrl?: string | null;
  publishStatus?: string | null;
  publishedPlatformDetails?: SocialPost[];
  socialPosts?: SocialPost[];
  connectedChannel?: string | null;
  youtubePlaylistId?: string | null;
}

export const publishModule = async (
  id: string,
  payload: {
    platform: "youtube" | "tiktok" | "instagram";
    title: string;
    description?: string;
    youtubePlaylistId?: string;
  },
): Promise<{ message: string; result: PublishModuleResult }> => {
  const { data } = await apiClient.post<ApiResponse<PublishModuleResult>>(
    `/content/modules/${id}/publish`,
    payload,
    {
      timeout: 600_000,
    },
  );
  return { message: data.message, result: data.data };
};

export interface PublishEpisodeResult extends PublishModuleResult {
  episodeId: string;
}

export const publishEpisode = async (
  id: string,
  payload: {
    platform: "youtube" | "tiktok" | "instagram";
    title: string;
    description?: string;
    youtubePlaylistId?: string;
  },
): Promise<{ message: string; result: PublishEpisodeResult }> => {
  const { data } = await apiClient.post<ApiResponse<PublishEpisodeResult>>(
    `/content/episodes/${id}/publish`,
    payload,
    {
      timeout: 600_000,
    },
  );
  return { message: data.message, result: data.data };
};

export const publishEpisodeToWebsite = async (
  id: string,
): Promise<{ episode: ContentEpisode; scenes: ContentEpisodeScene[] }> => {
  const { data } = await apiClient.post<
    ApiResponse<{ episode: ContentEpisode; scenes: ContentEpisodeScene[] }>
  >(`/content/episodes/${id}/publish-website`);
  return data.data;
};

export const listThemes = async (): Promise<ContentTheme[]> => {
  const { data } =
    await apiClient.get<ApiResponse<{ themes: ContentTheme[] }>>(
      "/content/themes",
    );
  return data.data.themes;
};

export const createTheme = async (payload: {
  title: string;
  slug: string;
  authorName: string;
  defaultGenre?: string;
  defaultStoryPrompt?: string;
}): Promise<ContentTheme> => {
  const { data } = await apiClient.post<ApiResponse<{ theme: ContentTheme }>>(
    "/content/themes",
    payload,
  );
  return data.data.theme;
};

export const updateTheme = async (
  id: string,
  payload: Partial<{
    title: string;
    slug: string;
    authorName: string;
    defaultGenre: string;
    defaultStoryPrompt: string;
  }>,
): Promise<ContentTheme> => {
  const { data } = await apiClient.patch<ApiResponse<{ theme: ContentTheme }>>(
    `/content/themes/${id}`,
    payload,
  );
  return data.data.theme;
};

export const deleteTheme = async (id: string): Promise<void> => {
  await apiClient.delete(`/content/themes/${id}`);
};

export const uploadThemeReferences = async (
  id: string,
  files: File[],
): Promise<ContentTheme> => {
  const form = new FormData();
  files.forEach((f) => form.append("images", f));
  const { data } = await apiClient.post<ApiResponse<{ theme: ContentTheme }>>(
    `/content/themes/${id}/references`,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return data.data.theme;
};

export const deleteContentModule = async (id: string): Promise<void> => {
  await apiClient.delete(`/content/modules/${id}`);
};

export interface YoutubePlaylistListItem {
  id: string;
  title: string;
  description?: string;
  itemCount?: number;
}

export const listYoutubePlaylists = async (): Promise<
  YoutubePlaylistListItem[]
> => {
  const { data } = await apiClient.get<
    ApiResponse<{ playlists: YoutubePlaylistListItem[] }>
  >("/content/youtube/playlists");
  return data.data.playlists;
};

export const createYoutubePlaylist = async (payload: {
  title: string;
  description?: string;
}): Promise<{
  playlist: { id: string; title: string };
  playlistUrl: string;
}> => {
  const { data } = await apiClient.post<
    ApiResponse<{
      playlist: { id: string; title: string };
      playlistUrl: string;
    }>
  >("/content/youtube/playlists", payload);
  return data.data;
};

export interface EditorStory {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  themeTitle?: string;
  authorName?: string;
  fullStoryUrl?: string;
  published: boolean;
  sortOrder: number;
  firstVideoModuleId?: string;
  firstAdCloudinaryUrl?: string;
  firstAdLinkUrl?: string;
  playlistModuleIds?: string[];
  websiteEpisodeLimit?: number;
  youtubePlaylistUrl?: string;
  aiStoryPrompt?: string;
  seoTitle?: string;
  seoDescription?: string;
  noIndex?: boolean;
  viewCount?: number;
  coverImageUrl?: string;
  coverVideoUrl?: string;
}

export const listEditorStories = async (): Promise<EditorStory[]> => {
  const { data } =
    await apiClient.get<ApiResponse<{ stories: EditorStory[] }>>(
      "/content/stories",
    );
  return data.data.stories;
};

export const createEditorStory = async (payload: {
  title: string;
  slug: string;
  summary: string;
  themeTitle?: string;
  authorName?: string;
  fullStoryUrl?: string;
  published?: boolean;
  sortOrder?: number;
  firstVideoModuleId?: string;
  firstAdLinkUrl?: string;
  playlistModuleIds?: string[];
  websiteEpisodeLimit?: number;
  youtubePlaylistUrl?: string;
  aiStoryPrompt?: string;
  seoTitle?: string;
  seoDescription?: string;
  noIndex?: boolean;
  coverImageUrl?: string;
  coverVideoUrl?: string;
}): Promise<EditorStory> => {
  const { data } = await apiClient.post<ApiResponse<{ story: EditorStory }>>(
    "/content/stories",
    payload,
  );
  return data.data.story;
};

export const updateEditorStory = async (
  id: string,
  payload: Partial<{
    title: string;
    slug: string;
    summary: string;
    themeTitle: string;
    authorName: string;
    fullStoryUrl: string;
    published: boolean;
    sortOrder: number;
    firstVideoModuleId: string | null;
    firstAdLinkUrl: string;
    playlistModuleIds: string[];
    websiteEpisodeLimit: number;
    youtubePlaylistUrl: string;
    aiStoryPrompt: string;
    seoTitle: string;
    seoDescription: string;
    noIndex: boolean;
    coverImageUrl: string;
    coverVideoUrl: string;
  }>,
): Promise<EditorStory> => {
  const { data } = await apiClient.patch<ApiResponse<{ story: EditorStory }>>(
    `/content/stories/${id}`,
    payload,
  );
  return data.data.story;
};

export const uploadStoryCover = async (
  storyId: string,
  file: File,
): Promise<EditorStory> => {
  const form = new FormData();
  form.append("image", file);
  const { data } = await apiClient.post<ApiResponse<{ story: EditorStory }>>(
    `/content/stories/${storyId}/cover`,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
    },
  );
  return data.data.story;
};

export const deleteEditorStory = async (id: string): Promise<void> => {
  await apiClient.delete(`/content/stories/${id}`);
};

export interface StoryAnalytics {
  viewCount: number;
  bookmarks: number;
  comments: number;
  reactions: number;
  reactionByEmoji: { emoji: string; count: number }[];
}

export const getStoryAnalytics = async (id: string): Promise<StoryAnalytics> => {
  const { data } = await apiClient.get<ApiResponse<StoryAnalytics>>(
    `/content/stories/${id}/analytics`,
  );
  return data.data;
};

export const uploadStoryFirstAd = async (
  storyId: string,
  file: File,
): Promise<EditorStory> => {
  const form = new FormData();
  form.append("image", file);
  const { data } = await apiClient.post<ApiResponse<{ story: EditorStory }>>(
    `/content/stories/${storyId}/first-ad`,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
    },
  );
  return data.data.story;
};

export type BeatComplexityTier = 'simple' | 'complex';

export interface SceneBeat {
  beatIndex: number;
  durationSec: number;
  characterHandles: string[];
  setting: string;
  actionSummary: string;
  dialogueSummary: string;
  complexity: BeatComplexityTier;
  chapterIndex?: number;
  chapterTitle?: string;
  chapterBeatIndex?: number;
}

export type ModulePipelineStatus =
  | 'idle'
  | 'beats_draft'
  | 'beats_committed'
  | 'generating'
  | 'awaiting_approval'
  | 'complete'
  | 'failed';

export interface ModulePipeline {
  _id?: string;
  moduleId: string;
  workspaceId: string;
  episodeKey: string;
  episodeTitle?: string;
  episodeId?: string;
  status: ModulePipelineStatus;
  fullScript?: string;
  audioTimelineUrl?: string;
  beatQueue: SceneBeat[];
  beatQueueCommitted: boolean;
  currentSceneIndex: number;
  reAnchorEveryN: number;
  themeTitle?: string;
  totalBeats: number;
  progressLabel: string;
}

export type PipelineEpisodeRequest = {
  episodeKey: string;
  episodeTitle?: string;
};

export const runPipelineBreakdown = async (
  moduleId: string,
  body: PipelineEpisodeRequest & {
    script: string;
    audioTimelineUrl?: string;
    targetBeatDurationSec?: number;
  },
): Promise<{ beats: SceneBeat[]; pipelineId: string }> => {
  const { data } = await apiClient.post<ApiResponse<{ beats: SceneBeat[]; pipelineId: string }>>(
    `/content/modules/${moduleId}/pipeline/breakdown`,
    body,
  );
  return data.data;
};

export const commitPipelineBeats = async (
  moduleId: string,
  body: PipelineEpisodeRequest & { beats: SceneBeat[]; reAnchorEveryN?: number },
): Promise<{ totalBeats: number }> => {
  const { data } = await apiClient.post<ApiResponse<{ totalBeats: number }>>(
    `/content/modules/${moduleId}/pipeline/beats/commit`,
    body,
  );
  return data.data;
};

export const getModulePipeline = async (
  moduleId: string,
  episodeKey: string,
): Promise<ModulePipeline> => {
  const { data } = await apiClient.get<ApiResponse<ModulePipeline>>(
    `/content/modules/${moduleId}/pipeline`,
    { params: { episodeKey } },
  );
  return data.data;
};

export const generateNextPipelineScene = async (
  moduleId: string,
  body: PipelineEpisodeRequest & { model: string },
): Promise<{ sceneNumber: number; status: string; episodeId?: string }> => {
  const { data } = await apiClient.post<
    ApiResponse<{ sceneNumber: number; status: string; episodeId?: string }>
  >(`/content/modules/${moduleId}/pipeline/scenes/generate-next`, body);
  return data.data;
};

export const approvePipelineScene = async (
  moduleId: string,
  sceneNumber: number,
  body: PipelineEpisodeRequest & { approved: boolean; editedBeat?: Partial<SceneBeat> },
): Promise<{ status: string; currentSceneIndex: number }> => {
  const { data } = await apiClient.post<ApiResponse<{ status: string; currentSceneIndex: number }>>(
    `/content/modules/${moduleId}/pipeline/scenes/${sceneNumber}/approval`,
    body,
  );
  return data.data;
};
