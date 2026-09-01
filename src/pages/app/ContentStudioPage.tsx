import { useEffect, useMemo, useState, type ElementType } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Gauge,
  Layers3,
  Library,
  ListChecks,
  Menu,
  Palette,
  PlaySquare,
  PlugZap,
  ScrollText,
  Sparkles,
  X,
} from 'lucide-react';
import { listContentModules, listThemes } from '@/api/content';
import { useAuthStore } from '@/store/authStore';
import { ContentModules } from '@/pages/dashboard/ContentModules';
import { ContentThemes, ThemeLibraryView } from '@/pages/dashboard/ContentThemes';
import { ContentEpisodes } from '@/pages/dashboard/ContentEpisodes';
import { StoriesEditor } from '@/pages/dashboard/StoriesEditor';
import { StudioCommandCenter } from '@/pages/app/StudioCommandCenter';
import { StudioPipelinePanel } from '@/pages/app/StudioPipelinePanel';
import { StudioPerformancePanel } from '@/pages/app/StudioPerformancePanel';
import { StudioIntegrationsPanel } from '@/pages/app/StudioIntegrationsPanel';

type StudioTab =
  | 'command'
  | 'pipeline'
  | 'modules'
  | 'themes'
  | 'library'
  | 'episodes'
  | 'stories'
  | 'review'
  | 'performance'
  | 'integrations';

const CONTENT_STUDIO_SIDEBAR_COLLAPSED_KEY = 'corelabs-studio-sidebar-collapsed';

const TABS: { id: StudioTab; label: string; icon: ElementType }[] = [
  { id: 'episodes', label: 'Episodes', icon: PlaySquare },
  { id: 'command', label: 'Command', icon: Gauge },
  { id: 'modules', label: 'Modules', icon: Layers3 },
  { id: 'themes', label: 'Themes', icon: Palette },
  { id: 'pipeline', label: 'Pipeline', icon: Clapperboard },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'stories', label: 'Stories', icon: ScrollText },
  { id: 'review', label: 'Review', icon: ListChecks },
  { id: 'performance', label: 'Performance', icon: BarChart3 },
  { id: 'integrations', label: 'Integrations', icon: PlugZap },
];

function ComingOnlinePanel({
  title,
  body,
  icon: Icon,
}: {
  title: string;
  body: string;
  icon: ElementType;
}): React.JSX.Element {
  return (
    <section className="studio-glass rounded-xl p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="studio-glass-subtle flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <Icon size={18} className="text-white/80" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-white/60">{body}</p>
        </div>
      </div>
      <div className="studio-glass-subtle rounded-xl border border-dashed border-white/15 p-8 text-center">
        <Sparkles size={26} className="mx-auto text-white/50" />
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/60">
          This view is wired in the studio shell and will light up as publishing surfaces are ported.
        </p>
      </div>
    </section>
  );
}

