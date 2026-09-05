import { useState } from "react";
import { Link } from "react-router-dom";
import { PlatformEmbed } from "./PlatformEmbed";
import { episodeWatchPlatforms, type PublicEpisodePlayback, type PublicEpisodePlatform } from "./publicStories";

const PLATFORM_LABEL: Record<PublicEpisodePlatform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
};

export function EpisodePlatformPlayers({ episode }: { episode: PublicEpisodePlayback }): React.JSX.Element {
  const platforms = episodeWatchPlatforms(episode);
  const [active, setActive] = useState<PublicEpisodePlatform | null>(platforms[0]?.platform ?? null);
  const current = platforms.find((row) => row.platform === active) ?? platforms[0];

  if (!current) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-950">
        {episode.coverImageUrl ? (
          <img src={episode.coverImageUrl} alt={episode.title} className="aspect-video w-full object-cover" />
        ) : (
          <div className="flex aspect-video items-center justify-center text-sm text-white/50">Cover coming soon</div>
        )}
        <p className="px-4 py-3 text-xs text-white/55">This episode is listed, but it is not watchable until it is published to a platform.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-950">
      {platforms.length > 1 ? (
        <div className="flex gap-1 border-b border-white/10 p-2">
          {platforms.map((row) => (
            <button
              key={row.platform}
              type="button"
              onClick={() => setActive(row.platform)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                current.platform === row.platform ? "bg-white text-black" : "text-white/70 hover:text-white"
              }`}
            >
              {PLATFORM_LABEL[row.platform]}
            </button>
          ))}
        </div>
      ) : null}
      <div className="aspect-video bg-black">
        <PlatformEmbed platform={current.platform} url={current.url} title={episode.title} />
      </div>
    </div>
  );
}

export function StoryNav(): React.JSX.Element {
  return (
    <nav className="flex items-center justify-between gap-4 px-6 py-6 md:px-10">
      <Link to="/" className="text-sm tracking-tight text-white">
        corelabsstudio
      </Link>
      <div className="flex items-center gap-3">
        <Link to="/stories" className="text-sm text-white/70 hover:text-white">
          stories
        </Link>
        <Link to="/login" className="rounded-full bg-white px-4 py-2 text-sm text-black">
          start creating
        </Link>
      </div>
    </nav>
  );
}
