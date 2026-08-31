import { useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { AUDIO_FX_CONTROLS, DEFAULT_AUDIO_FX, mergeAudioFx } from './audioFx';
import type { AudioFxSettings, TimelineAudioLayer } from './types';

function FxSlider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  help,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  help: string;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <label className="block rounded-lg border border-border bg-white/90 p-2">
      <span className="flex items-center justify-between gap-2 text-[10px] font-semibold text-dark">
        <button type="button" className="text-left" onClick={() => setOpen((current) => !current)}>
          {label}
        </button>
        <span className="text-[var(--color-ash-brown)]">{value}{suffix}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-[var(--color-muted-olive)]"
      />
      {open && <p className="mt-2 text-[10px] leading-relaxed text-muted">{help}</p>}
    </label>
  );
}

export function AudioEqualizerPanel({
  layer,
  onUpdate,
}: {
  layer?: TimelineAudioLayer;
  onUpdate: (id: string, patch: Partial<TimelineAudioLayer>) => void;
}) {
  const fx = useMemo(() => mergeAudioFx(layer?.fx), [layer?.fx]);
  const categories = useMemo(
    () => [...new Set(AUDIO_FX_CONTROLS.map((control) => control.category))],
    [],
  );

  if (!layer) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-white p-4 text-xs text-muted">
        Select an audio clip on the timeline to open the equalizer and noise tools.
      </div>
    );
  }

  const activeLayer = layer;

  function patchFx(patch: Partial<AudioFxSettings>) {
    onUpdate(activeLayer.id, { fx: { ...fx, ...patch } });
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-dark">
        <SlidersHorizontal size={16} className="text-[var(--color-ash-brown)]" />
        Audio equalizer ┬╖ {activeLayer.label}
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-muted">
        Works on mic, soundtrack, SFX, and TTS during monitor preview. Tap a control name to read what it does.
      </p>
      <button
        type="button"
        onClick={() => onUpdate(activeLayer.id, { fx: DEFAULT_AUDIO_FX })}
        className="mt-2 rounded-lg border border-border px-3 py-1.5 text-[10px] font-semibold text-[var(--color-ash-brown)]"
      >
        Reset all FX
      </button>
      <div className="mt-3 space-y-4">
        {categories.map((category) => (
          <div key={category}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{category}</p>
            <div className="mt-2 grid gap-2">
              {AUDIO_FX_CONTROLS.filter((control) => control.category === category).map((control) => (
                <FxSlider
                  key={control.key}
                  label={control.label}
                  value={fx[control.key]}
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  suffix={control.suffix}
                  help={control.help}
                  onChange={(value) => patchFx({ [control.key]: value })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