export function ContentStudioPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(CONTENT_STUDIO_SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const tabParam = searchParams.get('studioTab') as StudioTab | null;
  const legacyTab = searchParams.get('tab') === 'stories' ? 'stories' : null;
  const activeTab =
    legacyTab ?? (TABS.some((tab) => tab.id === tabParam) ? (tabParam as StudioTab) : 'episodes');

  useEffect(() => {
    try {
      localStorage.setItem(CONTENT_STUDIO_SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (searchParams.get('themesView') !== 'pipeline') {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.set('studioTab', 'pipeline');
    next.delete('themesView');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const connectedPlatform =
      searchParams.get('youtube') === 'connected'
        ? 'YouTube'
        : searchParams.get('tiktok') === 'connected'
          ? 'TikTok'
          : searchParams.get('instagram') === 'connected'
            ? 'Instagram'
            : null;
    if (!connectedPlatform) {
      return;
    }
    toast.success(`${connectedPlatform} connected.`);
    const next = new URLSearchParams(searchParams);
    next.delete('youtube');
    next.delete('tiktok');
    next.delete('instagram');
    next.set('studioTab', 'integrations');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const modulesQuery = useQuery({
    queryKey: ['content', 'modules'],
    queryFn: listContentModules,
    retry: false,
  });
  const themesQuery = useQuery({
    queryKey: ['content', 'themes'],
    queryFn: listThemes,
    retry: false,
  });

  const modules = modulesQuery.data ?? [];
  const themes = themesQuery.data ?? [];
  const apiOnline = !modulesQuery.isError && !themesQuery.isError && (modulesQuery.isSuccess || themesQuery.isSuccess);

  const activeTabMeta = useMemo(
    () => TABS.find((tab) => tab.id === activeTab) ?? TABS[0],
    [activeTab],
  );
  const ActiveIcon = activeTabMeta.icon;

  function setTab(tab: StudioTab): void {
    const next = new URLSearchParams(searchParams);
    next.delete('tab');
    next.set('studioTab', tab);
    setSearchParams(next);
    setMobileNavOpen(false);
  }

  const navButtonClass = (isActive: boolean, collapsed: boolean): string =>
    [
      'flex w-full items-center rounded-lg text-xs font-semibold transition-colors',
      collapsed ? 'justify-center px-2 py-2.5' : 'gap-2 px-3 py-2.5',
      isActive
        ? 'bg-white text-black shadow-sm'
        : 'text-white/60 hover:bg-white/10 hover:text-white hover:backdrop-blur-md',
    ].join(' ');

  const shellSurfaceClass = 'studio-glass rounded-xl';

  return (
    <div className="studio-workspace min-h-screen bg-black px-4 py-6 text-white md:px-6">
      <div className="studio-fluid-shell space-y-6">
        <header className={`${shellSurfaceClass} p-5`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="studio-touch-target studio-glass-subtle inline-flex shrink-0 items-center justify-center rounded-lg border border-white/15 text-white md:hidden"
                aria-label="Open studio navigation"
              >
                <Menu size={20} />
              </button>
              <div>
              <div className="studio-glass-subtle mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-white/60 uppercase">
                <ActiveIcon size={12} /> CoreLabsStudio
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">Studio</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/65">
                Manage themes, modules, the approval-gated generation pipeline, and publishing from one workspace.
                {user ? ` Signed in as ${user.email}.` : null}
              </p>
              </div>
            </div>
            <div className="studio-pill-row">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/65 backdrop-blur-md transition-colors hover:border-white/35 hover:bg-white/10 hover:text-white"
              >
                Marketing site
              </Link>
              <button
                type="button"
                onClick={() => setTab('pipeline')}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
              >
                <Clapperboard size={16} /> Open pipeline
              </button>
              <button
                type="button"
                onClick={() => setTab('episodes')}
                className="studio-touch-target-inline inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 backdrop-blur-md transition-colors hover:border-white/35 hover:bg-white/10 hover:text-white"
              >
                <PlaySquare size={16} /> Episodes
              </button>
              <button
                type="button"
                onClick={logout}
                className="studio-touch-target-inline inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/65 backdrop-blur-md transition-colors hover:border-white/35 hover:bg-white/10 hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {mobileNavOpen ? (
          <button
            type="button"
            className="studio-drawer-backdrop md:hidden"
            aria-label="Close studio navigation"
            onClick={() => setMobileNavOpen(false)}
          />
        ) : null}

        <aside
          className={`studio-drawer-panel studio-glass md:hidden ${mobileNavOpen ? '' : ''}`}
          data-closed={mobileNavOpen ? 'false' : 'true'}
          aria-hidden={!mobileNavOpen}
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">Studio navigation</p>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="studio-touch-target inline-flex items-center justify-center rounded-lg border border-white/15 text-white/80"
              aria-label="Close navigation drawer"
            >
              <X size={18} />
            </button>
          </div>
          <nav className="space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={navButtonClass(activeTab === id, false)}
              >
                <Icon size={15} />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex items-start gap-4">
          <aside
            className={`relative hidden shrink-0 transition-all duration-200 md:block ${sidebarCollapsed ? 'w-[4.5rem]' : 'w-52'
              }`}
          >
            <nav className={`sticky top-6 ${shellSurfaceClass} p-2`}>
              <div className="space-y-1">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    title={sidebarCollapsed ? label : undefined}
                    className={navButtonClass(activeTab === id, sidebarCollapsed)}
                  >
                    <Icon size={15} />
                    {!sidebarCollapsed && <span className="truncate">{label}</span>}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((value) => !value)}
                className={`studio-glass-subtle mt-2 flex w-full items-center rounded-lg border border-white/10 text-white/65 transition-colors hover:bg-white/10 hover:text-white hover:backdrop-blur-md ${sidebarCollapsed ? 'justify-center px-2 py-2' : 'gap-2 px-3 py-2'
                  }`}
                aria-label={sidebarCollapsed ? 'Expand studio sidebar' : 'Collapse studio sidebar'}
              >
                {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
                {!sidebarCollapsed && <span className="text-xs font-semibold">Collapse</span>}
              </button>
            </nav>
          </aside>

          <div className="min-w-0 flex-1 space-y-6">
            {activeTab === 'command' && (
              <StudioCommandCenter
                modules={modules}
                themes={themes}
                onOpen={setTab}
                apiOnline={apiOnline}
              />
            )}
            {activeTab === 'pipeline' && <StudioPipelinePanel />}
            {activeTab === 'modules' && <ContentModules onCreateTheme={() => setTab('themes')} />}
            {activeTab === 'themes' && <ContentThemes themes={themes} />}
            {activeTab === 'library' && <ThemeLibraryView themes={themes} />}
            {activeTab === 'episodes' && <ContentEpisodes />}
            {activeTab === 'stories' && <StoriesEditor />}
            {activeTab === 'review' && (
              <ComingOnlinePanel
                title="Review Queue"
                body="Generated episodes wait here before publishing."
                icon={ListChecks}
              />
            )}
            {activeTab === 'performance' && <StudioPerformancePanel />}
            {activeTab === 'integrations' && <StudioIntegrationsPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
