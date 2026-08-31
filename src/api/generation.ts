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
