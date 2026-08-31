import { Copy, GripVertical, RefreshCcw, Scissors, Trash2, Volume2 } from 'lucide-react';
import type { PointerEvent, RefObject } from 'react';
import { useRef } from 'react';
import { audioTrackStyle } from './audioTrackStyles';
import {
  duplicateAudioLayer,
  moveAudioLayer,
  pointerSecond,
  splitAudioLayerAtPlayhead,
  trimAudioLayer,
  type AudioTrimEdge,
} from './audioTimelineEditing';
import { waveformBars } from './audioWaveform';
import { timelineWidth } from './editorUtils';
import type { TimelineAudioLayer } from './types';

export function AudioTimelineClip({
  layer,
  lane,
  zoom,
  totalDuration,
  playheadSec,
  trackRef,
  onUpdate,
  onAdd,
  onRemove,
  onRegenerateTts,
  selected,
  onSelect,
}: {
  layer: TimelineAudioLayer;
  lane: number;
  zoom: number;
  totalDuration: number;
  playheadSec: number;
  trackRef: RefObject<HTMLDivElement | null>;
  onUpdate: (id: string, patch: Partial<TimelineAudioLayer>) => void;
  onAdd: (layer: TimelineAudioLayer) => void;
  onRemove: (id: string) => void;
  onRegenerateTts?: () => void;
  selected?: boolean;
  onSelect?: (layerId: string) => void;
}) {
  const layerRef = useRef(layer);
  layerRef.current = layer;

  const left = timelineWidth(Math.max(0, layer.startSec), zoom);
  const width = timelineWidth(Math.max(0.5, layer.endSec - layer.startSec), zoom);
  const bars = waveformBars(`${layer.id}-${layer.label}`, Math.max(14, Math.min(42, Math.round(width / 7))));
  const compact = width < 120;
  const trackStyle = audioTrackStyle(layer.kind);

  function trackRect() {
    return trackRef.current?.getBoundingClientRect();
  }

  function startAudioTrim(event: PointerEvent<HTMLButtonElement>, edge: AudioTrimEdge) {
    event.preventDefault();
    event.stopPropagation();
    const rect = trackRect();
    if (!rect) return;

    const updateFromPointer = (clientX: number) => {
      const seconds = pointerSecond(clientX, rect, zoom, totalDuration);
      onUpdate(layer.id, trimAudioLayer(layerRef.current, edge, seconds, totalDuration));
    };

    updateFromPointer(event.clientX);
    const handleMove = (moveEvent: globalThis.PointerEvent) => updateFromPointer(moveEvent.clientX);
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
  }

  function startAudioMove(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const rect = trackRect();
    if (!rect) return;

    const dragStartX = event.clientX;
    const initialStart = layer.startSec;
    const initialEnd = layer.endSec;

    const updateFromPointer = (clientX: number) => {
      const deltaSec = (clientX - dragStartX) / zoom;
      onUpdate(
        layer.id,
        moveAudioLayer({ ...layer, startSec: initialStart, endSec: initialEnd }, deltaSec, totalDuration),
      );
    };

    updateFromPointer(event.clientX);
    const handleMove = (moveEvent: globalThis.PointerEvent) => updateFromPointer(moveEvent.clientX);
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
  }

  function handleSplitOrCrop() {
    const split = splitAudioLayerAtPlayhead(layer, playheadSec);
    if (split) {
      onUpdate(layer.id, split.head);
      onAdd(split.tail);
      return;
    }
    const crop = trimAudioLayer(layer, 'end', playheadSec, totalDuration);
    if (crop.endSec !== undefined && crop.endSec < layer.endSec - 0.24) {
      onUpdate(layer.id, crop);
    }
  }

  function handleDuplicate() {
    onAdd(duplicateAudioLayer(layer, { totalDuration, playheadSec, lane }));
  }

  return (
    <div
      className={`group absolute flex h-8 items-center gap-1 overflow-hidden rounded-md border px-2 shadow-sm ${selected ? 'ring-2 ring-[var(--color-faded-copper)]' : ''} ${layer.muted ? 'border-border bg-white opacity-50' : trackStyle.block}`}
      style={{ left, width, top: lane * 38 }}
      title={`${layer.label} ${layer.startSec.toFixed(1)}sΓÇô${layer.endSec.toFixed(1)}s${layer.clipOffsetSec ? ` ┬╖ source +${layer.clipOffsetSec.toFixed(1)}s` : ''}`}
      onClick={() => onSelect?.(layer.id)}
    >
      <button
        type="button"
        aria-label={`Crop start for ${layer.label}`}
        title="Drag to crop start"
        onPointerDown={(event) => startAudioTrim(event, 'start')}
        className="absolute left-0 top-0 z-10 h-full w-2.5 cursor-ew-resize bg-[var(--color-ash-brown)]/35 opacity-90 hover:bg-[var(--color-ash-brown)]"
      />
      <div
        role="button"
        tabIndex={0}
        aria-label={`Drag ${layer.label} on timeline`}
        title="Drag to move on timeline"
        onPointerDown={startAudioMove}
        className="relative z-[1] flex h-full min-w-0 flex-1 cursor-grab items-center gap-1 active:cursor-grabbing"
      >
        <GripVertical size={11} className="shrink-0 opacity-60" />
        {!compact && (
          <span className={`max-w-20 shrink-0 truncate rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${trackStyle.badge}`}>
            {layer.kind === 'tts' ? 'TTS' : layer.kind}
          </span>
        )}
        <div className="flex h-6 min-w-8 flex-1 items-center gap-0.5">
          {bars.map((height, barIndex) => (
            <span
              key={`${layer.id}-${barIndex}`}
              className={`w-1 shrink-0 rounded-full ${trackStyle.bars}`}
              style={{ height: Math.min(height, 22) }}
            />
          ))}
        </div>
        {!compact && (
          <label className="flex shrink-0 items-center gap-1 text-[9px] font-semibold text-[var(--color-ash-brown)]" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
            <Volume2 size={10} />
            <input
              aria-label={`Volume for ${layer.label}`}
              type="range"
              min={0}
              max={120}
              value={layer.volume}
              onChange={(event) => onUpdate(layer.id, { volume: Number(event.target.value) })}
              className="w-14 accent-[var(--color-muted-olive)]"
            />
            <span className="w-7 text-right">{layer.volume}%</span>
          </label>
        )}
      </div>
      <div className="absolute right-1 top-1 z-20 hidden gap-1 rounded bg-white/90 p-0.5 shadow-sm ring-1 ring-border group-hover:flex">
        <button
          type="button"
          aria-label={`Duplicate ${layer.label}`}
          title="Duplicate on this lane"
          onClick={(event) => {
            event.stopPropagation();
            handleDuplicate();
          }}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-[var(--color-ash-brown)] hover:bg-[var(--color-tea-green)]"
        >
          <Copy size={11} />
        </button>
        {onRegenerateTts && (
          <button
            type="button"
            aria-label={`Regenerate ${layer.label}`}
            title="Regenerate TTS"
            onClick={(event) => {
              event.stopPropagation();
              onRegenerateTts();
            }}
            className="inline-flex h-5 w-5 items-center justify-center rounded text-[var(--color-ash-brown)] hover:bg-[var(--color-tea-green)]"
          >
            <RefreshCcw size={11} />
          </button>
        )}
        <button
          type="button"
          aria-label={`Split or crop ${layer.label} at playhead`}
          title="Split at playhead (or crop end if playhead is past clip)"
          onClick={(event) => {
            event.stopPropagation();
            handleSplitOrCrop();
          }}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-[var(--color-ash-brown)] hover:bg-[var(--color-tea-green)]"
        >
          <Scissors size={11} />
        </button>
        <button
          type="button"
          aria-label={`Delete ${layer.label}`}
          title="Delete clip"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(layer.id);
          }}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-[var(--color-ash-brown)] hover:bg-[var(--color-faded-copper)]/30"
        >
          <Trash2 size={11} />
        </button>
      </div>
      <button
        type="button"
        aria-label={`Crop end for ${layer.label}`}
        title="Drag to crop end"
        onPointerDown={(event) => startAudioTrim(event, 'end')}
        className="absolute right-0 top-0 z-10 h-full w-2.5 cursor-ew-resize bg-[var(--color-ash-brown)]/35 opacity-90 hover:bg-[var(--color-ash-brown)]"
      />
    </div>
  );
}
