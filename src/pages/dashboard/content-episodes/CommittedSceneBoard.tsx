import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { LocateFixed } from 'lucide-react';
import { focusApprovalScene } from './sceneApproval';
import type { EpisodeSceneCard } from './storyboard';
import {
  defaultChapterCollapsedMap,
  flattenCommittedBoardRows,
  groupScenesByChapter,
} from './episodePipeline';

const SCENE_ESTIMATE_PX = 720;
const HEADER_ESTIMATE_PX = 76;
const VIEWPORT_CLASS = 'mt-4 max-h-[min(70vh,56rem)] overflow-auto rounded-xl border border-border bg-[var(--color-tea-green)]/8';

export function CommittedSceneBoard({
  scenes,
  renderScene,
}: {
  scenes: EpisodeSceneCard[];
  renderScene: (scene: EpisodeSceneCard, index: number) => ReactNode;
}): React.JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null);
  const [userCollapsed, setUserCollapsed] = useState<Record<number, boolean>>({});
  const [jumpToken, setJumpToken] = useState(0);
  const autoJumpedId = useRef('');

  const groups = useMemo(() => groupScenesByChapter(scenes), [scenes]);
  const grouped = groups.length > 1;
  const focus = useMemo(() => focusApprovalScene(scenes), [scenes]);
  const focusChapterIndex = grouped ? focus?.chapterIndex : undefined;

  const collapsed = useMemo(() => {
    if (!grouped) return {};
    return {
      ...defaultChapterCollapsedMap(groups, focusChapterIndex),
      ...userCollapsed,
    };
  }, [focusChapterIndex, grouped, groups, userCollapsed]);

  const rows = useMemo(
    () => flattenCommittedBoardRows(groups, collapsed, grouped),
    [collapsed, grouped, groups],
  );
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (rows[index]?.kind === 'header' ? HEADER_ESTIMATE_PX : SCENE_ESTIMATE_PX),
    overscan: 4,
    gap: 16,
    paddingStart: 12,
    paddingEnd: 12,
    getItemKey: (index) => {
      const row = rows[index];
      if (!row) return index;
      return row.kind === 'header' ? `chapter-${row.chapterIndex}` : row.scene.id;
    },
  });

  const scrollToFocus = useCallback(() => {
    if (!focus) return;
    if (grouped && typeof focus.chapterIndex === 'number') {
      setUserCollapsed((current) => ({ ...current, [focus.chapterIndex as number]: false }));
    }
    setJumpToken((token) => token + 1);
  }, [focus, grouped]);

  useLayoutEffect(() => {
    if (!jumpToken || !focus?.id) return;
    const run = () => {
      const rowIndex = rowsRef.current.findIndex((row) => row.kind === 'scene' && row.scene.id === focus.id);
      if (rowIndex < 0) return false;
      virtualizer.scrollToIndex(rowIndex, { align: 'start' });
      return true;
    };
    if (run()) return;
    const frame = requestAnimationFrame(() => {
      run();
    });
    return () => cancelAnimationFrame(frame);
  }, [focus?.id, jumpToken, virtualizer]);

  useLayoutEffect(() => {
    if (!focus?.id || autoJumpedId.current === focus.id) return;
    autoJumpedId.current = focus.id;
    scrollToFocus();
  }, [focus?.id, scrollToFocus]);

  function toggleChapter(chapterIndex: number) {
    setUserCollapsed((current) => ({
      ...current,
      [chapterIndex]: !(collapsed[chapterIndex] ?? false),
    }));
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {scenes.length} committed scene{scenes.length === 1 ? '' : 's'}
          {grouped ? ` across ${groups.length} chapters` : ''}.
        </p>
        <button
          type="button"
          disabled={!focus}
          onClick={() => scrollToFocus()}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-muted-olive)] px-3 py-2 text-xs font-semibold text-[var(--color-ash-brown)] disabled:opacity-40"
        >
          <LocateFixed size={14} />
          Jump to current scene
        </button>
      </div>

      <div ref={parentRef} className={VIEWPORT_CLASS}>
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
                    onClick={() => toggleChapter(row.chapterIndex)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-dark">
                        {row.title} — {row.rangeLabel}
                      </p>
                      <p className="text-xs text-muted">{row.summary}</p>
                    </div>
                    <span className="text-xs font-semibold text-[var(--color-ash-brown)]">
                      {collapsed[row.chapterIndex] ? 'Expand' : 'Collapse'}
                    </span>
                  </button>
                ) : (
                  renderScene(row.scene, row.index)
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
