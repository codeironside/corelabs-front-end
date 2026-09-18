import { useEffect, useMemo, useRef, type ElementType, type ReactNode } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Layers3,
  Palette,
  PlaySquare,
  PlugZap,
  Sparkles,
} from 'lucide-react';
import type { ContentModule, ContentTheme } from '@/api/content';
import { CommandProductionPlanner } from '@/pages/app/CommandProductionPlanner';

type StudioTab = 'command' | 'modules' | 'themes' | 'episodes' | 'pipeline' | 'integrations';

const COMMAND_SHOWCASE_VIDEOS = [
  {
    src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_105953_21ad8049-9088-4a00-bad3-aee6b5575a2b.mp4',
    label: 'Character lock',
    size: 'hero',
  },
  {
    src: 'https://videos.pexels.com/video-files/5435717/5435717-uhd_1440_2732_25fps.mp4',
    label: 'Scene energy',
    size: 'tall',
  },
  {
    src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260814_034538_de4032ce-5035-473d-a5b1-0e2224635a6a.mp4',
    label: 'World build',
    size: 'wide',
  },
  {
    src: 'https://videos.pexels.com/video-files/38457662/16331635_2560_1440_30fps.mp4',
    label: 'Motion craft',
    size: 'square',
  },
] as const;

function ShellPanel({
  title,
  kicker,
  icon: Icon,
  children,
}: {
  title: string;
  kicker: string;
  icon: ElementType;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-tea-green)]">
          <Icon size={18} className="text-[var(--color-dark)]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-dark)]">{title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-dark)]/65">{kicker}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: ElementType;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <Icon size={18} className="text-[var(--color-faded-copper)]" />
      <p className="mt-4 text-2xl font-semibold text-[var(--color-dark)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--color-dark)]/60">{label}</p>
    </div>
  );
}

