import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, Loader2, PlugZap, Unplug } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  disconnectSocialConnection,
  getSocialConnectUrls,
  listSocialConnections,
  type SocialConnection,
} from '@/api/content';

type SocialPlatform = SocialConnection['platform'];

const PLATFORM_COPY: Record<SocialPlatform, { label: string; hint: string }> = {
  youtube: {
    label: 'YouTube',
    hint: 'Publish stitched episode MP4s to a linked channel.',
  },
  tiktok: {
    label: 'TikTok',
    hint: 'Post vertical episode renders to a linked creator account.',
  },
  instagram: {
    label: 'Instagram',
    hint: 'Share episode reels via a linked Instagram professional account.',
  },
};

function connectionForPlatform(
  connections: SocialConnection[],
  platform: SocialPlatform,
): SocialConnection | undefined {
  return connections.find((connection) => connection.platform === platform);
}

export function StudioIntegrationsPanel(): React.JSX.Element {
  const queryClient = useQueryClient();

  const { data: connectUrls, isLoading: urlsLoading } = useQuery({
    queryKey: ['content', 'social', 'connect-urls'],
    queryFn: getSocialConnectUrls,
  });

  const { data: connections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ['content', 'social', 'connections'],
    queryFn: listSocialConnections,
  });

  const disconnectMut = useMutation({
    mutationFn: disconnectSocialConnection,
    onSuccess: (_data, platform) => {
      queryClient.invalidateQueries({ queryKey: ['content', 'social', 'connections'] });
      toast.success(`${PLATFORM_COPY[platform].label} disconnected.`);
    },
    onError: () => toast.error('Could not disconnect account.'),
  });

  const loading = urlsLoading || connectionsLoading;

  function authorizeUrl(platform: SocialPlatform): string | null {
    if (!connectUrls) return null;
    if (platform === 'youtube') return connectUrls.youtube;
    if (platform === 'tiktok') return connectUrls.tiktok;
    return connectUrls.instagram;
  }

  function handleConnect(platform: SocialPlatform) {
    const url = authorizeUrl(platform);
    if (!url) {
      toast.error(`${PLATFORM_COPY[platform].label} OAuth is not configured on the server yet.`);
      return;
    }
    window.location.assign(url);
  }

  return (
    <section className="studio-glass rounded-xl p-5">
      <div className="mb-5 flex items-start gap-3">
        <div className="studio-glass-subtle flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <PlugZap size={18} className="text-white/80" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Publishing integrations</h2>
          <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-white/60">
            Link YouTube, TikTok, and Instagram once, then publish episodes — each episode is a single social-ready video under its parent module.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="studio-glass-subtle flex items-center justify-center gap-2 rounded-xl p-10 text-sm text-white/70">
          <Loader2 size={16} className="animate-spin" />
          Loading connection status...
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          {(Object.keys(PLATFORM_COPY) as SocialPlatform[]).map((platform) => {
            const connected = connectionForPlatform(connections, platform);
            const oauthReady = Boolean(authorizeUrl(platform));
            const label = PLATFORM_COPY[platform].label;
            return (
              <div
                key={platform}
                className={`studio-glass-subtle rounded-xl border p-4 ${
                  connected ? 'border-emerald-400/35' : 'border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                      {PLATFORM_COPY[platform].hint}
                    </p>
                  </div>
                  {connected ? (
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-300" />
                  ) : null}
                </div>

                <div className="mt-4 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/70">
                  {connected ? (
                    <>
                      <span className="font-semibold text-white/90">
                        {connected.displayName || connected.channelId || connected.openId || 'Linked account'}
                      </span>
                      {connected.channelId && connected.displayName ? (
                        <span className="mt-1 block text-white/50">{connected.channelId}</span>
                      ) : null}
                    </>
                  ) : oauthReady ? (
                    'Not connected yet.'
                  ) : (
                    'Server OAuth credentials are not configured for this platform.'
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {!connected && oauthReady ? (
                    <button
                      type="button"
                      onClick={() => handleConnect(platform)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-[var(--color-ash-brown)] hover:bg-white"
                    >
                      <ExternalLink size={13} />
                      Connect {label}
                    </button>
                  ) : null}
                  {connected ? (
                    <button
                      type="button"
                      onClick={() => disconnectMut.mutate(platform)}
                      disabled={disconnectMut.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white/80 hover:border-white/35 disabled:opacity-45"
                    >
                      {disconnectMut.isPending ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Unplug size={13} />
                      )}
                      Disconnect
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-white/45">
        After linking, open Episodes, render a module video, then use Manual Publishing on the review step to post to a connected channel.
      </p>
    </section>
  );
}
