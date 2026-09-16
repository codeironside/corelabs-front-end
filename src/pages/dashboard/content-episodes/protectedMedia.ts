import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { toGatewayUrl } from '@/config/apiUrl';
import apiClient from '@/lib/axios';
import { studioStreamMediaUrl } from './studioMediaUrl';

type StreamTokenCacheEntry = {
  streamUrl: string;
  expiresAt: number;
};

const streamTokenCache = new Map<string, StreamTokenCacheEntry>();
const TOKEN_REFRESH_MARGIN_MS = 30_000;

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
  if (cached && cached.expiresAt > Date.now() + TOKEN_REFRESH_MARGIN_MS) {
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

function invalidateStreamToken(originUrl: string): void {
  streamTokenCache.delete(normalizeOriginUrl(originUrl));
}

function msUntilTokenRefresh(expiresAt: number): number {
  return Math.max(1_000, expiresAt - Date.now() - TOKEN_REFRESH_MARGIN_MS);
}

function canUseDirectMediaUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    if (host === 'firebasestorage.googleapis.com' || host === 'storage.googleapis.com') {
      return false;
    }
    if (host.endsWith('.firebasestorage.app') || host.endsWith('.appspot.com')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function resolveProtectedMediaUrl(originUrl: string | undefined): Promise<string | undefined> {
  const direct = directStudioMediaUrl(originUrl);
  if (!direct) return undefined;

  try {
    return await issueProtectedStreamUrl(direct);
  } catch {
    return canUseDirectMediaUrl(direct) ? direct : undefined;
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

export async function resolveProtectedVideoPlaybackUrl(originUrl: string | undefined): Promise<string | undefined> {
  const direct = directStudioMediaUrl(originUrl);
  if (!direct) return undefined;

  try {
    return await issueProtectedStreamUrl(direct);
  } catch {
    return undefined;
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
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    if (!originUrl?.trim()) {
      setSrc(undefined);
      setLoading(false);
      setError(false);
      return;
    }

    const load = async (force = false) => {
      if (force) invalidateStreamToken(originUrl);
      if (!force) {
        setLoading(true);
        setError(false);
      }
      try {
        const nextSrc = await resolveProtectedMediaUrl(originUrl);
        if (cancelled) return;
        setSrc(nextSrc);
        setLoading(false);
        setError(!nextSrc);
        const cached = streamTokenCache.get(normalizeOriginUrl(originUrl.trim()));
        if (cached) {
          if (refreshTimer) clearTimeout(refreshTimer);
          refreshTimer = setTimeout(() => {
            void load(true);
          }, msUntilTokenRefresh(cached.expiresAt));
        }
      } catch {
        if (cancelled) return;
        const fallback = directStudioMediaUrl(originUrl);
        const usable = fallback && canUseDirectMediaUrl(fallback) ? fallback : undefined;
        setSrc(usable);
        setLoading(false);
        setError(!usable);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [originUrl]);

  return { src, loading, error };
}

export function useProtectedVideoSrc(originUrl: string | undefined): {
  src: string | undefined;
  loading: boolean;
  error: boolean;
} {
  const [src, setSrc] = useState<string | undefined>();
  const [loading, setLoading] = useState(Boolean(originUrl));
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    if (!originUrl?.trim()) {
      setSrc(undefined);
      setLoading(false);
      setError(false);
      return;
    }

    const load = async (force = false) => {
      if (force) invalidateStreamToken(originUrl);
      if (!force) {
        setLoading(true);
        setError(false);
      }
      try {
        const nextSrc = await resolveProtectedVideoPlaybackUrl(originUrl);
        if (cancelled) return;
        setSrc(nextSrc);
        setLoading(false);
        setError(!nextSrc);
        const cached = streamTokenCache.get(normalizeOriginUrl(originUrl.trim()));
        if (cached) {
          if (refreshTimer) clearTimeout(refreshTimer);
          refreshTimer = setTimeout(() => {
            void load(true);
          }, msUntilTokenRefresh(cached.expiresAt));
        }
      } catch {
        if (cancelled) return;
        setSrc(undefined);
        setLoading(false);
        setError(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
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
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    if (!originUrl?.trim()) {
      setSrc(undefined);
      setLoading(false);
      setError(false);
      return;
    }

    const load = async (force = false) => {
      if (force) invalidateStreamToken(originUrl);
      if (!force) {
        setLoading(true);
        setError(false);
      }
      try {
        const nextSrc = await resolveProtectedAudioPlaybackUrl(originUrl);
        if (cancelled) return;
        if (blobUrlRef.current && blobUrlRef.current !== nextSrc) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = undefined;
        }
        if (nextSrc?.startsWith('blob:')) blobUrlRef.current = nextSrc;
        setSrc(nextSrc);
        setLoading(false);
        setError(!nextSrc);
        const cached = streamTokenCache.get(normalizeOriginUrl(originUrl.trim()));
        if (cached) {
          if (refreshTimer) clearTimeout(refreshTimer);
          refreshTimer = setTimeout(() => {
            void load(true);
          }, msUntilTokenRefresh(cached.expiresAt));
        }
      } catch {
        if (cancelled) return;
        const fallback = directStudioMediaUrl(originUrl);
        setSrc(fallback);
        setLoading(false);
        setError(!fallback);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
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
