import type { AiModelOption } from '@/api/content';
import {
  VIDEO_PROVIDER_META,
  defaultModelForVideoProvider,
  modelsForVideoProvider,
  videoProviderId,
} from './videoProvider';

export function VideoProviderSwitch({
  models,
  value,
  onChange,
  compact = false,
}: {
  models: AiModelOption[];
  value: string;
  onChange: (model: string) => void;
  compact?: boolean;
}) {
  const active = videoProviderId(value);
  const variants = active ? modelsForVideoProvider(models, active) : [];

  return (
    <div className={compact ? '' : 'rounded-xl border border-border bg-white p-4'}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`${compact ? 'text-[11px]' : 'text-sm'} font-semibold text-dark`}>Video provider</p>
          {!compact ? (
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Scene clips use the selected provider: OpenAI Sora, Google Veo, or Grok Imagine.
            </p>
          ) : null}
        </div>
      </div>
      <div className={`mt-3 grid gap-2 ${models.length ? 'grid-cols-3' : 'grid-cols-1'}`}>
        {VIDEO_PROVIDER_META.map((provider) => {
          const model = defaultModelForVideoProvider(models, provider.id);
          const disabled = !model;
          const selected = active === provider.id;
          return (
            <button
              key={provider.id}
              type="button"
              disabled={disabled}
              onClick={() => model && onChange(model)}
              className={`rounded-xl border px-3 py-2 text-left disabled:opacity-40 ${
                selected
                  ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/25'
                  : 'border-border bg-transparent hover:border-[var(--color-muted-olive)]/60'
              }`}
            >
              <p className="text-xs font-semibold text-dark">{provider.label}</p>
              <p className="mt-0.5 text-[10px] font-medium text-muted">{disabled ? 'Not configured' : provider.hint}</p>
            </button>
          );
        })}
      </div>
      {variants.length > 1 ? (
        <select
          aria-label="Video model variant"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="input-field mt-3 text-xs"
        >
          {variants.map((model) => (
            <option key={model.value} value={model.value}>{model.label}</option>
          ))}
        </select>
      ) : null}
      {models.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-faded-copper)]">No video provider is configured on the server yet.</p>
      ) : null}
    </div>
  );
}
