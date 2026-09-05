import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Check, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  approvePipelineScene,
  breakEpisodeIntoBeats,
  commitEpisodeScenes,
  generateNextPipelineScene,
  getModulePipeline,
  splitEpisodeChapters,
  type DraftSceneBeat,
  type EpisodeCharacterSelectorChoice,
  type FailedChapter,
  type SceneBeat,
} from '@/api/content';
import { needsChapterSplit } from './episodePipeline';
import { timestamp } from './storyboard';
import { VirtualizedSceneBoard } from './VirtualizedSceneBoard';
import { approvalProgress } from './sceneApproval';

function apiErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'response' in error
    && typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message;
  }
  return fallback;
}

function draftToSceneBeat(beat: DraftSceneBeat): SceneBeat {
  return {
    beatIndex: beat.order - 1,
    durationSec: Math.max(1, beat.endSeconds - beat.startSeconds),
    characterHandles: beat.characterMentions,
    setting: `${timestamp(beat.startSeconds)}–${timestamp(beat.endSeconds)}`,
    actionSummary: beat.beatDescription,
    dialogueSummary: '',
    complexity: 'simple',
    chapterIndex: beat.chapterIndex ?? 0,
    chapterTitle: `Chapter ${(beat.chapterIndex ?? 0) + 1}`,
  };
}

function sceneBeatToDraft(beat: SceneBeat, previous?: DraftSceneBeat): DraftSceneBeat {
  const startSeconds = previous?.startSeconds ?? beat.beatIndex * beat.durationSec;
  return {
    order: beat.beatIndex + 1,
    startSeconds,
    endSeconds: previous?.endSeconds ?? startSeconds + beat.durationSec,
    beatDescription: beat.actionSummary,
    characterMentions: beat.characterHandles ?? previous?.characterMentions ?? [],
    chapterIndex: previous?.chapterIndex ?? beat.chapterIndex ?? 0,
    breakdownStatus: previous?.breakdownStatus ?? 'ready',
  };
}

interface EpisodePipelineFlowProps {
  moduleId: string;
  episodeId?: string;
  episodeKey: string;
  episodeTitle: string;
  script: string;
  videoModel: string;
  audioReady: boolean;
  runtimeTargetSeconds: number;
  selectedCharacters: EpisodeCharacterSelectorChoice[];
  onScenesCommitted: (episodeId: string) => void;
}

