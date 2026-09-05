import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getPublicStory } from "@/api/publicStories";
import { EpisodePlatformPlayers, StoryNav } from "./EpisodePlatformPlayers";

export function StoryDetailPage(): React.JSX.Element {
  const { slug = "" } = useParams();
  const { data: story, isLoading, isError } = useQuery({
    queryKey: ["public", "stories", slug],
    queryFn: () => getPublicStory(slug),
    enabled: Boolean(slug),
  });

  return (
    <main className="min-h-screen bg-black text-white">
      <StoryNav />
      <section className="mx-auto max-w-4xl px-6 pb-20 md:px-10">
        <Link to="/stories" className="text-xs text-white/50 hover:text-white">
          All stories
        </Link>
        {isLoading ? <p className="mt-10 text-sm text-white/50">Loading story…</p> : null}
        {isError ? <p className="mt-10 text-sm text-red-300">Story not found.</p> : null}
        {story ? (
          <div className="mt-6 space-y-10">
            <header className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">{story.themeTitle || "Story"}</p>
              <h1 className="text-4xl font-medium tracking-tight md:text-5xl">{story.title}</h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/65">{story.summary}</p>
              {story.authorName ? <p className="text-xs text-white/45">By {story.authorName}</p> : null}
            </header>
            <div className="space-y-8">
              {(story.episodes ?? []).map((episode) => (
                <article key={episode.episodeId ?? `${episode.moduleId}-${episode.title}`} className="space-y-3">
                  <h2 className="text-lg font-semibold">{episode.title}</h2>
                  <EpisodePlatformPlayers episode={episode} />
                </article>
              ))}
              {(story.episodes ?? []).length === 0 ? (
                <p className="text-sm text-white/50">No published episodes yet. Check back after this story is posted to a platform.</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
