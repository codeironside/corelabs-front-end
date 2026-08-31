import { useQuery } from '@tanstack/react-query';
import { BarChart3, DollarSign, Film, ThumbsDown, ThumbsUp } from 'lucide-react';
import { getGenerationUsageRollup, type GenerationUsageRollup } from '@/api/generation';

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

export function StudioPerformancePanel(): React.JSX.Element {
  const rollupQuery = useQuery({
    queryKey: ['generation', 'usage-rollup'],
    queryFn: () => getGenerationUsageRollup(),
    retry: false,
  });

  const rollup: GenerationUsageRollup | undefined = rollupQuery.data;

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
              Instrumented spend across video, image, TTS, and text calls — use this to drive optimization.
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
    </div>
  );
}
