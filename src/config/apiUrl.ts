import { config } from '@/config';

/** Studio API origin (no trailing slash), e.g. http://localhost:4005 */
export function getStudioOrigin(): string {
  return new URL(config.studioApiUrl).origin;
}

/** Absolute base for studio REST clients: http://localhost:4005/api/v1 */
export function apiV1Base(): string {
  return config.studioApiUrl.replace(/\/$/, '');
}

export const CONTENT_API_PREFIX = '/content' as const;
export const PUBLIC_CONTENT_API_PREFIX = '/public' as const;

export function contentApiPath(path = ''): string {
  const normalized = path.startsWith('/') ? path : path ? `/${path}` : '';
  return `${CONTENT_API_PREFIX}${normalized}`;
}

export function publicContentApiPath(path = ''): string {
  const normalized = path.startsWith('/') ? path : path ? `/${path}` : '';
  return `${PUBLIC_CONTENT_API_PREFIX}${normalized}`;
}

/**
 * Resolve a path to an absolute studio API URL.
 * Content Studio is called directly (no gateway).
 */
export function toGatewayUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized.startsWith('/api/')) {
    return `${getStudioOrigin()}${normalized}`;
  }
  return `${apiV1Base()}${normalized}`;
}
