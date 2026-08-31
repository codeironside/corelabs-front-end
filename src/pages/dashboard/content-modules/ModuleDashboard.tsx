import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  CheckCircle2,
  FileText,
  Globe2,
  Image as ImageIcon,
  Loader2,
  Route,
  Save,
  Settings2,
  Sparkles,
  Video,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  generateModuleCoverImage,
  generateModuleVideo,
  listAvailableAiModels,
  listContentEpisodes,
  pollKlingStatus,
  updateContentModule,
  type ContentModule,
  type ContentTheme,
} from '@/api/content';
import { Select, type SelectOption } from '@/components/Select';
import { featureFlags } from '@/config/featureFlags';
import { ProtectedStudioImage } from '@/pages/dashboard/content-episodes/ProtectedStudioImage';
import { FieldShell } from './FieldShell';
import { ThemePreviewCard } from './ThemePreviewCard';
import {
  parseThemeCharacterMentions,
  parseThemeCharacterReferences,
} from '../content-episodes/storyboard';
import {
  CoverCharacterSelector,
  selectedCoverCharacterPrompt,
} from './CoverCharacterSelector';
import {
  PLATFORM_COPY,
  buildModuleConfig,
  lifecycleClass,
  MODULE_AUTOMATION_DISABLED_MESSAGE,
  moduleDescription,
  moduleToWizard,
  slugify,
  syncRoadmapWithEpisodes,
  type Frequency,
  type ModuleLifecycle,
  type ModuleWizard,
  type OptimizationTarget,
  type Platform,
  type RoadmapItem,
} from './moduleUtils';

type DashboardTab = 'metadata' | 'theme' | 'cover' | 'season' | 'destinations' | 'automation' | 'performance';

const MANAGEMENT_TABS: { id: DashboardTab; label: string; icon: LucideIcon }[] = [
  { id: 'metadata', label: 'Metadata', icon: FileText },
  { id: 'theme', label: 'Theme', icon: Route },
  { id: 'cover', label: 'Cover Media', icon: ImageIcon },
  { id: 'season', label: 'Season', icon: Route },
  { id: 'destinations', label: 'Destinations', icon: Globe2 },
  { id: 'automation', label: 'Automation', icon: Settings2 },
  { id: 'performance', label: 'Performance', icon: BarChart3 },
].filter((tab) => tab.id !== 'season' || featureFlags.moduleTopicRoadmapEnabled);

const STATUS_OPTIONS: SelectOption<ContentModule['status']>[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'published', label: 'Published' },
  { value: 'failed', label: 'Failed' },
];

