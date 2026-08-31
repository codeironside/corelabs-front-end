import type { ContentModule } from '@/api/content';

export type ModuleCover = { url: string; kind: 'video' | 'image' };

export function resolveModuleCover(m: ContentModule | null): ModuleCover | null {
  if (!m) return null;
  const v = m.coverVideoUrl?.trim();
  if (v) return { url: v, kind: 'video' };
  const img = m.coverImageUrl?.trim() || m.referenceImages?.[0]?.cloudinaryUrl?.trim();
  if (img) return { url: img, kind: 'image' };
  return null;
}

export function moduleThumbPreview(m: ContentModule): ModuleCover | null {
  const img = m.coverImageUrl?.trim() || m.referenceImages?.[0]?.cloudinaryUrl?.trim();
  if (img) return { url: img, kind: 'image' };
  const v = m.coverVideoUrl?.trim();
  if (v) return { url: v, kind: 'video' };
  return null;
}
