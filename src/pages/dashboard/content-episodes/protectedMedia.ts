import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { toGatewayUrl } from '@/config/apiUrl';
import apiClient from '@/lib/axios';
import { studioStreamMediaUrl } from './studioMediaUrl';

type StreamTokenCacheEntry = {
  streamUrl: string;
  expiresAt: number;
};

const streamTokenCache = new Map<string, StreamTokenCacheEntry>();

function normalizeOriginUrl(originUrl: string): string {
  return studioStreamMediaUrl(originUrl) ?? originUrl;
}

function buildStreamUrl(token: string): string {
  return toGatewayUrl(`/api/v1/content/studio/media/stream?token=${encodeURIComponent(token)}`);
}

export function directStudioMediaUrl(originUrl: string | undefined): string | undefined {
  if (!originUrl?.trim()) return undefined;
  return normalizeOriginUrl(originUrl.trim());
}

async function issueProtectedStreamUrl(normalized: string): Promise<string> {
  const cached = streamTokenCache.get(normalized);
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.streamUrl;
  }

  const { data } = await apiClient.post<{
    success: boolean;
    data: { token: string; expiresAt: number };
  }>('/content/studio/media/stream-token', { url: normalized });

  const streamUrl = buildStreamUrl(data.data.token);
  streamTokenCache.set(normalized, {
    streamUrl,
    expiresAt: data.data.expiresAt,
  });
  return streamUrl;
}

export async function resolveProtectedMediaUrl(originUrl: string | undefined): Promise<string | undefined> {
  const direct = directStudioMediaUrl(originUrl);
  if (!direct) return undefined;

  try {
    return await issueProtectedStreamUrl(direct);
  } catch {
    return direct;
  }
}

export async function resolveProtectedAudioPlaybackUrl(originUrl: string | undefined): Promise<string | undefined> {
  const direct = directStudioMediaUrl(originUrl);
  if (!direct) return undefined;

  try {
    const streamUrl = await issueProtectedStreamUrl(direct);
    const response = await fetch(streamUrl);
    if (!response.ok) throw new Error('Protected audio stream failed');

    const mimeType = response.headers.get('content-type') ?? 'audio/mpeg';
    const buffer = await response.arrayBuffer();
    const blob = new Blob([buffer], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch {
    return direct;
  }
}

export function useProtectedMediaSrc(originUrl: string | undefined): {
  src: string | undefined;
  loading: boolean;
  error: boolean;
} {
  const [src, setSrc] = useState<string | undefined>();
  const [loading, setLoading] = useState(Boolean(originUrl));
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!originUrl?.trim()) {
      setSrc(undefined);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);

    void resolveProtectedMediaUrl(originUrl)
      .then((nextSrc) => {
        if (cancelled) return;
        setSrc(nextSrc);
        setLoading(false);
        setError(!nextSrc);
      })
      .catch(() => {
        if (cancelled) return;
        setSrc(directStudioMediaUrl(originUrl));
        setLoading(false);
        setError(false);
      });

    return () => {
      cancelled = true;
    };
  }, [originUrl]);

  return { src, loading, error };
}

export function useProtectedAudioSrc(originUrl: string | undefined): {
  src: string | undefined;
  loading: boolean;
  error: boolean;
} {
  const blobUrlRef = useRef<string | undefined>(undefined);
  const [src, setSrc] = useState<string | undefined>();
  const [loading, setLoading] = useState(Boolean(originUrl));
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!originUrl?.trim()) {
      setSrc(undefined);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);

    void resolveProtectedAudioPlaybackUrl(originUrl)
      .then((nextSrc) => {
        if (cancelled) return;
        if (nextSrc?.startsWith('blob:')) blobUrlRef.current = nextSrc;
        setSrc(nextSrc);
        setLoading(false);
        setError(!nextSrc);
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = directStudioMediaUrl(originUrl);
        setSrc(fallback);
        setLoading(false);
        setError(!fallback);
      });

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = undefined;
      }
    };
  }, [originUrl]);

  return { src, loading, error };
}

export function preventMediaContextMenu(event: MouseEvent): void {
  event.preventDefault();
}

export const protectedMediaSurfaceClass =
  'select-none [-webkit-user-select:none] [-webkit-user-drag:none] [user-drag:none]';

export const protectedVideoProps = {
  controls: false,
  controlsList: 'nodownload noplaybackrate noremoteplayback' as const,
  disablePictureInPicture: true,
  disableRemotePlayback: true,
  draggable: false,
  playsInline: true,
  preload: 'metadata' as const,
};
