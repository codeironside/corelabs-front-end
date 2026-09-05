import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listPublicStories } from "@/api/publicStories";
import { StoryNav } from "./EpisodePlatformPlayers";

export function StoriesPage(): React.JSX.Element {
  const { data: stories = [], isLoading, isError } = useQuery({
    queryKey: ["public", "stories"],
    queryFn: listPublicStories,
  });

  return (
    <main className="min-h-screen bg-black text-white">
      <StoryNav />
      <section className="mx-auto max-w-6xl px-6 pb-20 md:px-10">
        <p className="text-xs uppercase tracking-[0.2em] text-white/45">Watch on platform</p>
        <h1 className="mt-3 text-4xl font-medium tracking-tight md:text-6xl">Stories</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65">
          Episodes stay on YouTube, TikTok, and Instagram. This site only lists covers and official platform players.
        </p>
        {isLoading ? <p className="mt-10 text-sm text-white/50">Loading stories…</p> : null}
        {isError ? <p className="mt-10 text-sm text-red-300">Could not load stories.</p> : null}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <Link
              key={story.slug}
              to={`/stories/${story.slug}`}
              className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 transition hover:border-white/25"
            >
              {story.coverImageUrl || story.firstVideo?.coverImageUrl ? (
                <img
                  src={story.coverImageUrl || story.firstVideo?.coverImageUrl}
                  alt=""
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center text-xs text-white/40">No cover yet</div>
              )}
              <div className="space-y-2 p-4">
                <p className="text-sm font-semibold">{story.title}</p>
                <p className="line-clamp-3 text-xs leading-relaxed text-white/55">{story.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
