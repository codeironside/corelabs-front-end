import { useMemo, useState } from 'react';
import type { SceneBeat } from '@/api/content';
import { groupBeatsByChapter } from './episodePipeline';

const PAGE_SIZE = 24;

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
    <div className="rounded-lg border border-border p-3 min-w-[16rem]">
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
  const chapters = useMemo(() => groupBeatsByChapter(beats), [beats]);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [pageByChapter, setPageByChapter] = useState<Record<number, number>>({});

  if (beats.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
        Run script breakdown to populate scene beats.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {chapters.map((chapter) => {
        const page = pageByChapter[chapter.chapterIndex] ?? 0;
        const isCollapsed = collapsed[chapter.chapterIndex] ?? false;
        const start = page * PAGE_SIZE;
        const visible = chapter.beats.slice(start, start + PAGE_SIZE);
        const totalPages = Math.max(1, Math.ceil(chapter.beats.length / PAGE_SIZE));

        return (
          <section key={chapter.chapterIndex} className="rounded-xl border border-border bg-white">
            <button
              type="button"
              onClick={() => setCollapsed((current) => ({ ...current, [chapter.chapterIndex]: !isCollapsed }))}
              className="studio-touch-target flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-dark">{chapter.title}</p>
                <p className="text-xs text-muted">{chapter.beats.length} beats · Chapter {chapter.chapterIndex + 1}</p>
              </div>
              <span className="text-xs font-semibold text-[var(--color-ash-brown)]">{isCollapsed ? 'Expand' : 'Collapse'}</span>
            </button>

            {!isCollapsed ? (
              <div className="p-4">
                {/* Tablet+: responsive grid */}
                <div className="studio-scene-board-grid">
                  {visible.map((beat) => (
                    <BeatCard key={beat.beatIndex} beat={beat} editable={editable} onChangeBeat={onChangeBeat} />
                  ))}
                </div>

                {totalPages > 1 ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <button
                      type="button"
                      disabled={page <= 0}
                      onClick={() => setPageByChapter((current) => ({ ...current, [chapter.chapterIndex]: Math.max(0, page - 1) }))}
                      className="studio-touch-target-inline rounded-lg border border-border px-3 py-1.5 font-semibold disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-muted">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPageByChapter((current) => ({ ...current, [chapter.chapterIndex]: Math.min(totalPages - 1, page + 1) }))}
                      className="studio-touch-target-inline rounded-lg border border-border px-3 py-1.5 font-semibold disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
