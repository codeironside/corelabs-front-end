import apiClient from '@/lib/axios';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type BeatComplexityTier = 'simple' | 'complex';

export type GenerationCallKind = 'video' | 'image' | 'tts' | 'text' | 'audio';

export interface GenerationUsageRollup {
  workspaceId: string;
  moduleId?: string;
  from: string;
  to: string;
  totalCostUsd: number;
  totalCalls: number;
  approvedScenes: number;
  rejectedScenes: number;
  costPerApprovedSceneUsd: number;
  costPerFinishedMinuteUsd: number;
  byComplexity: Record<BeatComplexityTier, { calls: number; costUsd: number }>;
  byCallKind: Record<GenerationCallKind, { calls: number; costUsd: number }>;
}

export async function getGenerationUsageRollup(input?: {
  moduleId?: string;
  from?: string;
  to?: string;
}): Promise<GenerationUsageRollup> {
  const { data } = await apiClient.get<ApiResponse<GenerationUsageRollup>>('/generation/usage/rollup', {
    params: input,
  });
  return data.data;
}

export type GenerationCallType =
  | 'chapter_split'
  | 'beat_breakdown'
  | 'story_summary'
  | 'scene_video'
  | 'tts_audio'
  | 'last_frame_extract';

export type GenerationCostRange = '7d' | '30d' | 'all';

export type CostByCallType = Record<GenerationCallType, { calls: number; costUsd: number }>;

export interface EpisodeCostRollup {
  episodeId: string;
  title: string;
  totalCostUsd: number;
  totalCalls: number;
  byCallType: CostByCallType;
  sceneVideoApproved: number;
  sceneVideoRejected: number;
  sceneVideoAttempts: number;
}

export interface CreatorCostRollup {
  userId: string;
  name: string;
  totalCostUsd: number;
  totalCalls: number;
  byCallType: CostByCallType;
  sceneVideoApproved: number;
  sceneVideoRejected: number;
  sceneVideoAttempts: number;
}

export async function getEpisodeCostRollups(range: GenerationCostRange = 'all'): Promise<{
  range: GenerationCostRange;
  episodes: EpisodeCostRollup[];
}> {
  const { data } = await apiClient.get<ApiResponse<{ range: GenerationCostRange; episodes: EpisodeCostRollup[] }>>(
    '/generation/costs/episodes',
    { params: { range } },
  );
  return data.data;
}

export async function getCreatorCostRollups(range: GenerationCostRange = '7d'): Promise<{
  range: GenerationCostRange;
  creators: CreatorCostRollup[];
}> {
  const { data } = await apiClient.get<ApiResponse<{ range: GenerationCostRange; creators: CreatorCostRollup[] }>>(
    '/generation/costs/creators',
    { params: { range } },
  );
  return data.data;
}
