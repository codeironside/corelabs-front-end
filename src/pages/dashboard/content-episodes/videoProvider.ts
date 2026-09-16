import type { AiModelOption } from '@/api/content';

export type VideoProviderId = 'modal' | 'comfy' | 'openai' | 'google' | 'xai';

/** Only Studio LTX 2.5 is live. Other providers stay in code, idle. */
export const VIDEO_PROVIDER_META: Array<{ id: VideoProviderId; label: string; hint: string }> = [
  { id: 'modal', label: 'Studio LTX', hint: 'Self-hosted 2.5 I2V + audio' },
  // { id: 'comfy', label: 'LTX', hint: '2.5' },
  // { id: 'openai', label: 'OpenAI', hint: 'Sora' },
  // { id: 'google', label: 'Google', hint: 'Veo' },
  // { id: 'xai', label: 'Grok', hint: 'Imagine' },
];

const PREFERRED_MODELS: Record<VideoProviderId, string[]> = {
  modal: ['modal:ltx-2.5', 'modal:wan-i2v'],
  comfy: ['comfy:ltx-2.5'],
  openai: ['openai:sora-2', 'openai:sora-2-pro'],
  google: ['google:veo-3.1', 'google:veo'],
  xai: ['xai:grok-imagine-video'],
};

export function videoProviderId(model: string): VideoProviderId | undefined {
  if (model.startsWith('modal:')) return 'modal';
  if (model.startsWith('comfy:')) return 'comfy';
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
