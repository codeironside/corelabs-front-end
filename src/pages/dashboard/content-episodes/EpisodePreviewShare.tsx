import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Link2, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createEpisodePreviewLink,
  listEpisodePreviewLinks,
  revokeEpisodePreviewLink,
} from '@/api/previewLinks';

export function EpisodePreviewShare({ episodeId }: { episodeId?: string }): React.JSX.Element {
  const [renderedAt] = useState(() => Date.now());
  const queryClient = useQueryClient();
  const linksQuery = useQuery({
    queryKey: ['content', 'episodes', episodeId, 'preview-links'],
    queryFn: () => listEpisodePreviewLinks(episodeId as string),
    enabled: Boolean(episodeId),
    retry: false,
  });
  const createMutation = useMutation({
    mutationFn: () => createEpisodePreviewLink(episodeId as string, 72),
    onSuccess: async (result) => {
      const url = `${window.location.origin}${result.path}`;
      await navigator.clipboard.writeText(url);
      toast.success('Preview link copied. It expires in 72 hours.');
      void queryClient.invalidateQueries({ queryKey: ['content', 'episodes', episodeId, 'preview-links'] });
    },
    onError: () => toast.error('Could not create a preview link.'),
  });
  const revokeMutation = useMutation({
    mutationFn: (linkId: string) => revokeEpisodePreviewLink(episodeId as string, linkId),
    onSuccess: () => {
      toast.success('Preview link revoked.');
      void queryClient.invalidateQueries({ queryKey: ['content', 'episodes', episodeId, 'preview-links'] });
    },
    onError: () => toast.error('Could not revoke the preview link.'),
  });

  const activeLinks = (linksQuery.data ?? []).filter((link) => !link.revokedAt && new Date(link.expiresAt).getTime() > renderedAt);

  return (
    <section className="rounded-xl border border-border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Link2 size={16} /><h3 className="text-sm font-semibold text-dark">Share an unlisted preview</h3></div>
          <p className="mt-1 text-xs text-dark/55">Approved scenes and the assembled cut are streamed securely. Links expire and can be revoked.</p>
        </div>
        <button
          type="button"
          disabled={!episodeId || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="inline-flex items-center gap-2 rounded-full bg-dark px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          {createMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
          Create & copy link
        </button>
      </div>
      {activeLinks.length > 0 ? (
        <div className="mt-4 space-y-2">
          {activeLinks.map((link) => (
            <div key={link.id} className="flex items-center justify-between gap-3 rounded-lg bg-black/5 px-3 py-2 text-xs">
              <span className="inline-flex items-center gap-2 text-dark/65"><Check size={13} /> Active · expires {new Date(link.expiresAt).toLocaleString()} · {link.viewCount} views</span>
              <button type="button" onClick={() => revokeMutation.mutate(link.id)} disabled={revokeMutation.isPending} className="inline-flex items-center gap-1 text-red-700"><Trash2 size={12} /> Revoke</button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs text-dark/40">No active preview links.</p>
      )}
    </section>
  );
}
