import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Globe2,
  Infinity as InfinityIcon,
  Layers3,
  Plus,
  Route,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createContentModule,
  getContentStudioDraft,
  listContentModules,
  listThemes,
  saveContentStudioDraft,
} from '@/api/content';
import { Select, type SelectOption } from '@/components/Select';
import { featureFlags } from '@/config/featureFlags';
import { FieldShell } from './content-modules/FieldShell';
import { ModuleDashboard } from './content-modules/ModuleDashboard';
import { ThemePreviewCard } from './content-modules/ThemePreviewCard';
import {
  PLATFORM_COPY,
  buildModuleConfig,
  emptyWizard,
  lifecycleClass,
  MODULE_AUTOMATION_DISABLED_MESSAGE,
  moduleDescription,
  slugify,
  type Frequency,
  type ModuleLifecycle,
  type ModuleWizard,
  type OptimizationTarget,
  type Platform,
  type RoadmapItem,
} from './content-modules/moduleUtils';

const EPISODE_MODULE_SESSION_KEY = 'content-studio-episode-module-id';

type WizardStepId = 'metadata' | 'theme' | 'season' | 'destinations' | 'automation' | 'performance';

const ALL_STEPS: { id: WizardStepId; label: string; icon: typeof FileText }[] = [
  { id: 'metadata', label: 'Metadata', icon: FileText },
  { id: 'theme', label: 'Theme', icon: BookOpen },
  { id: 'season', label: 'Season', icon: Route },
  { id: 'destinations', label: 'Destinations', icon: Globe2 },
  { id: 'automation', label: 'Automation', icon: Clock3 },
  { id: 'performance', label: 'Performance', icon: BarChart3 },
];

const STEPS = ALL_STEPS.filter(
  (step) => step.id !== 'season' || featureFlags.moduleTopicRoadmapEnabled,
);

const STATUS_OPTIONS: SelectOption<ModuleLifecycle>[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
];

