import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, PencilLine, RefreshCcw, Square, X } from 'lucide-react';
import type { EpisodeSceneCard } from './storyboard';
import { sceneCatalogStatusLabel } from './sceneMediaState';
import { isSceneGenerationStuck } from './sceneApproval';

export function SceneApprovalActions({
  scene,
  busy = false,
  onApprove,
  onRetry,
  onEditRetry,
  onCancel,
}: {
  scene: EpisodeSceneCard;
  busy?: boolean;
  onApprove: (scene: EpisodeSceneCard) => void;
  onRetry: (scene: EpisodeSceneCard) => void;
  onEditRetry: (scene: EpisodeSceneCard, editedBeat: string) => void;
  onCancel?: (scene: EpisodeSceneCard) => void;
}) {
  const status = scene.catalogStatus;
  const stuck = isSceneGenerationStuck(scene);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(scene.visualPrompt);

  useEffect(() => {
    setRejectOpen(false);
    setEditOpen(false);
    setDraft(scene.visualPrompt);
  }, [scene.id, scene.catalogStatus, scene.visualPrompt]);

  if (!status || status === 'unrendered') {
    return <span className="text-[11px] font-semibold text-[var(--color-ash-brown)]">Unrendered</span>;
  }

  if ((status === 'generating' || status === 'queued') && !stuck) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-[var(--color-ash-brown)]">
          <Loader2 size={13} className="animate-spin" /> Generating
        </span>
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
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-muted-olive)]">
        <CheckCircle2 size={13} /> Approved
      </span>
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
