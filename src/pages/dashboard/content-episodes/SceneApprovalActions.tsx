import { useState } from 'react';
import { CheckCircle2, Loader2, PencilLine, RefreshCcw, Sparkles, Square, X } from 'lucide-react';
import type { EpisodeSceneCard } from './storyboard';
import { sceneCatalogStatusLabel } from './sceneMediaState';
import { isSceneGenerationStuck } from './sceneApproval';

const GENERATION_STAGE_LABEL: Record<NonNullable<EpisodeSceneCard['generationStage']>, string> = {
  queued: 'Queued',
  starting_model: 'Starting model',
  generating_segment_1: 'Generating segment 1 of 2',
  generating_segment_2: 'Generating segment 2 of 2',
  assembling: 'Assembling segments',
  persisting: 'Saving video',
  awaiting_approval: 'Ready for approval',
  failed: 'Generation failed',
  cancelled: 'Generation cancelled',
};

export function SceneApprovalActions({
  scene,
  busy = false,
  onApprove,
  onRetry,
  onEditRetry,
  onCancel,
  onGenerate,
}: {
  scene: EpisodeSceneCard;
  busy?: boolean;
  onApprove: (scene: EpisodeSceneCard) => void;
  onRetry: (scene: EpisodeSceneCard) => void;
  onEditRetry: (scene: EpisodeSceneCard, editedBeat: string) => void;
  onCancel?: (scene: EpisodeSceneCard) => void;
  onGenerate?: (scene: EpisodeSceneCard) => void;
}) {
  const status = scene.catalogStatus;
  const stuck = isSceneGenerationStuck(scene);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(scene.visualPrompt);

  if (!status || status === 'unrendered') {
    if (onGenerate) {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => onGenerate(scene)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-ash-brown)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45"
        >
          <Sparkles size={12} /> Generate scene {scene.sceneNumber}
        </button>
      );
    }
    return <span className="text-[11px] font-semibold text-[var(--color-ash-brown)]">Unrendered</span>;
  }

  if ((status === 'generating' || status === 'queued') && !stuck) {
    const stageLabel = scene.generationStage
      ? GENERATION_STAGE_LABEL[scene.generationStage]
      : 'Generating';
    return (
      <div className="min-w-[180px] space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-[var(--color-ash-brown)]">
            <Loader2 size={13} className="animate-spin" /> {stageLabel}
          </span>
          {scene.sceneVideoUrl ? <span className="text-[10px] text-black/45">Previous take remains playable</span> : null}
        {onCancel ? (
          <button
            type="button"
            onClick={() => onCancel(scene)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-semibold text-red-700"
          >
            <Square size={11} /> Stop
          </button>
        ) : null}
        </div>
        {typeof scene.generationPct === 'number' ? (
          <div className="h-1.5 overflow-hidden rounded-full bg-black/10" aria-label={`${scene.generationPct}% complete`}>
            <div className="h-full rounded-full bg-[var(--color-ash-brown)] transition-all" style={{ width: `${Math.max(0, Math.min(100, scene.generationPct))}%` }} />
          </div>
        ) : null}
      </div>
    );
  }

  if (stuck || status === 'failed') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-red-700">Generation may have failed</span>
        {onCancel && (status === 'generating' || status === 'queued') ? (
          <button
            type="button"
            onClick={() => onCancel(scene)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-semibold text-red-700"
          >
            <Square size={11} /> Stop
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => onRetry(scene)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 disabled:opacity-45"
        >
          <RefreshCcw size={12} /> Retry
        </button>
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-muted-olive)]">
          <CheckCircle2 size={13} /> Approved
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => onRetry(scene)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-dark disabled:opacity-45"
        >
          <RefreshCcw size={12} /> Retry
        </button>
      </div>
    );
  }

  if (status !== 'pending_approval' && status !== 'rejected' && status !== 'ready') {
    return <span className="text-[11px] font-semibold text-[var(--color-ash-brown)]">{sceneCatalogStatusLabel(status)}</span>;
  }

  return (
    <div className="space-y-2">
      {status === 'pending_approval' || status === 'ready' ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onApprove(scene)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-muted-olive)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45"
          >
            <CheckCircle2 size={12} /> Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setRejectOpen((open) => !open);
              setEditOpen(false);
              setDraft(scene.visualPrompt);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-dark disabled:opacity-45"
          >
            <X size={12} /> Reject
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => onRetry(scene)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-dark disabled:opacity-45"
        >
          <RefreshCcw size={12} /> Try Again
        </button>
      )}

      {rejectOpen ? (
        <div className="rounded-lg border border-border bg-white p-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onRetry(scene)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-ash-brown)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45"
            >
              <RefreshCcw size={12} /> Try Again
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-dark disabled:opacity-45"
            >
              <PencilLine size={12} /> Edit & Try Again
            </button>
          </div>
          {editOpen ? (
            <form
              className="mt-2 space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                const next = draft.trim();
                if (!next) return;
                onEditRetry(scene, next);
              }}
            >
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={3}
                className="input-field text-xs"
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-muted-olive)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45"
              >
                Save beat & regenerate
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
