import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { listTtsVoices, type TtsVoiceOption } from '@/api/content';

function voiceProfileLabelFromCatalog(value: string | undefined, voices: TtsVoiceOption[]): string {
  const trimmed = value?.trim();
  if (!trimmed) return 'Select a voice';
  return voices.find((voice) => voice.value === trimmed)?.label ?? trimmed;
}

export function TtsVoiceSelect({
  value,
  onChange,
  label,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const { data: voices = [], isLoading, isError } = useQuery({
    queryKey: ['content', 'tts-voices'],
    queryFn: listTtsVoices,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return voices;
    return voices.filter((voice) =>
      `${voice.label} ${voice.providerLabel} ${voice.language ?? ''} ${voice.gender ?? ''} ${voice.value}`
        .toLowerCase()
        .includes(needle),
    );
  }, [query, voices]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, TtsVoiceOption[]>();
    for (const voice of filtered) {
      const key = voice.providerLabel;
      buckets.set(key, [...(buckets.get(key) ?? []), voice]);
    }
    return Array.from(buckets.entries());
  }, [filtered]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const currentLabel = voiceProfileLabelFromCatalog(value, voices);

  return (
    <div ref={rootRef} className="relative">
      {label && (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      )}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-left text-sm text-dark shadow-sm transition-colors hover:border-[var(--color-muted-olive)]/60"
      >
        <span className="truncate">{isLoading ? 'Loading voicesΓÇª' : currentLabel}</span>
        {isLoading ? <Loader2 size={15} className="animate-spin text-muted" /> : <ChevronDown size={15} className="text-muted" />}
      </button>
      {open && (
        <div className="studio-dropdown-panel absolute z-[90] mt-1.5 w-full rounded-xl border border-border bg-white shadow-lg ring-1 ring-black/5">
          <div className="border-b border-border p-2">
            <input
              className="input-field text-xs"
              value={query}
              placeholder="Search ElevenLabs or Google voices"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-auto py-1">
            {isError && (
              <li className="px-3 py-2 text-xs text-red-600">Could not load voice catalog.</li>
            )}
            {!isLoading && grouped.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted">No voices match your search.</li>
            )}
            {grouped.map(([providerLabel, providerVoices]) => (
              <li key={providerLabel}>
                <p className="sticky top-0 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {providerLabel} ({providerVoices.length})
                </p>
                {providerVoices.map((voice) => {
                  const active = voice.value === value;
                  return (
                    <button
                      key={voice.value}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs ${
                        active ? 'bg-[var(--color-tea-green)]/45 font-medium text-[var(--color-ash-brown)]' : 'text-dark hover:bg-[var(--color-vanilla-cream)]/60'
                      }`}
                      onClick={() => {
                        onChange(voice.value);
                        setOpen(false);
                        setQuery('');
                      }}
                    >
                      <span className="truncate">{voice.label}</span>
                      {active && <Check size={13} className="shrink-0" />}
                    </button>
                  );
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-1 text-[10px] leading-relaxed text-muted">
        Voices are loaded from your connected ElevenLabs and Google TTS accounts.
      </p>
    </div>
  );
}

export function resolveTtsVoiceLabel(value: string | undefined, voices: TtsVoiceOption[]): string {
  return voiceProfileLabelFromCatalog(value, voices);
}
