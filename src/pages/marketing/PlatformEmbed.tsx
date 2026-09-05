import { useEffect } from "react";
import type { PublicEpisodePlatform } from "./publicStories";

export function youtubeVideoIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "").split("/")[0] || null;
    }
    if (parsed.searchParams.get("v")) {
      return parsed.searchParams.get("v");
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" || parts[0] === "shorts") {
      return parts[1] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

export function tiktokVideoIdFromUrl(url: string): string | null {
  const match = url.match(/\/video\/(\d+)/);
  return match?.[1] ?? null;
}

export function instagramPermalink(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("instagram.com")) return null;
    return `${parsed.origin}${parsed.pathname.replace(/\/$/, "")}/`;
  } catch {
    return null;
  }
}

interface PlatformEmbedProps {
  platform: PublicEpisodePlatform;
  url: string;
  title: string;
}

export function PlatformEmbed({ platform, url, title }: PlatformEmbedProps): React.JSX.Element {
  const youtubeId = platform === "youtube" ? youtubeVideoIdFromUrl(url) : null;
  const tiktokId = platform === "tiktok" ? tiktokVideoIdFromUrl(url) : null;
  const instagramUrl = platform === "instagram" ? instagramPermalink(url) : null;

  useEffect(() => {
    if (platform === "tiktok") {
      const script = document.createElement("script");
      script.src = "https://www.tiktok.com/embed.js";
      script.async = true;
      document.body.appendChild(script);
      return () => {
        script.remove();
      };
    }
    if (platform === "instagram") {
      const script = document.createElement("script");
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      document.body.appendChild(script);
      script.onload = () => {
        const instgrm = (window as Window & { instgrm?: { Embeds: { process: () => void } } }).instgrm;
        instgrm?.Embeds.process();
      };
      return () => {
        script.remove();
      };
    }
    return undefined;
  }, [platform, url]);

  if (youtubeId) {
    return (
      <iframe
        title={title}
        className="h-full w-full"
        src={`https://www.youtube.com/embed/${youtubeId}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (tiktokId) {
    return (
      <blockquote className="tiktok-embed" cite={url} data-video-id={tiktokId} style={{ maxWidth: "100%", minWidth: 0 }}>
        <a href={url}>{title}</a>
      </blockquote>
    );
  }

  if (instagramUrl) {
    return (
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={instagramUrl}
        data-instgrm-version="14"
        style={{ width: "100%", margin: 0 }}
      >
        <a href={instagramUrl}>{title}</a>
      </blockquote>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-sm text-white underline">
      Watch on {platform}
    </a>
  );
}
