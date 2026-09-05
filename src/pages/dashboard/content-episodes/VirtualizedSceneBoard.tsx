import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { SceneBeat } from '@/api/content';
import { groupBeatsByChapter } from './episodePipeline';

type BeatBoardRow =
  | { kind: 'header'; chapterIndex: number; title: string; beatCount: number }
  | { kind: 'beat'; beat: SceneBeat };

function BeatCard({
  beat,
  editable,
  onChangeBeat,
}: {
  beat: SceneBeat;
  editable: boolean;
  onChangeBeat: (index: number, next: SceneBeat) => void;
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-dark">Scene {beat.beatIndex + 1}</span>
        <span className="rounded-full bg-[var(--color-tea-green)]/35 px-2 py-0.5 text-[10px] font-semibold capitalize text-[var(--color-ash-brown)]">
          {beat.complexity}
        </span>
      </div>
      {editable ? (
        <>
          <label className="block text-[10px] text-muted">
            Setting
            <input
              className="input-field mt-1 text-xs"
              value={beat.setting}
              onChange={(event) => onChangeBeat(beat.beatIndex, { ...beat, setting: event.target.value })}
            />
          </label>
          <label className="mt-2 block text-[10px] text-muted">
            Action
            <textarea
              className="input-field studio-textarea mt-1 text-xs"
              rows={2}
              value={beat.actionSummary}
              onChange={(event) => onChangeBeat(beat.beatIndex, { ...beat, actionSummary: event.target.value })}
            />
          </label>
        </>
      ) : (
        <>
          <p className="text-[11px] font-medium text-dark">{beat.setting}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">{beat.actionSummary}</p>
        </>
      )}
    </div>
  );
}

export function VirtualizedSceneBoard({
  beats,
  editable,
  onChangeBeat,
}: {
  beats: SceneBeat[];
  editable: boolean;
  onChangeBeat: (index: number, next: SceneBeat) => void;
}): React.JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null);
  const chapters = useMemo(() => groupBeatsByChapter(beats), [beats]);
  const grouped = chapters.length > 1;
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const rows = useMemo<BeatBoardRow[]>(() => {
    if (!grouped) return beats.map((beat) => ({ kind: 'beat', beat }));
    const next: BeatBoardRow[] = [];
    for (const chapter of chapters) {
      next.push({
        kind: 'header',
        chapterIndex: chapter.chapterIndex,
        title: chapter.title,
        beatCount: chapter.beats.length,
      });
      if (collapsed[chapter.chapterIndex]) continue;
      for (const beat of chapter.beats) next.push({ kind: 'beat', beat });
    }
    return next;
  }, [beats, chapters, collapsed, grouped]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (rows[index]?.kind === 'header' ? 64 : 168),
    overscan: 8,
    gap: 12,
    paddingStart: 12,
    paddingEnd: 12,
    getItemKey: (index) => {
      const row = rows[index];
      if (!row) return index;
      return row.kind === 'header' ? `beat-chapter-${row.chapterIndex}` : `beat-${row.beat.beatIndex}`;
    },
  });

  if (beats.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
        Run script breakdown to populate scene beats.
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="max-h-[min(60vh,40rem)] overflow-auto rounded-xl border border-border bg-white"
    >
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full px-3"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {row.kind === 'header' ? (
                <button
                  type="button"
                  onClick={() => setCollapsed((current) => ({
                    ...current,
                    [row.chapterIndex]: !collapsed[row.chapterIndex],
                  }))}
                  className="studio-touch-target flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-[var(--color-tea-green)]/15 px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-dark">{row.title}</p>
                    <p className="text-xs text-muted">{row.beatCount} beats · Chapter {row.chapterIndex + 1}</p>
                  </div>
                  <span className="text-xs font-semibold text-[var(--color-ash-brown)]">
                    {collapsed[row.chapterIndex] ? 'Expand' : 'Collapse'}
                  </span>
                </button>
              ) : (
                <BeatCard beat={row.beat} editable={editable} onChangeBeat={onChangeBeat} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
