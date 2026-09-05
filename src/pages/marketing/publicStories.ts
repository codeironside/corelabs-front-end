export type PublicEpisodePlatform = "youtube" | "tiktok" | "instagram";

export interface PublicEpisodePlayback {
  episodeId?: string;
  moduleId: string;
  title: string;
  youtubeVideoId?: string;
  coverImageUrl?: string;
  coverVideoUrl?: string;
  socialLinks?: Array<{ platform: string; url?: string; postId?: string; status?: string }>;
  platforms: string[];
  publishing?: Array<{ platform: string; status: string; externalUrl?: string }>;
}

export interface PublicStoryCard {
  slug: string;
  title: string;
  summary?: string;
  themeTitle?: string;
  authorName?: string;
  coverImageUrl?: string;
  coverVideoUrl?: string;
  firstVideo?: {
    coverImageUrl?: string;
    coverVideoUrl?: string;
    platforms: string[];
  };
}

export interface PublicStoryDetail extends PublicStoryCard {
  intro?: PublicEpisodePlayback | null;
  episodes: PublicEpisodePlayback[];
}

function publishedWatchLinks(episode: PublicEpisodePlayback): Array<{ platform: PublicEpisodePlatform; url: string }> {
  const links = new Map<PublicEpisodePlatform, string>();
  for (const row of episode.publishing ?? []) {
    if (row.status !== "published" || !row.externalUrl) continue;
    if (row.platform === "youtube" || row.platform === "tiktok" || row.platform === "instagram") {
      links.set(row.platform, row.externalUrl);
    }
  }
  for (const link of episode.socialLinks ?? []) {
    if (!link.url) continue;
    if (link.platform === "youtube" || link.platform === "tiktok" || link.platform === "instagram") {
      if (!links.has(link.platform)) links.set(link.platform, link.url);
    }
  }
  return Array.from(links.entries()).map(([platform, url]) => ({ platform, url }));
}

export function episodeWatchPlatforms(episode: PublicEpisodePlayback): Array<{ platform: PublicEpisodePlatform; url: string }> {
  return publishedWatchLinks(episode);
}
