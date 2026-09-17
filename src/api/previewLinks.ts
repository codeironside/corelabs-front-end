import apiClient from '@/lib/axios';
import { config } from '@/config';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface EpisodePreviewLink {
  id: string;
  label?: string;
  expiresAt: string;
  revokedAt?: string;
  scopes: Array<'master' | 'scenes' | 'thumbnail'>;
  allowedSceneNumbers?: number[];
  viewCount: number;
  createdAt: string;
}

export interface PublicEpisodePreview {
  title: string;
  durationSeconds: number;
  expiresAt: string;
  masterStreamToken?: string;
  thumbnailStreamToken?: string;
  scenes: Array<{
    sceneNumber: number;
    startSec: number;
    endSec: number;
    beatDescription?: string;
    streamToken: string;
  }>;
}

export function previewMediaUrl(token: string): string {
  return `${config.studioApiUrl}/public/preview-media?token=${encodeURIComponent(token)}`;
}

export async function createEpisodePreviewLink(episodeId: string, expiresInHours = 72): Promise<{ link: EpisodePreviewLink; token: string; path: string }> {
  const { data } = await apiClient.post<ApiResponse<{ link: EpisodePreviewLink; token: string; path: string }>>(
    `/content/episodes/${episodeId}/preview-links`,
    { expiresInHours, scopes: ['master', 'scenes', 'thumbnail'] },
  );
  return data.data;
}

export async function listEpisodePreviewLinks(episodeId: string): Promise<EpisodePreviewLink[]> {
  const { data } = await apiClient.get<ApiResponse<{ links: EpisodePreviewLink[] }>>(
    `/content/episodes/${episodeId}/preview-links`,
  );
  return data.data.links;
}

export async function revokeEpisodePreviewLink(episodeId: string, linkId: string): Promise<void> {
  await apiClient.delete(`/content/episodes/${episodeId}/preview-links/${linkId}`);
}

export async function getPublicEpisodePreview(token: string): Promise<PublicEpisodePreview> {
  const { data } = await apiClient.get<ApiResponse<{ preview: PublicEpisodePreview }>>(
    `/public/previews/${encodeURIComponent(token)}`,
  );
  return data.data.preview;
}
