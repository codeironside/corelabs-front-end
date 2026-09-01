import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Check, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  approvePipelineScene,
  commitPipelineBeats,
  generateNextPipelineScene,
  getModulePipeline,
  runPipelineBreakdown,
  type SceneBeat,
} from '@/api/content';
import type { EpisodeSceneCard } from './storyboard';
import { beatsToSceneCards } from './episodePipeline';
import { VirtualizedSceneBoard } from './VirtualizedSceneBoard';

interface EpisodePipelineFlowProps {
  moduleId: string;
  episodeKey: string;
  episodeTitle: string;
  script: string;
  videoModel: string;
  audioTimelineUrl?: string;
  audioReady: boolean;
  onBeatsCommitted: (scenes: EpisodeSceneCard[]) => void;
}

export function EpisodePipelineFlow({
  moduleId,
  episodeKey,
  episodeTitle,
  script,
  videoModel,
  audioTimelineUrl,
  audioReady,
  onBeatsCommitted,
}: EpisodePipelineFlowProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [beats, setBeats] = useState<SceneBeat[]>([]);
  const [reviewCommitted, setReviewCommitted] = useState(false);
  const [editBeatDraft, setEditBeatDraft] = useState<SceneBeat | null>(null);

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
  const scriptMismatch = Boolean(
    pipeline?.fullScript?.trim()
    && script.trim()
    && pipeline.fullScript.trim() !== script.trim(),
  );
  const displayBeats = scriptMismatch
    ? beats
    : beats.length > 0
      ? beats
      : (pipeline?.beatQueue ?? []);
  const activeSceneNumber = pipeline ? pipeline.currentSceneIndex + 1 : 1;
  const queueCommitted = reviewCommitted || Boolean(pipeline?.beatQueueCommitted && !scriptMismatch);

  const progressLabel = useMemo(() => {
    if (scriptMismatch) {
      return 'This episode script changed since the last breakdown. Re-run beat breakdown to refresh the queue.';
    }
    if (!displayBeats.length) return 'Paste your script in Section 1, finalize audio, then break it into beats.';
    if (!queueCommitted) return `Review ${displayBeats.length} generated beats before starting video generation.`;
    if (pipeline?.status === 'awaiting_approval') {
      return `Scene ${activeSceneNumber} of ${displayBeats.length} — awaiting your approval`;
    }
    if (pipeline?.status === 'complete') return 'All scenes approved. Continue to timeline stitch and publishing.';
    return pipeline?.progressLabel ?? `Scene ${activeSceneNumber} of ${displayBeats.length}`;
  }, [activeSceneNumber, displayBeats.length, pipeline, queueCommitted, scriptMismatch]);

  const breakdownMutation = useMutation({
    mutationFn: () =>
      runPipelineBreakdown(moduleId, {
        episodeKey,
        episodeTitle: episodeTitle.trim() || 'Untitled episode',
        script,
        audioTimelineUrl,
        targetBeatDurationSec: 10,
      }),
    onSuccess: (data) => {
      setBeats(data.beats);
      setReviewCommitted(false);
      toast.success(`Generated ${data.beats.length} scene beats.`);
      void queryClient.invalidateQueries({ queryKey: ['content', 'pipeline', moduleId, episodeKey] });
    },
    onError: () => toast.error('Could not break script into scene beats.'),
  });

  const commitMutation = useMutation({
    mutationFn: () =>
      commitPipelineBeats(moduleId, {
        episodeKey,
        beats: displayBeats,
        reAnchorEveryN: 15,
      }),
    onSuccess: () => {
      setReviewCommitted(true);
      onBeatsCommitted(beatsToSceneCards(displayBeats));
      toast.success('Scene queue committed.');
      void queryClient.invalidateQueries({ queryKey: ['content', 'pipeline', moduleId, episodeKey] });
    },
    onError: () => toast.error('Could not commit beat queue.'),
  });

  const generateMutation = useMutation({
    mutationFn: () => generateNextPipelineScene(moduleId, { episodeKey, model: videoModel }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content', 'pipeline', moduleId, episodeKey] });
      void queryClient.invalidateQueries({ queryKey: ['content', 'episodes'] });
    },
    onError: () => toast.error('Scene generation failed.'),
  });

  const approvalMutation = useMutation({
    mutationFn: (payload: { approved: boolean; editedBeat?: Partial<SceneBeat> }) =>
      approvePipelineScene(moduleId, activeSceneNumber, { episodeKey, ...payload }),
    onSuccess: (_data, variables) => {
      toast.success(variables.approved ? 'Scene approved.' : 'Scene rejected — regenerate when ready.');
      setEditBeatDraft(null);
      void queryClient.invalidateQueries({ queryKey: ['content', 'pipeline', moduleId, episodeKey] });
    },
    onError: () => toast.error('Could not record scene approval.'),
  });

  function updateBeat(index: number, next: SceneBeat) {
    setBeats((current) => {
      const source = current.length > 0 ? current : displayBeats;
      return source.map((beat) => (beat.beatIndex === index ? next : beat));
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[var(--color-tea-green)] bg-[var(--color-tea-green)]/15 p-4">
        <p className="text-sm font-semibold text-dark">Unified scene pipeline</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          This pipeline is scoped to <span className="font-semibold text-dark">{episodeTitle.trim() || 'this episode'}</span> under the selected parent module. Module theme and routing are inherited; the Section 1 script drives beat breakdown and scene generation.
        </p>
        <p className="mt-3 text-xs font-semibold text-[var(--color-ash-brown)]">{progressLabel}</p>
      </div>

      {scriptMismatch ? (
        <div className="rounded-xl border border-[var(--color-faded-copper)]/50 bg-[var(--color-faded-copper)]/10 p-4 text-xs leading-relaxed text-[var(--color-ash-brown)]">
          The saved pipeline belongs to a previous version of this episode script. Re-run breakdown so beats match your current Base Textual Prompt.
        </div>
      ) : null}

      {!audioReady ? (
        <div className="rounded-xl border border-[var(--color-faded-copper)]/40 bg-white p-4 text-xs leading-relaxed text-muted">
          Generate or upload the full episode audio track in the Voice-Over panel before breaking the script into timed beats.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!moduleId || !episodeKey || !script.trim() || !audioReady || breakdownMutation.isPending}
          onClick={() => breakdownMutation.mutate()}
          className="studio-touch-target-inline inline-flex items-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45"
        >
          {breakdownMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          Break script into scene beats
        </button>

        <button
          type="button"
          disabled={!displayBeats.length || queueCommitted || commitMutation.isPending}
          onClick={() => commitMutation.mutate()}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-ash-brown)] disabled:opacity-45"
        >
          {commitMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          Commit scene queue
        </button>
      </div>

      <VirtualizedSceneBoard beats={displayBeats} editable={!queueCommitted} onChangeBeat={updateBeat} />

      {queueCommitted ? (
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-dark">Sequential scene generation</p>
              <p className="mt-1 text-xs text-muted">Scene {activeSceneNumber} is active. Approve each clip before the next begins.</p>
            </div>
            <button
              type="button"
              disabled={generateMutation.isPending || pipeline?.status === 'generating' || pipeline?.status === 'complete'}
              onClick={() => generateMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-ash-brown)] px-3 py-2 text-xs font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45"
            >
              {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Generate next scene
            </button>
          </div>

          {pipeline?.status === 'awaiting_approval' ? (
            <div className="mt-4 space-y-3 rounded-lg border border-[var(--color-tea-green)] p-3">
              <p className="text-xs font-semibold text-dark">Scene {activeSceneNumber} is ready for review</p>
              {editBeatDraft ? (
                <textarea
                  className="input-field min-h-[90px] text-xs"
                  value={editBeatDraft.actionSummary}
                  onChange={(event) => setEditBeatDraft({ ...editBeatDraft, actionSummary: event.target.value })}
                />
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => approvalMutation.mutate({ approved: true })}
                  disabled={approvalMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-muted-olive)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-45"
                >
                  <Check size={13} /> Approve scene
                </button>
                <button
                  type="button"
                  onClick={() => approvalMutation.mutate({ approved: false })}
                  disabled={approvalMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-dark disabled:opacity-45"
                >
                  <RefreshCw size={13} /> Regenerate as-is
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const beat = displayBeats[activeSceneNumber - 1];
                    if (!beat) return;
                    setEditBeatDraft(beat);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-dark"
                >
                  Edit beat
                </button>
                {editBeatDraft ? (
                  <button
                    type="button"
                    onClick={() => approvalMutation.mutate({ approved: false, editedBeat: editBeatDraft })}
                    disabled={approvalMutation.isPending}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-muted-olive)] px-3 py-2 text-xs font-semibold text-[var(--color-ash-brown)] disabled:opacity-45"
                  >
                    Save beat & regenerate
                  </button>
                ) : null}
                <button type="button" onClick={() => setEditBeatDraft(null)} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-muted">
                  <X size={13} />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
