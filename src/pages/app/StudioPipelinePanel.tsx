import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Check, Clapperboard, Loader2, RefreshCw, X } from 'lucide-react';
import {
  approvePipelineScene,
  commitPipelineBeats,
  generateNextPipelineScene,
  getModulePipeline,
  listContentModules,
  runPipelineBreakdown,
  type SceneBeat,
} from '@/api/content';
import { createEpisodeWorkspaceKey } from '@/pages/dashboard/content-episodes/episodeWorkspace';

function BeatEditor({
  beat,
  onChange,
}: {
  beat: SceneBeat;
  onChange: (next: SceneBeat) => void;
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-white/10 bg-neutral-900 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-semibold text-white">Beat {beat.beatIndex + 1}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            beat.complexity === 'complex'
              ? 'bg-white/15 text-white/80'
              : 'bg-white/10 text-white/70'
          }`}
        >
          {beat.complexity}
        </span>
      </div>
      <label className="block text-white/65">
        Setting
        <input
          className="input-field mt-1 text-xs"
          value={beat.setting}
          onChange={(event) => onChange({ ...beat, setting: event.target.value })}
        />
      </label>
      <label className="mt-2 block text-white/65">
        Action
        <textarea
          className="input-field mt-1 text-xs"
          rows={2}
          value={beat.actionSummary}
          onChange={(event) => onChange({ ...beat, actionSummary: event.target.value })}
        />
      </label>
    </div>
  );
}

export function StudioPipelinePanel(): React.JSX.Element {
  const queryClient = useQueryClient();
  const modulesQuery = useQuery({ queryKey: ['content', 'modules'], queryFn: listContentModules });
  const [moduleId, setModuleId] = useState('');
  const [episodeKey] = useState(() => createEpisodeWorkspaceKey());
  const [script, setScript] = useState('');
  const [beats, setBeats] = useState<SceneBeat[]>([]);
  const [videoModel, setVideoModel] = useState('openai:sora-2');

  const pipelineQuery = useQuery({
    queryKey: ['content', 'pipeline', moduleId, episodeKey],
    queryFn: () => getModulePipeline(moduleId, episodeKey),
    enabled: Boolean(moduleId && episodeKey),
    refetchInterval: (query) =>
      query.state.data?.status === 'generating' || query.state.data?.status === 'awaiting_approval'
        ? 4000
        : false,
  });

  const pipeline = pipelineQuery.data;
  const activeSceneNumber = pipeline ? pipeline.currentSceneIndex + 1 : 1;

  const breakdownMutation = useMutation({
    mutationFn: () =>
      runPipelineBreakdown(moduleId, {
        episodeKey,
        episodeTitle: 'Studio pipeline lab',
        script,
      }),
    onSuccess: (data) => {
      setBeats(data.beats);
      void queryClient.invalidateQueries({ queryKey: ['content', 'pipeline', moduleId, episodeKey] });
    },
  });

  const commitMutation = useMutation({
    mutationFn: () => commitPipelineBeats(moduleId, { episodeKey, beats, reAnchorEveryN: 15 }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content', 'pipeline', moduleId, episodeKey] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => generateNextPipelineScene(moduleId, { episodeKey, model: videoModel }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content', 'pipeline', moduleId, episodeKey] });
    },
  });

  const approvalMutation = useMutation({
    mutationFn: (approved: boolean) =>
      approvePipelineScene(moduleId, activeSceneNumber, { episodeKey, approved }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content', 'pipeline', moduleId, episodeKey] });
    },
  });

  const displayBeats = useMemo(() => {
    if (beats.length > 0) {
      return beats;
    }
    return pipeline?.beatQueue ?? [];
  }, [beats, pipeline?.beatQueue]);

  const progressLabel =
    pipeline?.progressLabel ??
    (pipeline?.beatQueueCommitted
      ? `Scene ${activeSceneNumber} of ${displayBeats.length}`
      : 'Submit a script to begin');

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-black">
            <Clapperboard size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-dark)]">Video generation pipeline</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[var(--color-dark)]/70">
              Full script → automated beat breakdown → sequential scene generation with hard approval gates,
              last-frame continuity, and periodic character re-anchoring.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <label className="block text-sm font-semibold text-[var(--color-dark)]">
          Module
          <select
            className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-vanilla-cream)] px-3 py-2.5 text-sm"
            value={moduleId}
            onChange={(event) => {
              setModuleId(event.target.value);
              setBeats([]);
            }}
          >
            <option value="">Select a module…</option>
            {(modulesQuery.data ?? []).map((module) => (
              <option key={module._id} value={module._id}>
                {module.title}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-sm font-semibold text-[var(--color-dark)]">
          Full script / story
          <textarea
            className="mt-2 min-h-[180px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-vanilla-cream)] px-3 py-2.5 text-sm leading-relaxed"
            placeholder="Paste the full module script. An LLM will split it into ~10 second beats."
            value={script}
            onChange={(event) => setScript(event.target.value)}
            disabled={!moduleId}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!moduleId || script.length < 50 || breakdownMutation.isPending}
            onClick={() => breakdownMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-muted-olive)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {breakdownMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            Break into beats
          </button>
          <button
            type="button"
            disabled={displayBeats.length === 0 || commitMutation.isPending || pipeline?.beatQueueCommitted}
            onClick={() => commitMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-muted-olive)] px-4 py-2.5 text-sm font-semibold text-[var(--color-dark)] disabled:opacity-50"
          >
            Commit beat list
          </button>
        </div>
      </section>

      {displayBeats.length > 0 ? (
        <section className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-dark)]">
                Beat breakdown ({displayBeats.length} scenes)
              </h3>
              <p className="text-xs text-[var(--color-dark)]/65">
                Review, edit, then commit before spending generation credits.
              </p>
            </div>
            {pipeline?.beatQueueCommitted ? (
              <span className="rounded-full bg-[var(--color-tea-green)] px-3 py-1 text-xs font-semibold text-[var(--color-dark)]">
                Committed
              </span>
            ) : null}
          </div>
          <div className="grid max-h-[420px] gap-2 overflow-y-auto md:grid-cols-2">
            {displayBeats.map((beat, index) => (
              <BeatEditor
                key={`${beat.beatIndex}-${index}`}
                beat={beat}
                onChange={(next) => {
                  const copy = [...displayBeats];
                  copy[index] = { ...next, beatIndex: index };
                  setBeats(copy);
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {pipeline?.beatQueueCommitted ? (
        <section className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-dark)]">Scene generation</h3>
              <p className="mt-1 text-sm font-medium text-[var(--color-faded-copper)]">{progressLabel}</p>
            </div>
            <label className="text-xs font-semibold text-[var(--color-dark)]/70">
              Model
              <select
                className="ml-2 rounded border border-[var(--color-border)] bg-[var(--color-vanilla-cream)] px-2 py-1"
                value={videoModel}
                onChange={(event) => setVideoModel(event.target.value)}
              >
                <option value="openai:sora-2">OpenAI Sora 2</option>
                <option value="openai:sora-2-pro">OpenAI Sora 2 Pro</option>
                <option value="google:veo-3.1">Google Veo 3.1</option>
                <option value="xai:grok-imagine-video">Grok Imagine Video</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                generateMutation.isPending ||
                pipeline.status === 'complete' ||
                pipeline.status === 'awaiting_approval'
              }
              onClick={() => generateMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-dark)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {generateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Generate scene {activeSceneNumber}
            </button>
            {pipeline.status === 'awaiting_approval' ? (
              <>
                <button
                  type="button"
                  disabled={approvalMutation.isPending}
                  onClick={() => approvalMutation.mutate(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-muted-olive)] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Check size={16} /> Approve scene {activeSceneNumber}
                </button>
                <button
                  type="button"
                  disabled={approvalMutation.isPending}
                  onClick={() => approvalMutation.mutate(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-faded-copper)] px-4 py-2.5 text-sm font-semibold text-[var(--color-dark)]"
                >
                  <X size={16} /> Reject &amp; regenerate
                </button>
              </>
            ) : null}
          </div>

          {pipeline.status === 'complete' ? (
            <p className="mt-4 rounded-lg bg-[var(--color-tea-green)]/50 px-3 py-2 text-sm text-[var(--color-dark)]">
              All scenes approved — module pipeline complete.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
