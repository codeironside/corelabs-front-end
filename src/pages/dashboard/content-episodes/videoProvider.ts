import type { AiModelOption } from '@/api/content';

export type VideoProviderId = 'openai' | 'google' | 'xai';

export const VIDEO_PROVIDER_META: Array<{ id: VideoProviderId; label: string; hint: string }> = [
  { id: 'openai', label: 'OpenAI', hint: 'Sora' },
  { id: 'google', label: 'Google', hint: 'Veo' },
  { id: 'xai', label: 'Grok', hint: 'Imagine' },
];

const PREFERRED_MODELS: Record<VideoProviderId, string[]> = {
  openai: ['openai:sora-2', 'openai:sora-2-pro'],
  google: ['google:veo-3.1', 'google:veo'],
  xai: ['xai:grok-imagine-video'],
};

export function videoProviderId(model: string): VideoProviderId | undefined {
  if (model.startsWith('openai:')) return 'openai';
  if (model.startsWith('google:')) return 'google';
  if (model.startsWith('xai:')) return 'xai';
  return undefined;
}

export function modelsForVideoProvider(models: AiModelOption[], provider: VideoProviderId): AiModelOption[] {
  return models.filter((model) => model.provider === provider);
}

export function defaultModelForVideoProvider(models: AiModelOption[], provider: VideoProviderId): string | undefined {
  const available = modelsForVideoProvider(models, provider);
  return PREFERRED_MODELS[provider].find((value) => available.some((model) => model.value === value))
    ?? available[0]?.value;
}
