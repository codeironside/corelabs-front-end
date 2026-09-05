import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, DollarSign, Film, ThumbsDown, ThumbsUp } from 'lucide-react';
import {
  getCreatorCostRollups,
  getEpisodeCostRollups,
  getGenerationUsageRollup,
  type CreatorCostRollup,
  type EpisodeCostRollup,
  type GenerationCallType,
  type GenerationCostRange,
  type GenerationUsageRollup,
} from '@/api/generation';

const CALL_TYPE_LABELS: Record<GenerationCallType, string> = {
  chapter_split: 'Chapter split',
  beat_breakdown: 'Beat breakdown',
  story_summary: 'Story summary',
  scene_video: 'Scene video',
  tts_audio: 'TTS audio',
  last_frame_extract: 'Last-frame extract',
};

const RANGE_OPTIONS: Array<{ id: GenerationCostRange; label: string }> = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'all', label: 'All time' },
];

function RollupCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <Icon size={18} className="text-[var(--color-faded-copper)]" />
      <p className="mt-3 text-xl font-semibold text-[var(--color-dark)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--color-dark)]/65">{label}</p>
    </div>
  );
}

function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

function approvalRate(row: { sceneVideoApproved: number; sceneVideoRejected: number }): string {
  const decided = row.sceneVideoApproved + row.sceneVideoRejected;
  if (decided === 0) return '—';
  return `${Math.round((row.sceneVideoApproved / decided) * 100)}% approved (${row.sceneVideoApproved}/${decided})`;
}

function CallTypeCells({ byCallType }: { byCallType: EpisodeCostRollup['byCallType'] }): React.JSX.Element {
  const parts = (Object.keys(CALL_TYPE_LABELS) as GenerationCallType[])
    .filter((key) => byCallType[key]?.calls > 0)
    .map((key) => `${CALL_TYPE_LABELS[key]} ${formatUsd(byCallType[key].costUsd)}`);
  return <span>{parts.length ? parts.join(' · ') : '—'}</span>;
}