const LIFECYCLE_OPTIONS: SelectOption<ModuleLifecycle>[] = [
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

interface ModuleDashboardProps {
  module: ContentModule;
  themes: ContentTheme[];
}

export function ModuleDashboard({ module, themes }: ModuleDashboardProps) {
  const queryClient = useQueryClient();
  const lastModuleIdRef = useRef(module._id);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('metadata');
  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(moduleDescription(module));
  const [themeId, setThemeId] = useState(module.themeId ?? '');
  const [status, setStatus] = useState<ContentModule['status']>(module.status);
  const [config, setConfig] = useState<ModuleWizard>(() => moduleToWizard(module));
  const [episodeSyncKey, setEpisodeSyncKey] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState(module.coverImageUrl ?? '');
  const [coverVideoUrl, setCoverVideoUrl] = useState(module.coverVideoUrl ?? '');
  const [coverPrompt, setCoverPrompt] = useState(`Public module cover for ${module.title}. ${moduleDescription(module)}`);
  const [coverVideoPrompt, setCoverVideoPrompt] = useState(`Short public module cover video for ${module.title}. ${moduleDescription(module)}`);
  const [coverImageModel, setCoverImageModel] = useState('');
  const [coverVideoModel, setCoverVideoModel] = useState('');
  const [coverVideoMentionOpen, setCoverVideoMentionOpen] = useState(false);
  const [coverVideoMentionQuery, setCoverVideoMentionQuery] = useState('');
  const [coverVideoMentionRange, setCoverVideoMentionRange] = useState({ start: 0, end: 0 });
  const [selectedCoverCharacterHandles, setSelectedCoverCharacterHandles] = useState<string[]>([]);
  const [coverVideoPolling, setCoverVideoPolling] = useState(module.status === 'generating');

  const { data: moduleEpisodes = [] } = useQuery({
    queryKey: ['content', 'episodes', module._id],
    queryFn: () => listContentEpisodes({ moduleId: module._id }),
  });
  const { data: aiModels } = useQuery({
    queryKey: ['content', 'ai-models'],
    queryFn: listAvailableAiModels,
  });
  const shouldPollCoverVideo = coverVideoPolling || module.status === 'generating';
  const { data: coverStatus } = useQuery({
    queryKey: ['content', 'module-cover-status', module._id],
    queryFn: () => pollKlingStatus(module._id),
    enabled: shouldPollCoverVideo,
    refetchInterval: shouldPollCoverVideo ? 5000 : false,
  });
  const activeModuleEpisodes = useMemo(
    () => moduleEpisodes.filter((episode) => ['queued', 'generating', 'ready', 'published'].includes(episode.status)),
    [moduleEpisodes],
  );
  const themeOptions: SelectOption<string>[] = [
    { value: '', label: 'No linked theme' },
    ...themes.map((theme) => ({ value: theme._id, label: `${theme.title} - ${theme.authorName}` })),
  ];
  const linkedTheme = themes.find((theme) => theme._id === themeId);
  const themeCharacterMentions = useMemo(() => parseThemeCharacterMentions(linkedTheme), [linkedTheme]);
  const themeCharacterReferences = useMemo(() => parseThemeCharacterReferences(linkedTheme), [linkedTheme]);

  useEffect(() => {
    const moduleChanged = lastModuleIdRef.current !== module._id;
    lastModuleIdRef.current = module._id;
    const nextConfig = moduleToWizard(module);
    setTitle(module.title);
    setDescription(moduleDescription(module));
    setThemeId(module.themeId ?? '');
    setStatus(module.status);
    setConfig(nextConfig);
    setEpisodeSyncKey('');
    setCoverImageUrl(module.coverImageUrl ?? '');
    setCoverVideoUrl(module.coverVideoUrl ?? '');
    if (moduleChanged) {
      setCoverPrompt(`Public module cover for ${module.title}. ${moduleDescription(module)}`);
      setCoverVideoPrompt(`Short public module cover video for ${module.title}. ${moduleDescription(module)}`);
      setSelectedCoverCharacterHandles([]);
    }
    setCoverVideoPolling(module.status === 'generating');
  }, [module]);

  useEffect(() => {
    const refreshedModule = coverStatus?.module;
    if (!refreshedModule) return;
    const generatedUrl = refreshedModule.coverVideoUrl || refreshedModule.masterVideoS3Url || refreshedModule.masterVideoCloudinaryUrl || refreshedModule.videoUrl || '';
    if (generatedUrl && generatedUrl !== coverVideoUrl) {
      setCoverVideoUrl(generatedUrl);
    }
    if (refreshedModule.status === 'ready' && generatedUrl) {
      setCoverVideoPolling(false);
      if (refreshedModule.coverVideoUrl !== generatedUrl) {
        updateContentModule(module._id, { coverVideoUrl: generatedUrl })
          .then(() => {
            toast.success('Module cover video is ready.');
            queryClient.invalidateQueries({ queryKey: ['content', 'modules'] });
            queryClient.invalidateQueries({ queryKey: ['public', 'stories'] });
            queryClient.invalidateQueries({ queryKey: ['feed'] });
          })
          .catch(() => toast.error('Cover video is ready, but could not save it as the module cover.'));
      }
    }
    if (refreshedModule.status === 'failed') {
      setCoverVideoPolling(false);
      toast.error(refreshedModule.lastError || 'Module cover video generation failed.');
    }
  }, [coverStatus, coverVideoUrl, module._id, queryClient]);

  useEffect(() => {
    const firstImageModel = aiModels?.image[0]?.value;
    if (!coverImageModel && firstImageModel) setCoverImageModel(firstImageModel);
    const firstVideoModel = aiModels?.video[0]?.value;
    if (!coverVideoModel && firstVideoModel) setCoverVideoModel(firstVideoModel);
  }, [aiModels?.image, aiModels?.video, coverImageModel, coverVideoModel]);

  useEffect(() => {
    const key = activeModuleEpisodes.map((episode) => `${episode._id}:${episode.title}:${episode.status}:${episode.updatedAt ?? ''}`).join('|');
    if (!key || key === episodeSyncKey) return;
    setConfig((current) => ({
      ...current,
      episodeQuota: current.continuous ? current.episodeQuota : Math.max(1, activeModuleEpisodes.length),
      roadmap: syncRoadmapWithEpisodes(current.roadmap, activeModuleEpisodes),
    }));
    setEpisodeSyncKey(key);
  }, [activeModuleEpisodes, episodeSyncKey]);

  useEffect(() => {
    if (!themeCharacterMentions.length) {
      if (selectedCoverCharacterHandles.length) setSelectedCoverCharacterHandles([]);
      return;
    }
    const availableHandles = new Set(themeCharacterMentions.map((character) => character.handle));
    const validHandles = selectedCoverCharacterHandles.filter((handle) => availableHandles.has(handle));
    if (validHandles.length !== selectedCoverCharacterHandles.length) {
      setSelectedCoverCharacterHandles(validHandles);
    }
  }, [selectedCoverCharacterHandles, themeCharacterMentions]);

  const updateMut = useMutation({
    mutationFn: (payload: Parameters<typeof updateContentModule>[1]) => updateContentModule(module._id, payload),
    onSuccess: () => {
      toast.success('Module settings saved.');
      queryClient.invalidateQueries({ queryKey: ['content', 'modules'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'stories'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: () => toast.error('Could not save module.'),
  });

  const coverImageMut = useMutation({
    mutationFn: () => generateModuleCoverImage(module._id, { prompt: coverPromptForRequest(coverPrompt), model: coverImageModel }),
    onSuccess: (result) => {
      const nextUrl = result.module.coverImageUrl ?? result.image.cloudinaryUrl ?? result.image.s3Url ?? '';
      setCoverImageUrl(nextUrl);
      toast.success('Module cover image generated.');
      queryClient.invalidateQueries({ queryKey: ['content', 'modules'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'stories'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not generate module cover image.')),
  });

  const coverVideoMut = useMutation({
    mutationFn: () => generateModuleVideo(module._id, {
      durationSeconds: 10,
      soundEnabled: false,
      generationMode: 'text2video',
      videoProvider: videoProviderFromModel(coverVideoModel) ?? moduleCoverFallbackProvider(module.videoProvider),
      openaiVideoModel: coverVideoModel === 'openai:sora-2-pro' ? 'sora-2-pro' : module.openaiVideoModel,
      coverVideoPrompt: coverPromptForRequest(coverVideoPrompt),
    }),
    onSuccess: (result) => {
      const generatedCoverVideo = result.masterVideoS3Url ?? result.masterVideoCloudinaryUrl ?? result.videoUrl ?? '';
      if (generatedCoverVideo) {
        setCoverVideoUrl(generatedCoverVideo);
        updateContentModule(module._id, { coverVideoUrl: generatedCoverVideo }).catch(() => {
          toast.error('Cover video generated, but could not save it as the module cover.');
        });
      }
      toast.success('Module cover video generation started.');
      setCoverVideoPolling(true);
      queryClient.invalidateQueries({ queryKey: ['content', 'modules'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not start module cover video generation.')),
  });

  const coverVideoMentionOptions = useMemo(
    () => themeCharacterMentions.filter((character) =>
      character.handle.toLowerCase().includes(coverVideoMentionQuery.toLowerCase()) ||
      character.name.toLowerCase().includes(coverVideoMentionQuery.toLowerCase()),
    ).slice(0, 8),
    [coverVideoMentionQuery, themeCharacterMentions],
  );
  const imageModelOptions: SelectOption<string>[] = (aiModels?.image ?? []).map((model) => ({
    value: model.value,
    label: `${model.providerLabel} - ${model.label}`,
  }));
  const videoModelOptions: SelectOption<string>[] = (aiModels?.video ?? [])
    .filter((model) => model.provider !== 'xai')
    .map((model) => ({
      value: model.value,
      label: `${model.providerLabel} - ${model.label}`,
    }));
  const canGenerateCoverImage = Boolean(coverPrompt.trim() && coverImageModel);
  const canGenerateCoverVideo = Boolean(coverVideoPrompt.trim() && coverVideoModel);
  const latestRenderedModuleVideo = module.masterVideoS3Url ?? module.masterVideoCloudinaryUrl ?? module.videoUrl ?? '';

  function coverPromptForRequest(prompt: string) {
    const selectedCharacters = selectedCoverCharacterPrompt(selectedCoverCharacterHandles);
    return [prompt.trim(), selectedCharacters].filter(Boolean).join('\n\n');
  }

  function saveModuleConfiguration(nextConfig: ModuleWizard, nextThemeId = themeId, extra: Parameters<typeof updateContentModule>[1] = {}) {
    const linked = themes.find((theme) => theme._id === nextThemeId);
    updateMut.mutate({
      ...extra,
      themeId: nextThemeId || null,
      themeLine: nextConfig.synopsis.trim(),
      genre: linked?.defaultGenre || nextConfig.optimizationTarget,
      creativePrompt: buildModuleConfig(nextConfig, linked),
    });
  }

  function patchConfig(patch: Partial<ModuleWizard>) {
    setConfig((current) => ({ ...current, ...patch }));
  }

  function updateRoadmap(id: string, key: keyof Omit<RoadmapItem, 'id'>, value: string) {
    setConfig((current) => ({
      ...current,
      roadmap: current.roadmap.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, [key]: value };
        return key === 'title' ? { ...next, slug: slugify(value) } : next;
      }),
    }));
  }

  function addRoadmapRow() {
    setConfig((current) => ({
      ...current,
      roadmap: [...current.roadmap, { id: crypto.randomUUID(), title: '', keyword: '', slug: '' }],
    }));
  }

  function removeRoadmapRow(id: string) {
    setConfig((current) => ({
      ...current,
      roadmap: current.roadmap.length > 1 ? current.roadmap.filter((item) => item.id !== id) : current.roadmap,
    }));
  }

  function saveMetadata() {
    const nextConfig = { ...config, title: title.trim(), synopsis: description.trim() };
    setConfig(nextConfig);
    updateMut.mutate({
      title: title.trim(),
      themeLine: description.trim(),
      status,
      creativePrompt: buildModuleConfig(nextConfig, linkedTheme),
    });
  }

  function saveTheme() {
    const nextConfig = { ...config, themeId };
    setConfig(nextConfig);
    saveModuleConfiguration(nextConfig, themeId);
  }

  function saveCoverMedia() {
    updateMut.mutate({
      coverImageUrl: coverImageUrl.trim(),
      coverVideoUrl: coverVideoUrl.trim(),
    });
  }

  function useLatestGeneratedVideoAsCover() {
    if (!latestRenderedModuleVideo) return;
    setCoverVideoUrl(latestRenderedModuleVideo);
    updateMut.mutate({ coverVideoUrl: latestRenderedModuleVideo });
  }

  function clearCoverImage() {
    setCoverImageUrl('');
    updateMut.mutate({ coverImageUrl: '' });
  }

  function clearCoverVideo() {
    setCoverVideoUrl('');
    updateMut.mutate({ coverVideoUrl: '' });
  }

  function handleCoverVideoPromptChange(value: string, caret: number) {
    setCoverVideoPrompt(value);
    const beforeCaret = value.slice(0, caret);
    const mentionMatch = beforeCaret.match(/(^|\s)@([\w-]*)$/);
    if (!mentionMatch) {
      setCoverVideoMentionOpen(false);
      setCoverVideoMentionQuery('');
      return;
    }
    const query = mentionMatch[2] ?? '';
    setCoverVideoMentionOpen(true);
    setCoverVideoMentionQuery(query);
    setCoverVideoMentionRange({ start: caret - query.length - 1, end: caret });
  }

  function insertCoverVideoCharacterMention(handle: string) {
    setCoverVideoPrompt((current) => `${current.slice(0, coverVideoMentionRange.start)}${handle} ${current.slice(coverVideoMentionRange.end)}`);
    setCoverVideoMentionOpen(false);
    setCoverVideoMentionQuery('');
  }

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Module Dashboard</p>
            <h2 className="mt-1 text-xl font-semibold text-dark">{module.title}</h2>
            <p className="mt-2 max-w-2xl whitespace-pre-wrap text-xs leading-relaxed text-muted">{moduleDescription(module)}</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${lifecycleClass(module.status)}`}>{module.status}</span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white shadow-sm">
        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 pt-3">
          {MANAGEMENT_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDashboardTab(id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-3 py-2 text-xs font-semibold ${dashboardTab === id ? 'border-[var(--color-muted-olive)] text-[var(--color-ash-brown)]' : 'border-transparent text-muted hover:text-dark'}`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {dashboardTab === 'metadata' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <FieldShell label="Module Title">
                <input className="input-field text-sm" value={title} onChange={(event) => setTitle(event.target.value)} />
              </FieldShell>
              <FieldShell label="Status">
                <Select aria-label="Module status" value={status} options={STATUS_OPTIONS} onChange={(value) => setStatus(value)} />
              </FieldShell>
              <FieldShell label="Base URL Slug">
                <input className="input-field text-sm" value={config.slug} onChange={(event) => patchConfig({ slug: slugify(event.target.value) })} />
              </FieldShell>
              <FieldShell label="Lifecycle Status">
                <Select aria-label="Lifecycle status" value={config.status} options={LIFECYCLE_OPTIONS} onChange={(value) => patchConfig({ status: value })} />
              </FieldShell>
              <div className="lg:col-span-2">
                <FieldShell label="Synopsis / Description">
                  <textarea className="input-field min-h-[120px] text-sm" value={description} onChange={(event) => setDescription(event.target.value)} />
                </FieldShell>
              </div>
              <button type="button" onClick={saveMetadata} disabled={updateMut.isPending || !title.trim() || !description.trim()} className="inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45">
                {updateMut.isPending ? <CheckCircle2 size={16} /> : <Save size={16} />} Save metadata
              </button>
            </div>
          )}

          {dashboardTab === 'theme' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <FieldShell label="Linked Theme">
                  <Select aria-label="Linked theme" value={themeId} options={themeOptions} onChange={(value) => setThemeId(String(value))} />
                </FieldShell>
                <FieldShell label="Module-Specific Overrides">
                  <textarea className="input-field min-h-[120px] text-sm" value={config.overrides} onChange={(event) => patchConfig({ overrides: event.target.value })} />
                </FieldShell>
                <button type="button" onClick={saveTheme} disabled={updateMut.isPending} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45">
                  <Save size={16} /> Save theme
                </button>
                <div className="rounded-xl border border-border bg-white p-4">
                  <p className="text-sm font-semibold text-dark">Module Rules and Overrides</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    Theme core rules are inherited from the connected theme. Keep the module description in Metadata; use the episode workspace for prompt-level changes.
                  </p>
                </div>
              </div>
              <ThemePreviewCard theme={linkedTheme} />
            </div>
          )}

          {dashboardTab === 'cover' && (
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-white p-4">
                  <div className="flex items-start gap-3">
                    <span className="rounded-xl bg-[var(--color-tea-green)]/35 p-2 text-[var(--color-ash-brown)]"><ImageIcon size={18} /></span>
                    <div>
                      <p className="text-sm font-semibold text-dark">Module cover media</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        Public stories use this module cover image or video. Episode watch videos stay on social platforms and are never used as episode covers.
                      </p>
                    </div>
                  </div>
                </div>
                <CoverCharacterSelector
                  characters={themeCharacterMentions}
                  references={themeCharacterReferences}
                  selectedHandles={selectedCoverCharacterHandles}
                  onChange={setSelectedCoverCharacterHandles}
                />
                <FieldShell label="Cover Image Prompt">
                  <textarea className="input-field min-h-[120px] text-sm" value={coverPrompt} onChange={(event) => setCoverPrompt(event.target.value)} />
                </FieldShell>
                <FieldShell label="Image Model">
                  <Select
                    aria-label="Module cover image model"
                    value={coverImageModel}
                    options={imageModelOptions}
                    onChange={(value) => setCoverImageModel(String(value))}
                  />
                </FieldShell>
                <button
                  type="button"
                  onClick={() => coverImageMut.mutate()}
                  disabled={coverImageMut.isPending || !canGenerateCoverImage}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45"
                >
                  {coverImageMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Generate module cover image
                </button>
              </div>

              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-border bg-[var(--color-tea-green)]/10">
                  <div className="aspect-video bg-white">
                    {coverVideoUrl.trim() ? (
                      <video src={coverVideoUrl.trim()} className="h-full w-full object-cover" muted loop playsInline controls />
                    ) : coverImageUrl.trim() ? (
                      <ProtectedStudioImage
                        originUrl={coverImageUrl.trim()}
                        alt="Module cover"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-semibold text-muted">No module cover media yet</div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-white px-3 py-2">
                    <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                      <span className={`rounded-full px-2 py-1 ${coverImageUrl.trim() ? 'bg-[var(--color-tea-green)]/35 text-[var(--color-ash-brown)]' : 'bg-soft text-muted'}`}>
                        Image {coverImageUrl.trim() ? 'ready' : 'not set'}
                      </span>
                      <span className={`rounded-full px-2 py-1 ${coverVideoUrl.trim() ? 'bg-[var(--color-tea-green)]/35 text-[var(--color-ash-brown)]' : 'bg-soft text-muted'}`}>
                        Video {coverVideoUrl.trim() ? 'ready' : coverVideoPolling ? 'generating' : 'not set'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={clearCoverImage} disabled={!coverImageUrl.trim() || updateMut.isPending} className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-dark disabled:opacity-45">
                        Clear image
                      </button>
                      <button type="button" onClick={clearCoverVideo} disabled={!coverVideoUrl.trim() || updateMut.isPending} className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-dark disabled:opacity-45">
                        Clear video
                      </button>
                    </div>
                  </div>
                </div>
                <FieldShell label="Cover Video Prompt">
                  <div className="relative">
                    <textarea
                      className="input-field min-h-[100px] text-sm"
                      value={coverVideoPrompt}
                      onChange={(event) => handleCoverVideoPromptChange(event.target.value, event.currentTarget.selectionStart)}
                      placeholder="Describe the module cover video. Type @ to reference theme characters."
                    />
                    {coverVideoMentionOpen && (
                      <div className="absolute left-3 top-12 z-20 w-64 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
                        {coverVideoMentionOptions.length > 0 ? (
                          coverVideoMentionOptions.map((character) => (
                            <button
                              key={character.handle}
                              type="button"
                              onClick={() => insertCoverVideoCharacterMention(character.handle)}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-[var(--color-tea-green)]/25"
                            >
                              <span className="font-semibold text-dark">{character.handle}</span>
                              <span className="truncate text-muted">{character.name}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs leading-relaxed text-muted">No character handles found in the linked Theme.</div>
                        )}
                      </div>
                    )}
                  </div>
                </FieldShell>
                <FieldShell label="Cover Video Model">
                  <Select
                    aria-label="Module cover video model"
                    value={coverVideoModel}
                    options={videoModelOptions}
                    onChange={(value) => setCoverVideoModel(String(value))}
                  />
                </FieldShell>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={saveCoverMedia} disabled={updateMut.isPending} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45">
                    <Save size={16} /> Save cover media
                  </button>
                  <button type="button" onClick={() => coverVideoMut.mutate()} disabled={coverVideoMut.isPending || !canGenerateCoverVideo} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-dark disabled:opacity-45">
                    {coverVideoMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
                    Generate cover video
                  </button>
                  <button type="button" onClick={useLatestGeneratedVideoAsCover} disabled={!latestRenderedModuleVideo || updateMut.isPending} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-dark disabled:opacity-45">
                    <Video size={16} /> Use latest generated video
                  </button>
                </div>
              </div>
            </div>
          )}

          {dashboardTab === 'season' && featureFlags.moduleTopicRoadmapEnabled && (
            <div className="space-y-4">
              {activeModuleEpisodes.length > 0 && (
                <div className="rounded-xl border border-[var(--color-tea-green)] bg-[var(--color-tea-green)]/15 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-dark">Synced with active pipeline and published episodes</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        {activeModuleEpisodes.length} active episode{activeModuleEpisodes.length === 1 ? '' : 's'} found. Queued, generating, ready, and published episodes override planned roadmap titles; drafts and failed episodes stay out of the season sync.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => patchConfig({
                        episodeQuota: config.continuous ? config.episodeQuota : Math.max(1, activeModuleEpisodes.length),
                        roadmap: syncRoadmapWithEpisodes(config.roadmap, activeModuleEpisodes),
                      })}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-muted-olive)] px-3 py-2 text-xs font-semibold text-[var(--color-ash-brown)]"
                    >
                      Sync now
                    </button>
                  </div>
                </div>
              )}
              <div className="grid gap-4 lg:grid-cols-[0.45fr_1fr]">
                <div className="rounded-xl border border-border p-4">
                  <label className="flex items-center gap-3 text-sm font-semibold text-dark">
                    <input type="checkbox" checked={config.continuous} onChange={(event) => patchConfig({ continuous: event.target.checked })} />
                    Continuous / Infinite Module
                  </label>
                  <div className="mt-4">
                    <FieldShell label="Episode Quota / Target">
                      <input disabled={config.continuous} type="number" min={1} className="input-field text-sm disabled:opacity-50" value={config.episodeQuota} onChange={(event) => patchConfig({ episodeQuota: Number(event.target.value) || 1 })} />
                    </FieldShell>
                  </div>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-dark">Topic Roadmap Builder</p>
                      <p className="text-xs text-muted">Edit episode titles, target keywords, and slugs.</p>
                    </div>
                    <button type="button" onClick={addRoadmapRow} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-dark">Add row</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-left text-xs">
                      <thead className="border-b border-border text-muted">
                        <tr>
                          <th className="py-2 pr-2 font-medium">Episode Title</th>
                          <th className="py-2 pr-2 font-medium">Target Keyword / Topic</th>
                          <th className="py-2 pr-2 font-medium">Episode Slug</th>
                          <th className="py-2 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/70">
                        {config.roadmap.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2 pr-2"><input className="input-field text-xs" value={item.title} onChange={(event) => updateRoadmap(item.id, 'title', event.target.value)} /></td>
                            <td className="py-2 pr-2"><input className="input-field text-xs" value={item.keyword} onChange={(event) => updateRoadmap(item.id, 'keyword', event.target.value)} /></td>
                            <td className="py-2 pr-2"><input className="input-field text-xs" value={item.slug} onChange={(event) => updateRoadmap(item.id, 'slug', slugify(event.target.value))} /></td>
                            <td className="py-2"><button type="button" onClick={() => removeRoadmapRow(item.id)} className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-muted">Remove</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <SaveConfigurationButton pending={updateMut.isPending} onClick={() => saveModuleConfiguration(config)} />
            </div>
          )}

          {dashboardTab === 'destinations' && (
            <div className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-3">
                {(Object.keys(PLATFORM_COPY) as Platform[]).map((platform) => (
                  <div key={platform} className={`rounded-xl border p-4 ${config.destinations[platform] ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/20' : 'border-border'}`}>
                    <label className="flex items-start gap-3">
                      <input type="checkbox" checked={config.destinations[platform]} onChange={(event) => patchConfig({ destinations: { ...config.destinations, [platform]: event.target.checked } })} />
                      <span>
                        <span className="block text-sm font-semibold text-dark">{PLATFORM_COPY[platform].label}</span>
                        <span className="mt-1 block text-xs text-muted">{PLATFORM_COPY[platform].account}</span>
                      </span>
                    </label>
                  </div>
                ))}
              </div>
              {(Object.keys(PLATFORM_COPY) as Platform[]).filter((platform) => config.destinations[platform]).map((platform) => (
                <FieldShell key={platform} label={`${PLATFORM_COPY[platform].label} Formatting Rules`}>
                  <textarea className="input-field min-h-[90px] text-sm" value={config.formatting[platform]} onChange={(event) => patchConfig({ formatting: { ...config.formatting, [platform]: event.target.value } })} />
                </FieldShell>
              ))}
              <FieldShell label="Default Asset Fallback Rules">
                <textarea className="input-field min-h-[90px] text-sm" value={config.fallbackRules} onChange={(event) => patchConfig({ fallbackRules: event.target.value })} />
              </FieldShell>
              <SaveConfigurationButton pending={updateMut.isPending} onClick={() => saveModuleConfiguration(config)} />
            </div>
          )}

          {dashboardTab === 'automation' && (
            <div className="space-y-4">
              {!featureFlags.moduleAutomationEnabled ? (
                <div className="rounded-xl border border-[var(--color-faded-copper)]/40 bg-[var(--color-tea-green)]/30 px-4 py-3 text-sm text-dark">
                  {MODULE_AUTOMATION_DISABLED_MESSAGE}
                </div>
              ) : null}
              <fieldset
                disabled={!featureFlags.moduleAutomationEnabled}
                className={`space-y-4 ${!featureFlags.moduleAutomationEnabled ? 'opacity-60' : ''}`}
              >
              <div className="grid gap-4 lg:grid-cols-2">
                <FieldShell label="Generation Frequency">
                  <Select aria-label="Generation frequency" value={config.frequency} options={FREQUENCY_OPTIONS} onChange={(value) => patchConfig({ frequency: value })} />
                </FieldShell>
                <FieldShell label="Timezone">
                  <Select aria-label="Timezone" value={config.timezone} options={TIMEZONE_OPTIONS} onChange={(value) => patchConfig({ timezone: String(value) })} />
                </FieldShell>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={`rounded-xl border p-4 ${config.requireApproval ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/20' : 'border-border'}`}>
                  <input type="radio" name={`approval-${module._id}`} checked={config.requireApproval} onChange={() => patchConfig({ requireApproval: true })} />
                  <span className="ml-2 text-sm font-semibold text-dark">Require Manual Approval</span>
                </label>
                <label className={`rounded-xl border p-4 ${!config.requireApproval ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/20' : 'border-border'}`}>
                  <input type="radio" name={`approval-${module._id}`} checked={!config.requireApproval} onChange={() => patchConfig({ requireApproval: false })} />
                  <span className="ml-2 text-sm font-semibold text-dark">Bypass Review and Auto-Publish</span>
                </label>
              </div>
              </fieldset>
              {featureFlags.moduleAutomationEnabled ? (
                <SaveConfigurationButton pending={updateMut.isPending} onClick={() => saveModuleConfiguration(config)} />
              ) : null}
            </div>
          )}

          {dashboardTab === 'performance' && (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="rounded-xl border border-border p-4">
                  <input type="checkbox" checked={config.metricIngestion} onChange={(event) => patchConfig({ metricIngestion: event.target.checked })} />
                  <span className="ml-2 text-sm font-semibold text-dark">Enable Metric Ingestion</span>
                  <span className="mt-1 block text-xs text-muted">Ingest views, watch time, engagement, and platform metrics.</span>
                </label>
                <FieldShell label="Optimization Target">
                  <Select aria-label="Optimization target" value={config.optimizationTarget} options={OPTIMIZATION_OPTIONS} onChange={(value) => patchConfig({ optimizationTarget: value })} />
                </FieldShell>
              </div>
              <SaveConfigurationButton pending={updateMut.isPending} onClick={() => saveModuleConfiguration(config)} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function videoProviderFromModel(model: string): 'kling' | 'openai' | 'veo' | null {
  if (model.startsWith('openai:')) return 'openai';
  if (model.startsWith('google:')) return 'veo';
  if (model.startsWith('kling:')) return 'kling';
  return null;
}

function moduleCoverFallbackProvider(provider: ContentModule['videoProvider']): 'kling' | 'openai' | 'veo' {
  if (provider === 'kling' || provider === 'openai' || provider === 'veo') return provider;
  return 'openai';
}

function apiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || fallback;
  }
  return fallback;
}

function SaveConfigurationButton({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45">
      <Save size={16} /> {pending ? 'Saving...' : 'Save configuration'}
    </button>
  );
}