const FREQUENCY_OPTIONS: SelectOption<Frequency>[] = [
  { value: 'manual', label: 'Manual only' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly' },
];

const TIMEZONE_OPTIONS: SelectOption<string>[] = [
  { value: 'Africa/Lagos', label: 'Africa/Lagos' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'America/New_York', label: 'America/New_York' },
];

const OPTIMIZATION_OPTIONS: SelectOption<OptimizationTarget>[] = [
  { value: 'engagement', label: 'Optimize for engagement' },
  { value: 'retention', label: 'Optimize for retention' },
  { value: 'ctr', label: 'Optimize for CTR' },
];

function Stepper({ step }: { step: number }) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${STEPS.length > 5 ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
      {STEPS.map(({ label, icon: Icon }, index) => {
        const active = index === step;
        const done = index < step;
        return (
          <div
            key={label}
            className={`rounded-xl border px-3 py-2 ${
              active
                ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/35'
                : done
                  ? 'border-[var(--color-tea-green)] bg-white'
                  : 'border-border bg-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {done ? <CheckCircle2 size={15} className="text-[var(--color-muted-olive)]" /> : <Icon size={15} className="text-[var(--color-ash-brown)]" />}
              <span className="text-xs font-semibold text-dark">{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ContentModules({ onCreateTheme }: { onCreateTheme?: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ModuleWizard>(() => emptyWizard());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['content', 'modules'],
    queryFn: listContentModules,
  });
  const { data: themes = [] } = useQuery({
    queryKey: ['content', 'themes'],
    queryFn: listThemes,
  });
  const { data: moduleDraft } = useQuery({
    queryKey: ['content', 'drafts', 'module'],
    queryFn: () => getContentStudioDraft<ModuleWizard>('module'),
  });

  const selectedModule = modules.find((module) => module._id === selectedId) ?? null;
  const selectedTheme = themes.find((theme) => theme._id === form.themeId);
  const filteredThemes = themes.filter((theme) => {
    const q = form.themeSearch.trim().toLowerCase();
    if (!q) return true;
    return [theme.title, theme.slug, theme.authorName, theme.defaultGenre ?? ''].join(' ').toLowerCase().includes(q);
  });
  const themeOptions: SelectOption<string>[] = [
    { value: '', label: 'Select an existing theme' },
    ...filteredThemes.map((theme) => ({ value: theme._id, label: `${theme.title} - ${theme.authorName}` })),
  ];

  const createMut = useMutation({
    mutationFn: () => {
      const theme = themes.find((item) => item._id === form.themeId);
      return createContentModule({
        title: form.title.trim(),
        themeLine: form.synopsis.trim(),
        genre: theme?.defaultGenre || form.optimizationTarget,
        creativePrompt: buildModuleConfig(form, theme),
        durationSeconds: 30,
        soundEnabled: false,
        generationMode: 'text2video',
        themeId: form.themeId || undefined,
      });
    },
    onSuccess: (module) => {
      toast.success('Module created.');
      queryClient.invalidateQueries({ queryKey: ['content', 'modules'] });
      sessionStorage.setItem(EPISODE_MODULE_SESSION_KEY, module._id);
      setSelectedId(module._id);
      setStep(0);
      setForm(emptyWizard());
    },
    onError: () => toast.error('Could not create module.'),
  });

  const saveDraftMut = useMutation({
    mutationFn: () => saveContentStudioDraft('module', form as unknown as Record<string, unknown>),
    onSuccess: () => toast.success('Module draft saved to your workspace.'),
    onError: () => toast.error('Could not save module draft.'),
  });

  const stepId = STEPS[step]?.id ?? 'metadata';

  const canContinue = useMemo(() => {
    if (stepId === 'metadata') return Boolean(form.title.trim() && form.synopsis.trim() && form.slug.trim());
    if (stepId === 'theme') return Boolean(form.themeId);
    if (stepId === 'season') return form.continuous || form.episodeQuota > 0;
    if (stepId === 'destinations') return (Object.keys(form.destinations) as Platform[]).some((platform) => form.destinations[platform]);
    return true;
  }, [form, stepId]);

  const selectedPlatforms = (Object.keys(form.destinations) as Platform[]).filter((platform) => form.destinations[platform]);

  useEffect(() => {
    if (moduleDraft?.payload) setForm(moduleDraft.payload);
  }, [moduleDraft?.payload]);

  function handleSaveModuleDraft() {
    saveDraftMut.mutate();
  }

  function updateRoadmap(id: string, key: keyof Omit<RoadmapItem, 'id'>, value: string) {
    setForm((current) => ({
      ...current,
      roadmap: current.roadmap.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }));
  }

  function addRoadmapRow() {
    setForm((current) => ({
      ...current,
      roadmap: [...current.roadmap, { id: crypto.randomUUID(), title: '', keyword: '', slug: '' }],
    }));
  }

  function renderWizardStep() {
    if (stepId === 'metadata') {
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <FieldShell label="Module Title">
            <input className="input-field text-sm" value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value, slug: current.slug || slugify(e.target.value) }))} placeholder="SME Tax Explainer Season" />
          </FieldShell>
          <FieldShell label="Base URL Slug">
            <input className="input-field text-sm" value={form.slug} onChange={(e) => setForm((current) => ({ ...current, slug: slugify(e.target.value) }))} placeholder="sme-tax-explainer" />
          </FieldShell>
          <div className="lg:col-span-2">
            <FieldShell label="Synopsis / Description">
              <textarea className="input-field min-h-[120px] text-sm" value={form.synopsis} onChange={(e) => setForm((current) => ({ ...current, synopsis: e.target.value }))} placeholder="Describe the series purpose, audience, recurring promise, and what the module should continuously produce." />
            </FieldShell>
          </div>
          <FieldShell label="Status">
            <Select aria-label="Module status" value={form.status} options={STATUS_OPTIONS} onChange={(value) => setForm((current) => ({ ...current, status: value }))} />
          </FieldShell>
        </div>
      );
    }

    if (stepId === 'theme') {
      return (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <FieldShell label="Search Themes">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input className="input-field pl-9 text-sm" value={form.themeSearch} onChange={(e) => setForm((current) => ({ ...current, themeSearch: e.target.value }))} placeholder="Search private workspace or imported public themes" />
              </div>
            </FieldShell>
            <FieldShell label="Connected Theme">
              <Select aria-label="Theme selection" value={form.themeId} options={themeOptions} onChange={(value) => setForm((current) => ({ ...current, themeId: String(value) }))} />
            </FieldShell>
            <div className="rounded-xl border border-[var(--color-tea-green)] bg-white p-4">
              <p className="text-sm font-semibold text-dark">Theme not available?</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Create a custom theme bible first, then return here and link it to this module.
              </p>
              <button
                type="button"
                onClick={onCreateTheme}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--color-muted-olive)] px-3 py-2 text-xs font-semibold text-[var(--color-ash-brown)] hover:bg-[var(--color-tea-green)]/25"
              >
                <BookOpen size={14} /> Create new theme
              </button>
            </div>
            <FieldShell label="Module-Specific Overrides">
              <textarea className="input-field min-h-[130px] text-sm" value={form.overrides} onChange={(e) => setForm((current) => ({ ...current, overrides: e.target.value }))} placeholder="Season-specific constraints that override the theme without polluting the global show bible." />
            </FieldShell>
          </div>
          <ThemePreviewCard theme={selectedTheme} />
        </div>
      );
    }

    if (stepId === 'season') {
      return (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[0.6fr_1fr]">
            <div className="rounded-xl border border-border bg-white p-4">
              <label className="flex items-center gap-3 text-sm font-semibold text-dark">
                <input type="checkbox" checked={form.continuous} onChange={(e) => setForm((current) => ({ ...current, continuous: e.target.checked }))} />
                Continuous / Infinite Module
              </label>
              <div className="mt-4">
                <FieldShell label="Episode Quota / Target">
                  <input disabled={form.continuous} type="number" min={1} className="input-field text-sm disabled:opacity-50" value={form.episodeQuota} onChange={(e) => setForm((current) => ({ ...current, episodeQuota: Number(e.target.value) || 1 }))} />
                </FieldShell>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--color-tea-green)] p-3 text-xs text-muted">
                <InfinityIcon size={16} className="text-[var(--color-ash-brown)]" />
                {form.continuous ? 'The roadmap can grow indefinitely.' : 'The quota defines the season target.'}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-dark">Topic Roadmap Builder</p>
                  <p className="text-xs text-muted">Plan episode titles, target keywords, and URL slugs.</p>
                </div>
                <button type="button" onClick={addRoadmapRow} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-dark hover:border-[var(--color-muted-olive)]">
                  <Plus size={13} /> Row
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead className="border-b border-border text-muted">
                    <tr>
                      <th className="py-2 pr-2 font-medium">Episode Title</th>
                      <th className="py-2 pr-2 font-medium">Target Keyword / Topic</th>
                      <th className="py-2 font-medium">Episode Slug</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {form.roadmap.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 pr-2"><input className="input-field text-xs" value={item.title} onChange={(e) => updateRoadmap(item.id, 'title', e.target.value)} /></td>
                        <td className="py-2 pr-2"><input className="input-field text-xs" value={item.keyword} onChange={(e) => updateRoadmap(item.id, 'keyword', e.target.value)} /></td>
                        <td className="py-2"><input className="input-field text-xs" value={item.slug} onChange={(e) => updateRoadmap(item.id, 'slug', slugify(e.target.value))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (stepId === 'destinations') {
      return (
        <div className="space-y-5">
          <div className="grid gap-3 lg:grid-cols-3">
            {(Object.keys(PLATFORM_COPY) as Platform[]).map((platform) => (
              <div key={platform} className={`rounded-xl border p-4 ${form.destinations[platform] ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/20' : 'border-border bg-white'}`}>
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked={form.destinations[platform]} onChange={(e) => setForm((current) => ({ ...current, destinations: { ...current.destinations, [platform]: e.target.checked } }))} />
                  <span>
                    <span className="block text-sm font-semibold text-dark">{PLATFORM_COPY[platform].label}</span>
                    <span className="mt-1 block text-xs text-muted">{PLATFORM_COPY[platform].account}</span>
                  </span>
                </label>
                <p className="mt-3 text-[11px] leading-relaxed text-muted">Authors route content to platform-owned accounts. No personal social authentication is required.</p>
              </div>
            ))}
          </div>
          {selectedPlatforms.map((platform) => (
            <FieldShell key={platform} label={`${PLATFORM_COPY[platform].label} Formatting Rules`}>
              <textarea className="input-field min-h-[96px] text-sm" value={form.formatting[platform]} onChange={(e) => setForm((current) => ({ ...current, formatting: { ...current.formatting, [platform]: e.target.value } }))} />
            </FieldShell>
          ))}
          <FieldShell label="Default Asset Fallback Rules">
            <textarea className="input-field min-h-[90px] text-sm" value={form.fallbackRules} onChange={(e) => setForm((current) => ({ ...current, fallbackRules: e.target.value }))} />
          </FieldShell>
        </div>
      );
    }

    if (stepId === 'automation') {
      return (
        <div className="grid gap-5 lg:grid-cols-2">
          {!featureFlags.moduleAutomationEnabled ? (
            <div className="lg:col-span-2 rounded-xl border border-[var(--color-faded-copper)]/40 bg-[var(--color-tea-green)]/30 px-4 py-3 text-sm text-dark">
              {MODULE_AUTOMATION_DISABLED_MESSAGE}
            </div>
          ) : null}
          <fieldset
            disabled={!featureFlags.moduleAutomationEnabled}
            className={`contents ${!featureFlags.moduleAutomationEnabled ? 'opacity-60' : ''}`}
          >
          <FieldShell label="Generation Frequency">
            <Select aria-label="Generation frequency" value={form.frequency} options={FREQUENCY_OPTIONS} onChange={(value) => setForm((current) => ({ ...current, frequency: value }))} />
          </FieldShell>
          <FieldShell label="Timezone">
            <Select aria-label="Timezone" value={form.timezone} options={TIMEZONE_OPTIONS} onChange={(value) => setForm((current) => ({ ...current, timezone: String(value) }))} />
          </FieldShell>
          <div className="lg:col-span-2 rounded-xl border border-border bg-white p-4">
            <p className="text-sm font-semibold text-dark">Human-in-the-Loop Approval Workflow</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className={`rounded-xl border p-4 ${form.requireApproval ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/20' : 'border-border'}`}>
                <input type="radio" name="approval" checked={form.requireApproval} onChange={() => setForm((current) => ({ ...current, requireApproval: true }))} />
                <span className="ml-2 text-sm font-semibold text-dark">Require Manual Approval</span>
                <span className="mt-1 block text-xs text-muted">Generated content waits in review before central API publishing.</span>
              </label>
              <label className={`rounded-xl border p-4 ${!form.requireApproval ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/20' : 'border-border'}`}>
                <input type="radio" name="approval" checked={!form.requireApproval} onChange={() => setForm((current) => ({ ...current, requireApproval: false }))} />
                <span className="ml-2 text-sm font-semibold text-dark">Bypass Review and Auto-Publish</span>
                <span className="mt-1 block text-xs text-muted">Approved automation publishes directly through central platform APIs.</span>
              </label>
            </div>
          </div>
          </fieldset>
        </div>
      );
    }

    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-4">
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={form.metricIngestion} onChange={(e) => setForm((current) => ({ ...current, metricIngestion: e.target.checked }))} />
            <span>
              <span className="block text-sm font-semibold text-dark">Enable Metric Ingestion</span>
              <span className="mt-1 block text-xs text-muted">Ingest views, watch time, engagement, and related platform metrics from central social APIs.</span>
            </span>
          </label>
        </div>
        <FieldShell label="Optimization Target">
          <Select aria-label="Optimization target" value={form.optimizationTarget} options={OPTIMIZATION_OPTIONS} onChange={(value) => setForm((current) => ({ ...current, optimizationTarget: value }))} />
        </FieldShell>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-tea-green)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-faded-copper)]">
              <Layers3 size={12} /> Module Creation
            </div>
            <h1 className="text-2xl font-semibold text-dark">Module Wizard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Configure a module as a series container, platform routing hub, automation engine, and performance feedback loop.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setStep(0);
              setForm(emptyWizard());
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)]"
          >
            <Plus size={16} /> New module
          </button>
          <button
            type="button"
            onClick={handleSaveModuleDraft}
            disabled={saveDraftMut.isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-ash-brown)] disabled:opacity-45"
          >
            {saveDraftMut.isPending ? 'Saving...' : 'Save draft'}
          </button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[18rem_1fr]">
        <aside className="h-fit rounded-xl border border-border bg-white p-3 shadow-sm xl:sticky xl:top-20">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Existing modules</p>
          <div className="space-y-2">
            {isLoading ? (
              <p className="px-2 py-6 text-sm text-muted">Loading modules...</p>
            ) : modules.length === 0 ? (
              <p className="px-2 py-6 text-sm text-muted">No modules yet.</p>
            ) : (
              modules.map((module) => (
                <button
                  key={module._id}
                  type="button"
                  onClick={() => {
                    setSelectedId(module._id);
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedId === module._id ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/25' : 'border-border bg-white hover:border-[var(--color-muted-olive)]'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-semibold text-dark">{module.title}</p>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${lifecycleClass(module.status)}`}>{module.status}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted">{moduleDescription(module)}</p>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="min-w-0">
          {!selectedModule ? (
            <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <Stepper step={step} />
              <div className="mt-6 border-t border-border pt-6">{renderWizardStep()}</div>
              <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  disabled={step === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-dark disabled:opacity-40"
                >
                  <ChevronLeft size={15} /> Back
                </button>
                <button
                  type="button"
                  onClick={handleSaveModuleDraft}
                  disabled={saveDraftMut.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-ash-brown)] disabled:opacity-45"
                >
                  <BookOpen size={15} /> {saveDraftMut.isPending ? 'Saving draft...' : 'Save draft to DB'}
                </button>
                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}
                    disabled={!canContinue}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-5 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-40"
                  >
                    Continue <ChevronRight size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => createMut.mutate()}
                    disabled={createMut.isPending || !canContinue}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-5 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-40"
                  >
                    <CheckCircle2 size={15} /> {createMut.isPending ? 'Creating...' : 'Create module'}
                  </button>
                )}
              </div>
            </section>
          ) : (
            <ModuleDashboard module={selectedModule} themes={themes} />
          )}
        </main>
      </div>
    </div>
  );
}