function CommandVideoReel(): React.JSX.Element {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const tiles = Array.from(root.querySelectorAll<HTMLElement>('.studio-video-tile'));
    const revealItems = root.querySelectorAll('.studio-command-reveal');

    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
        }
      },
      { threshold: 0.12, rootMargin: '80px 0px' },
    );
    revealItems.forEach((item) => revealObserver.observe(item));

    const mediaObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const tile = entry.target as HTMLElement;
          const video = tile.querySelector('video');
          if (!(video instanceof HTMLVideoElement)) continue;
          const src = tile.dataset.src;
          if (!src) continue;

          if (entry.isIntersecting) {
            if (!video.src) {
              video.src = src;
              video.load();
            }
            void video.play().catch(() => undefined);
            tile.classList.add('is-playing');
          } else {
            video.pause();
            tile.classList.remove('is-playing');
          }
        }
      },
      { threshold: 0.2, rootMargin: '120px 0px' },
    );
    tiles.forEach((tile) => mediaObserver.observe(tile));

    return () => {
      revealObserver.disconnect();
      mediaObserver.disconnect();
    };
  }, []);

  return (
    <section ref={rootRef} className="space-y-4">
      <div className="studio-command-reveal flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Studio motion</p>
          <h2 className="mt-1 text-lg font-semibold text-white">What Command can shape</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/55">
            Short loops from live Studio outputs and cinematic references — the planner turns an idea into this kind of production energy.
          </p>
        </div>
      </div>
      <div className="studio-video-mosaic">
        {COMMAND_SHOWCASE_VIDEOS.map((video, index) => (
          <figure
            key={video.src}
            className="studio-command-reveal studio-video-tile"
            data-size={video.size}
            data-src={video.src}
            style={{ transitionDelay: `${0.08 + index * 0.08}s` }}
          >
            <video
              muted
              loop
              playsInline
              preload="none"
              aria-label={video.label}
            />
            <figcaption className="pointer-events-none absolute bottom-3 left-3 z-10 text-[11px] font-medium tracking-wide text-white/90">
              {video.label}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function StudioCommandCenter({
  modules,
  themes,
  onOpen,
  apiOnline,
}: {
  modules: ContentModule[];
  themes: ContentTheme[];
  onOpen: (tab: StudioTab) => void;
  apiOnline: boolean;
}): React.JSX.Element {
  const activeModules = useMemo(
    () =>
      modules.filter(
        (module) =>
          module.status === 'ready' || module.status === 'published' || module.status === 'generating',
      ).length,
    [modules],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="studio-command-reveal is-visible">
        <CommandProductionPlanner onOpenEpisodes={() => onOpen('episodes')} />
      </div>

      <CommandVideoReel />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Total modules" value={modules.length} icon={Layers3} />
        <MetricCard label="Theme bibles" value={themes.length} icon={Palette} />
        <MetricCard label="Active publishing streams" value={activeModules} icon={Sparkles} />
      </div>

      {!apiOnline ? (
        <div className="rounded-xl border border-[var(--color-faded-copper)]/40 bg-[var(--color-tea-green)]/40 px-4 py-3 text-xs text-[var(--color-dark)]/75">
          Studio API offline — start the backend on port 4005 to load modules and themes.
        </div>
      ) : null}

      <ShellPanel
        title="CoreLabsStudio Flow"
        kicker="Theme → module → pipeline → publish, with character lock and scene-by-scene approval."
        icon={CheckCircle2}
      >
        <div className="grid gap-3 xl:grid-cols-4">
          {[
            {
              title: '1. Create Theme',
              body: 'Build the world, tone, and locked character references.',
              tab: 'themes' as const,
              icon: Palette,
            },
            {
              title: '2. Create Module',
              body: 'Start a season or arc inside a theme.',
              tab: 'modules' as const,
              icon: Layers3,
            },
            {
              title: '3. Run Pipeline',
              body: 'Automated beat breakdown with scene-by-scene approval.',
              tab: 'pipeline' as const,
              icon: PlaySquare,
            },
            {
              title: '4. Publish',
              body: 'Ship finished video to YouTube, TikTok, and Instagram.',
              tab: 'integrations' as const,
              icon: PlugZap,
            },
          ].map(({ title, body, tab, icon: Icon }) => (
            <button
              key={title}
              type="button"
              onClick={() => onOpen(tab)}
              className="rounded-xl border border-white/10 bg-neutral-900 p-4 text-left transition-colors hover:border-white/25 hover:bg-neutral-800"
            >
              <Icon size={19} className="text-white/55" />
              <p className="mt-4 text-sm font-semibold text-white">{title}</p>
              <p className="mt-2 text-xs leading-relaxed text-white/60">{body}</p>
            </button>
          ))}
        </div>
      </ShellPanel>

      <div className="grid gap-5 xl:grid-cols-2">
        <ShellPanel title="Recent Modules" kicker="Streams ready for episode generation." icon={Layers3}>
          {modules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center">
              <Layers3 size={24} className="mx-auto text-[var(--color-muted-olive)]" />
              <p className="mt-3 text-sm font-semibold text-[var(--color-dark)]">No modules yet</p>
              <button
                type="button"
                onClick={() => onOpen('modules')}
                className="mt-3 rounded-full border border-white/20 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-white/40"
              >
                Create module
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {modules.slice(0, 4).map((module) => (
                <div key={module._id} className="rounded-xl border border-[var(--color-border)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-dark)]">{module.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--color-dark)]/65">
                        {module.themeLine || module.genre}
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--color-tea-green)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-dark)]">
                      {module.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ShellPanel>

        <ShellPanel title="Theme Library" kicker="Consistency engines for module creation." icon={BookOpen}>
          {themes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center">
              <Palette size={24} className="mx-auto text-[var(--color-muted-olive)]" />
              <p className="mt-3 text-sm font-semibold text-[var(--color-dark)]">No themes yet</p>
              <button
                type="button"
                onClick={() => onOpen('themes')}
                className="mt-3 rounded-full border border-white/20 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-white/40"
              >
                Create theme
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {themes.slice(0, 4).map((theme) => (
                <div key={theme._id} className="rounded-xl border border-[var(--color-border)] p-3">
                  <p className="text-sm font-semibold text-[var(--color-dark)]">{theme.title}</p>
                  <p className="mt-1 text-xs text-[var(--color-dark)]/65">
                    /{theme.slug} by {theme.authorName}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ShellPanel>
      </div>
    </div>
  );
}