function CostTable({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: React.ReactNode[][];
  empty: string;
}): React.JSX.Element {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--color-dark)]/65">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-[0.08em] text-[var(--color-dark)]/55">
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 font-semibold">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, index) => (
            <tr key={index} className="border-b border-[var(--color-border)]/70">
              {cells.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 align-top text-[var(--color-dark)]">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StudioPerformancePanel(): React.JSX.Element {
  const [episodeRange, setEpisodeRange] = useState<GenerationCostRange>('all');
  const [creatorRange, setCreatorRange] = useState<GenerationCostRange>('7d');

  const rollupQuery = useQuery({
    queryKey: ['generation', 'usage-rollup'],
    queryFn: () => getGenerationUsageRollup(),
    retry: false,
  });

  const episodeQuery = useQuery({
    queryKey: ['generation', 'costs', 'episodes', episodeRange],
    queryFn: () => getEpisodeCostRollups(episodeRange),
    retry: false,
  });

  const creatorQuery = useQuery({
    queryKey: ['generation', 'costs', 'creators', creatorRange],
    queryFn: () => getCreatorCostRollups(creatorRange),
    retry: false,
  });

  const rollup: GenerationUsageRollup | undefined = rollupQuery.data;
  const episodes: EpisodeCostRollup[] = episodeQuery.data?.episodes ?? [];
  const creators: CreatorCostRollup[] = creatorQuery.data?.creators ?? [];

  const episodeRows = useMemo(
    () =>
      episodes.map((episode) => [
        episode.title,
        formatUsd(episode.totalCostUsd),
        String(episode.totalCalls),
        <CallTypeCells key={`${episode.episodeId}-types`} byCallType={episode.byCallType} />,
        approvalRate(episode),
      ]),
    [episodes],
  );

  const creatorRows = useMemo(
    () =>
      creators.map((creator) => [
        creator.name,
        formatUsd(creator.totalCostUsd),
        String(creator.totalCalls),
        <CallTypeCells key={`${creator.userId}-types`} byCallType={creator.byCallType} />,
        approvalRate(creator),
      ]),
    [creators],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-tea-green)]">
            <BarChart3 size={20} className="text-[var(--color-dark)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-dark)]">Generation cost &amp; usage</h2>
            <p className="mt-1 text-sm text-[var(--color-dark)]/70">
              Every chapter split, beat breakdown, story summary, scene video, and TTS call is logged against its episode and creator.
            </p>
          </div>
        </div>
      </section>

      {rollupQuery.isError ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-vanilla-cream)] px-4 py-3 text-sm text-[var(--color-dark)]/70">
          No usage data yet — costs appear after the first generation call is logged.
        </div>
      ) : null}

      {rollup ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <RollupCard label="Total spend" value={formatUsd(rollup.totalCostUsd)} icon={DollarSign} />
            <RollupCard label="Total calls" value={String(rollup.totalCalls)} icon={Film} />
            <RollupCard label="Approved scenes" value={String(rollup.approvedScenes)} icon={ThumbsUp} />
            <RollupCard label="Rejected scenes" value={String(rollup.rejectedScenes)} icon={ThumbsDown} />
          </div>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-[var(--color-dark)]">Efficiency</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--color-dark)]/65">Cost per approved scene</dt>
                  <dd className="font-semibold">{formatUsd(rollup.costPerApprovedSceneUsd)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-dark)]/65">Cost per finished minute</dt>
                  <dd className="font-semibold">{formatUsd(rollup.costPerFinishedMinuteUsd)}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-[var(--color-dark)]">By complexity</h3>
              <dl className="mt-3 space-y-2 text-sm">
                {(['simple', 'complex'] as const).map((tier) => (
                  <div key={tier} className="flex justify-between">
                    <dt className="capitalize text-[var(--color-dark)]/65">{tier}</dt>
                    <dd className="font-semibold">
                      {rollup.byComplexity[tier].calls} calls · {formatUsd(rollup.byComplexity[tier].costUsd)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </>
      ) : rollupQuery.isLoading ? (
        <p className="text-sm text-[var(--color-dark)]/65">Loading usage rollup…</p>
      ) : null}

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-dark)]">Cost by episode</h3>
            <p className="mt-1 text-xs text-[var(--color-dark)]/65">Sum of generation_logs for each episode, including rejected video attempts.</p>
          </div>
          <select
            aria-label="Episode cost time range"
            className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-dark)]"
            value={episodeRange}
            onChange={(event) => setEpisodeRange(event.target.value as GenerationCostRange)}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
        {episodeQuery.isLoading ? (
          <p className="text-sm text-[var(--color-dark)]/65">Loading episode costs…</p>
        ) : (
          <CostTable
            columns={['Episode', 'Total', 'Calls', 'By call type', 'Scene video approval']}
            rows={episodeRows}
            empty="No generation logs for this range yet."
          />
        )}
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-dark)]">Cost by creator</h3>
            <p className="mt-1 text-xs text-[var(--color-dark)]/65">Workspace spend grouped by the creator who owns the episode.</p>
          </div>
          <select
            aria-label="Creator cost time range"
            className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-dark)]"
            value={creatorRange}
            onChange={(event) => setCreatorRange(event.target.value as GenerationCostRange)}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </div>
        {creatorQuery.isLoading ? (
          <p className="text-sm text-[var(--color-dark)]/65">Loading creator costs…</p>
        ) : (
          <CostTable
            columns={['Creator', 'Total', 'Calls', 'By call type', 'Scene video approval']}
            rows={creatorRows}
            empty="No creator spend for this range yet."
          />
        )}
      </section>

      <p className="text-[11px] leading-relaxed text-[var(--color-dark)]/55">
        Logged costs are estimated from published per-unit rates. Provider usage objects (OpenAI/Anthropic token counts) are not yet threaded through the text adapters, and video/TTS APIs do not return billed USD in-app.
      </p>
    </div>
  );
}