export function EpisodePipelineFlow({
  moduleId,
  episodeId,
  episodeKey,
  episodeTitle,
  script,
  videoModel,
  audioReady,
  runtimeTargetSeconds,
  selectedCharacters,
  onScenesCommitted,
}: EpisodePipelineFlowProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [draftBeats, setDraftBeats] = useState<DraftSceneBeat[]>([]);
  const [failedChapters, setFailedChapters] = useState<FailedChapter[]>([]);
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
  const displayBeats = draftBeats.map(draftToSceneBeat);
  const activeSceneNumber = pipeline ? pipeline.currentSceneIndex + 1 : 1;
  const queueCommitted = reviewCommitted || Boolean(pipeline?.beatQueueCommitted && draftBeats.length === 0);
  const canBreak = Boolean(episodeId && script.trim() && audioReady);

  const progressLabel = useMemo(() => {
    if (!episodeId) return 'Save the episode in Section 1 first so scene beats can attach to it.';
    if (!audioReady) {
      return 'Generate or upload the full episode audio track in the Voice-Over panel before breaking the script into timed beats.';
    }
    if (!script.trim()) return 'Add a Base Textual Prompt in Episode Initialization before breaking the script into scene beats.';
    if (pipeline?.status === 'awaiting_approval') {
      const beats = displayBeats.length ? displayBeats : pipeline.beatQueue;
      const records = beats.map((beat, index) => {
        const sceneNumber = (beat.beatIndex ?? index) + 1;
        return {
          sceneNumber,
          catalogStatus: sceneNumber === activeSceneNumber
            ? 'pending_approval' as const
            : sceneNumber < activeSceneNumber
              ? 'approved' as const
              : 'unrendered' as const,
          chapterIndex: beat.chapterIndex,
        };
      });
      if (records.length) return approvalProgress(records).text;
      return `Scene ${activeSceneNumber} of ${displayBeats.length || pipeline.beatQueue.length} — awaiting your approval`;
    }
    if (pipeline?.status === 'complete') return 'All scenes approved. Continue to timeline stitch and publishing.';
    if (!displayBeats.length) return 'Break the script into timed beats, review the draft once, then commit the scene queue.';
    if (!queueCommitted) return `Review ${displayBeats.length} generated beats before committing the scene queue.`;
    return pipeline?.progressLabel ?? 'Scene queue committed. Refine clips in Committed Scene Cards below.';
  }, [activeSceneNumber, audioReady, displayBeats, episodeId, pipeline, queueCommitted, script]);

  const breakdownMutation = useMutation({
    mutationFn: async () => {
      if (!episodeId) throw new Error('Save the episode first.');
      if (needsChapterSplit(script, runtimeTargetSeconds)) {
        await splitEpisodeChapters(episodeId);
      }
      return breakEpisodeIntoBeats(episodeId);
    },
    onSuccess: (data) => {
      setDraftBeats(data.beats);
      setFailedChapters(data.failedChapters ?? []);
      setReviewCommitted(false);
      if (data.failedChapters?.length) {
        toast.error(`${data.failedChapters.length} chapter${data.failedChapters.length === 1 ? '' : 's'} failed. Retry those chapters before committing.`);
      } else {
        toast.success(`Generated ${data.beats.length} scene beats. Review them, then commit.`);
      }
      void queryClient.invalidateQueries({ queryKey: ['content', 'episodes'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not break script into scene beats.')),
  });

  const retryChapterMutation = useMutation({
    mutationFn: (chapterIndex: number) => {
      if (!episodeId) throw new Error('Save the episode first.');
      return breakEpisodeIntoBeats(episodeId, { chapterIndex, priorBeats: draftBeats });
    },
    onSuccess: (data, chapterIndex) => {
      setDraftBeats(data.beats);
      setFailedChapters(data.failedChapters ?? []);
      if (data.failedChapters?.some((item) => item.chapterIndex === chapterIndex)) {
        toast.error(`Chapter ${chapterIndex + 1} still failed.`);
      } else {
        toast.success(`Chapter ${chapterIndex + 1} beats ready.`);
      }
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not retry that chapter.')),
  });

  const commitMutation = useMutation({
    mutationFn: () =>
      commitEpisodeScenes(episodeId as string, {
        beats: draftBeats,
        selectedCharacters,
      }),
    onSuccess: (result) => {
      setDraftBeats([]);
      setFailedChapters([]);
      setReviewCommitted(true);
      onScenesCommitted(result.episode._id);
      toast.success(`Scene queue committed (${result.sceneCount} scenes).`);
      void queryClient.invalidateQueries({ queryKey: ['content', 'episodes'] });
      void queryClient.invalidateQueries({ queryKey: ['content', 'episodes', moduleId] });
      void queryClient.invalidateQueries({ queryKey: ['content', 'episodes', result.episode._id, 'scenes'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not commit scene queue.')),
  });

  const generateMutation = useMutation({
    mutationFn: () => generateNextPipelineScene(moduleId, { episodeKey, model: videoModel }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content', 'pipeline', moduleId, episodeKey] });
      void queryClient.invalidateQueries({ queryKey: ['content', 'episodes'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Scene generation failed.')),
  });

  const approvalMutation = useMutation({
    mutationFn: (payload: { approved: boolean; editedBeat?: Partial<SceneBeat> }) =>
      approvePipelineScene(moduleId, activeSceneNumber, { episodeKey, ...payload }),
    onSuccess: (_data, variables) => {
      toast.success(variables.approved ? 'Scene approved.' : 'Scene rejected — regenerate when ready.');
      setEditBeatDraft(null);
      void queryClient.invalidateQueries({ queryKey: ['content', 'pipeline', moduleId, episodeKey] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not record scene approval.')),
  });

  function updateBeat(index: number, next: SceneBeat) {
    setDraftBeats((current) =>
      current.map((beat) => (beat.order - 1 === index ? sceneBeatToDraft(next, beat) : beat)),
    );
  }

  const gateMessage = !episodeId
    ? 'Save the episode in Section 1 first. Scene beats attach to a persisted episode, not an unsaved draft.'
    : !audioReady
      ? 'Generate or upload the full episode audio track in the Voice-Over panel before breaking the script into timed beats. Check “Episode audio finalized for beat breakdown” in the Voice-Over Control Panel.'
      : !script.trim()
        ? 'Add a Base Textual Prompt in Episode Initialization before breaking the script into scene beats.'
        : null;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[var(--color-tea-green)] bg-[var(--color-tea-green)]/15 p-4">
        <p className="text-sm font-semibold text-dark">Unified scene pipeline</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          This pipeline is scoped to <span className="font-semibold text-dark">{episodeTitle.trim() || 'this episode'}</span> under the selected parent module. Module theme and routing are inherited; the Section 1 script drives beat breakdown and scene generation.
        </p>
        <p className="mt-3 text-xs font-semibold text-[var(--color-ash-brown)]">{progressLabel}</p>
      </div>

      {gateMessage ? (
        <div className="rounded-xl border border-[var(--color-faded-copper)]/40 bg-white p-4 text-xs leading-relaxed text-muted">
          {gateMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canBreak || breakdownMutation.isPending || retryChapterMutation.isPending}
          onClick={() => breakdownMutation.mutate()}
          className="studio-touch-target-inline inline-flex items-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45"
        >
          {breakdownMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          Break script into scene beats
        </button>

        <button
          type="button"
          disabled={!episodeId || !audioReady || !draftBeats.length || failedChapters.length > 0 || commitMutation.isPending}
          onClick={() => commitMutation.mutate()}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-ash-brown)] disabled:opacity-45"
        >
          {commitMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          Commit scene queue
        </button>
      </div>

      {failedChapters.length > 0 ? (
        <div className="space-y-2">
          {failedChapters.map((failed) => (
            <div key={failed.chapterIndex} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--color-faded-copper)]/50 bg-white p-4">
              <p className="text-xs leading-relaxed text-[var(--color-ash-brown)]">
                Chapter {failed.chapterIndex + 1} pending: {failed.error}
              </p>
              <button
                type="button"
                disabled={retryChapterMutation.isPending || breakdownMutation.isPending}
                onClick={() => retryChapterMutation.mutate(failed.chapterIndex)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-muted-olive)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ash-brown)] disabled:opacity-45"
              >
                {retryChapterMutation.isPending && retryChapterMutation.variables === failed.chapterIndex
                  ? <Loader2 size={13} className="animate-spin" />
                  : <RefreshCw size={13} />}
                Retry chapter
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <VirtualizedSceneBoard beats={displayBeats} editable={draftBeats.length > 0} onChangeBeat={updateBeat} />

      {queueCommitted && pipeline?.beatQueueCommitted ? (
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-dark">Sequential scene generation</p>
              <p className="mt-1 text-xs text-muted">{progressLabel}</p>
            </div>
            <button
              type="button"
              disabled={generateMutation.isPending || pipeline?.status === 'generating' || pipeline?.status === 'complete'}
              onClick={() => generateMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-ash-brown)] px-3 py-2 text-xs font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45"
            >
              {generateMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={14} />}
              Generate next scene
            </button>
          </div>

          {pipeline?.status === 'awaiting_approval' ? (
            <div className="mt-4 space-y-3 rounded-lg border border-[var(--color-tea-green)] p-3">
              <p className="text-xs font-semibold text-dark">{progressLabel}</p>
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
                    const beat = displayBeats[activeSceneNumber - 1] ?? pipeline.beatQueue[activeSceneNumber - 1];
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
