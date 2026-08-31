import { useMemo, type ElementType, type ReactNode } from 'react';
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

type StudioTab = 'modules' | 'themes' | 'episodes' | 'pipeline' | 'integrations';

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
    <div className="space-y-6">
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
