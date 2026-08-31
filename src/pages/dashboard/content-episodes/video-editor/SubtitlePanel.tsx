import { Clock, Palette, Type } from 'lucide-react';
import type { SubtitleCue, SubtitleStyle } from './types';
import { timecode } from './editorUtils';

function StyleSlider({
  label,
  value,
  min,
  max,
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-[11px] font-semibold text-muted">
        {label}
        <span className="text-[var(--color-ash-brown)]">
          {value}
          {suffix}
        </span>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full accent-[var(--color-muted-olive)]" />
    </label>
  );
}

export function SubtitlePanel({
  cues,
  style,
  selectedCueId,
  totalDuration,
  onGenerate,
  onStyleChange,
  onCueSelect,
  onCueUpdate,
}: {
  cues: SubtitleCue[];
  style: SubtitleStyle;
  selectedCueId: string;
  totalDuration: number;
  onGenerate: () => void;
  onStyleChange: (style: SubtitleStyle) => void;
  onCueSelect: (cue: SubtitleCue) => void;
  onCueUpdate: (id: string, patch: Partial<SubtitleCue>) => void;
}) {
  const selectedCue = cues.find((cue) => cue.id === selectedCueId);

  return (
    <aside className="border-t border-border p-4 lg:border-l lg:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-dark">Subtitle Suite</p>
        <button type="button" onClick={onGenerate} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-muted-olive)] px-3 py-2 text-[11px] font-semibold text-[var(--color-vanilla-cream)]">
          <Type size={14} /> Generate Subtitles
        </button>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        Click a caption to edit when it appears and disappears on the monitor preview.
      </p>
      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
        {cues.length > 0 ? cues.map((cue) => {
          const selected = cue.id === selectedCueId;
          return (
            <div
              key={cue.id}
              className={`rounded-lg border p-2 transition ${selected ? 'border-[var(--color-faded-copper)] bg-[var(--color-faded-copper)]/8 ring-1 ring-[var(--color-faded-copper)]' : 'border-border'}`}
            >
              <button
                type="button"
                onClick={() => onCueSelect(cue)}
                className="w-full text-left"
              >
                <p className="text-[10px] font-semibold text-[var(--color-ash-brown)]">{timecode(cue.startSec)} ΓåÆ {timecode(cue.endSec)}</p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-dark">{cue.text}</p>
              </button>
              {selected && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <label className="block text-[10px] font-semibold text-muted">
                    Caption text
                    <textarea
                      value={cue.text}
                      rows={2}
                      onChange={(event) => onCueUpdate(cue.id, { text: event.target.value })}
                      className="input-field mt-1 w-full resize-y text-xs"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-[10px] font-semibold text-muted">
                      Show at (sec)
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, cue.endSec - 0.2)}
                        step={0.1}
                        value={cue.startSec}
                        onChange={(event) => onCueUpdate(cue.id, { startSec: Number(event.target.value) })}
                        className="input-field mt-1 text-xs"
                      />
                    </label>
                    <label className="block text-[10px] font-semibold text-muted">
                      Hide at (sec)
                      <input
                        type="number"
                        min={cue.startSec + 0.2}
                        max={totalDuration}
                        step={0.1}
                        value={cue.endSec}
                        onChange={(event) => onCueUpdate(cue.id, { endSec: Number(event.target.value) })}
                        className="input-field mt-1 text-xs"
                      />
                    </label>
                  </div>
                  <p className="text-[9px] text-muted">Visible while the playhead is between these times.</p>
                </div>
              )}
            </div>
          );
        }) : <p className="text-xs leading-relaxed text-muted">Generate captions from the current scene voice-over text.</p>}
      </div>

      {selectedCue && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--color-tea-green)]/60 bg-[var(--color-tea-green)]/15 px-3 py-2 text-[10px] font-semibold text-[var(--color-ash-brown)]">
          <Clock size={13} />
          Previewing cue {timecode(selectedCue.startSec)}ΓÇô{timecode(selectedCue.endSec)}
        </div>
      )}

      <div className="mt-4 space-y-3 rounded-xl border border-border p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-dark">
          <Palette size={15} className="text-[var(--color-ash-brown)]" />
          Caption Style
        </div>
        <select value={style.font} onChange={(event) => onStyleChange({ ...style, font: event.target.value })} className="input-field text-xs">
          {['Poppins', 'Inter', 'Montserrat', 'Bebas Neue', 'Oswald', 'Playfair Display'].map((font) => <option key={font} value={font}>{font}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[11px] font-semibold text-muted">Fill</span>
            <input type="color" value={style.fill} onChange={(event) => onStyleChange({ ...style, fill: event.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-white" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-muted">Stroke</span>
            <input type="color" value={style.stroke} onChange={(event) => onStyleChange({ ...style, stroke: event.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-white" />
          </label>
        </div>
        <StyleSlider label="Size" value={style.size} min={20} max={72} onChange={(size) => onStyleChange({ ...style, size })} />
        <StyleSlider label="Tracking" value={style.tracking} min={0} max={8} onChange={(tracking) => onStyleChange({ ...style, tracking })} />
        <StyleSlider label="Box opacity" value={style.backgroundOpacity} min={0} max={90} suffix="%" onChange={(backgroundOpacity) => onStyleChange({ ...style, backgroundOpacity })} />
        <div className="grid grid-cols-3 gap-1.5">
          {(['karaoke', 'kinetic', 'static'] as const).map((animation) => (
            <button
              key={animation}
              type="button"
              onClick={() => onStyleChange({ ...style, animation })}
              className={`rounded-lg px-2 py-2 text-[10px] font-semibold capitalize ${style.animation === animation ? 'bg-[var(--color-muted-olive)] text-[var(--color-vanilla-cream)]' : 'border border-border text-dark'}`}
            >
              {animation}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onStyleChange({ ...style, shadow: !style.shadow })}
          className={`w-full rounded-lg px-3 py-2 text-xs font-semibold ${style.shadow ? 'bg-[var(--color-tea-green)]/45 text-[var(--color-ash-brown)]' : 'border border-border text-dark'}`}
        >
          Drop Shadow {style.shadow ? 'On' : 'Off'}
        </button>
      </div>
    </aside>
  );
}
