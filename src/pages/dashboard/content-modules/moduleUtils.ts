import type { ContentEpisode, ContentModule, ContentTheme } from '@/api/content';
import { featureFlags } from '@/config/featureFlags';

export const MODULE_AUTOMATION_DISABLED_MESSAGE =
  'Module automation is temporarily disabled. Modules use manual generation with required approval only.';

export function moduleAutomationFields(
  form: ModuleWizard,
): Pick<ModuleWizard, 'frequency' | 'timezone' | 'requireApproval'> {
  if (featureFlags.moduleAutomationEnabled) {
    return {
      frequency: form.frequency,
      timezone: form.timezone,
      requireApproval: form.requireApproval,
    };
  }

  return {
    frequency: 'manual',
    timezone: form.timezone,
    requireApproval: true,
  };
}
export type Platform = 'youtube' | 'tiktok' | 'facebook';
export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'manual';
export type OptimizationTarget = 'engagement' | 'retention' | 'ctr';
export type ModuleLifecycle = 'draft' | 'active' | 'paused' | 'completed';

export type RoadmapItem = {
  id: string;
  title: string;
  keyword: string;
  slug: string;
};

export type ModuleWizard = {
  title: string;
  synopsis: string;
  slug: string;
  status: ModuleLifecycle;
  themeId: string;
  themeSearch: string;
  overrides: string;
  continuous: boolean;
  episodeQuota: number;
  roadmap: RoadmapItem[];
  destinations: Record<Platform, boolean>;
  formatting: Record<Platform, string>;
  fallbackRules: string;
  frequency: Frequency;
  timezone: string;
  requireApproval: boolean;
  metricIngestion: boolean;
  optimizationTarget: OptimizationTarget;
};

export const PLATFORM_COPY: Record<Platform, { label: string; account: string; defaultRule: string }> = {
  youtube: {
    label: 'YouTube',
    account: 'Official Studio YouTube',
    defaultRule: 'Use a clear title, structured description, playlist-ready metadata, and script pacing suitable for YouTube Shorts or long-form.',
  },
  tiktok: {
    label: 'TikTok',
    account: 'Official Studio TikTok',
    defaultRule: 'Keep captions compact, hooks immediate, spacing mobile-first, and media strictly vertical.',
  },
  facebook: {
    label: 'Instagram',
    account: 'Official Studio Instagram',
    defaultRule: 'Use context-rich post copy, page-friendly formatting, and feed-safe video framing.',
  },
};

export function emptyWizard(): ModuleWizard {
  return {
    title: '',
    synopsis: '',
    slug: '',
    status: 'draft',
    themeId: '',
    themeSearch: '',
    overrides: '',
    continuous: false,
    episodeQuota: 12,
    roadmap: [
      { id: crypto.randomUUID(), title: '', keyword: '', slug: '' },
      { id: crypto.randomUUID(), title: '', keyword: '', slug: '' },
      { id: crypto.randomUUID(), title: '', keyword: '', slug: '' },
    ],
    destinations: { youtube: true, tiktok: true, facebook: false },
    formatting: {
      youtube: PLATFORM_COPY.youtube.defaultRule,
      tiktok: PLATFORM_COPY.tiktok.defaultRule,
      facebook: PLATFORM_COPY.facebook.defaultRule,
    },
    fallbackRules: 'If episode-specific images are missing, use the theme global references first; if none exist, generate clean abstract visual anchors that match the theme rules.',
    frequency: 'weekly',
    timezone: 'Africa/Lagos',
    requireApproval: true,
    metricIngestion: true,
    optimizationTarget: 'engagement',
  };
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function lifecycleClass(status: ModuleLifecycle | ContentModule['status']) {
  if (status === 'active' || status === 'ready' || status === 'published') return 'bg-[var(--color-muted-olive)]/20 text-[var(--color-ash-brown)]';
  if (status === 'paused' || status === 'generating') return 'bg-[var(--color-faded-copper)]/15 text-[var(--color-faded-copper)]';
  if (status === 'completed') return 'bg-[var(--color-tea-green)]/45 text-[var(--color-ash-brown)]';
  if (status === 'failed') return 'bg-red-50 text-red-600';
  return 'bg-white text-muted border border-border';
}

export function moduleDescription(module: Pick<ContentModule, 'themeLine' | 'genre' | 'creativePrompt'>) {
  const synopsis = module.creativePrompt.match(/^Synopsis:\s*(.+)$/im)?.[1]?.trim();
  const themeLine = module.themeLine?.trim();
  const looksLikeThemeBible =
    /^Elevator Pitch:/i.test(themeLine) ||
    themeLine.includes('WORLD-BUILDING AND LORE') ||
    themeLine.includes('CHARACTER ROSTER') ||
    themeLine.includes('CORE RULES / BOUNDARIES');

  return synopsis || (looksLikeThemeBible ? module.genre : themeLine || module.genre);
}

function configValue(source: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return source.match(new RegExp(`^${escaped}:\\s*(.+)$`, 'im'))?.[1]?.trim() ?? '';
}

function configBlock(source: string, from: string, until: string[]): string {
  const start = source.search(new RegExp(`^${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:?\\s*$`, 'im'));
  if (start < 0) return '';
  const afterStart = source.slice(start).split(/\r?\n/).slice(1).join('\n');
  const stopPattern = until.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const stop = afterStart.search(new RegExp(`^(${stopPattern}):?\\s*$`, 'im'));
  return (stop >= 0 ? afterStart.slice(0, stop) : afterStart).trim();
}

function lifecycleFromConfig(value: string): ModuleLifecycle {
  return value === 'active' || value === 'paused' || value === 'completed' ? value : 'draft';
}

function frequencyFromConfig(value: string): Frequency {
  return value === 'daily' || value === 'biweekly' || value === 'monthly' || value === 'manual' ? value : 'weekly';
}

function optimizationFromConfig(value: string): OptimizationTarget {
  return value === 'retention' || value === 'ctr' ? value : 'engagement';
}

function parseRoadmap(source: string): RoadmapItem[] {
  const rows: RoadmapItem[] = [];
  const pattern = /^Episode\s+\d+:\s*(.*)$/gim;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const chunk = source.slice(match.index, pattern.lastIndex + 500);
    rows.push({
      id: crypto.randomUUID(),
      title: match[1]?.trim() === 'Untitled' ? '' : match[1]?.trim() ?? '',
      keyword: chunk.match(/^- Target Keyword\/Topic:\s*(.+)$/im)?.[1]?.replace(/^Unset$/i, '').trim() ?? '',
      slug: chunk.match(/^- Episode Slug:\s*(.+)$/im)?.[1]?.replace(/^unset$/i, '').trim() ?? '',
    });
  }
  return rows.length ? rows : emptyWizard().roadmap;
}

function parseFormatting(source: string, platform: Platform): string {
  const label = PLATFORM_COPY[platform].label;
  const nextLabels = (Object.keys(PLATFORM_COPY) as Platform[])
    .filter((item) => item !== platform)
    .map((item) => `${PLATFORM_COPY[item].label} Formatting`);
  return configBlock(source, `${label} Formatting`, [...nextLabels, 'Default Asset Fallback', 'AUTOMATION AND APPROVAL']) || PLATFORM_COPY[platform].defaultRule;
}

export function moduleToWizard(module: ContentModule): ModuleWizard {
  const base = emptyWizard();
  const source = module.creativePrompt || '';
  const accountLine = configValue(source, 'Central Platform Accounts');
  const episodeScope = configValue(source, 'Episode Scope');
  const quota = Number(episodeScope.match(/(\d+)/)?.[1] ?? base.episodeQuota);

  return {
    ...base,
    title: configValue(source, 'Title') || module.title,
    synopsis: moduleDescription(module),
    slug: configValue(source, 'Base URL Slug') || slugify(module.title),
    status: lifecycleFromConfig(configValue(source, 'Lifecycle Status')),
    themeId: module.themeId ?? '',
    overrides: configValue(source, 'Module Overrides').replace(/^None$/i, ''),
    continuous: /continuous|infinite/i.test(episodeScope),
    episodeQuota: Number.isFinite(quota) && quota > 0 ? quota : base.episodeQuota,
    roadmap: parseRoadmap(source),
    destinations: {
      youtube: accountLine.includes(PLATFORM_COPY.youtube.account),
      tiktok: accountLine.includes(PLATFORM_COPY.tiktok.account),
      facebook: accountLine.includes(PLATFORM_COPY.facebook.account),
    },
    formatting: {
      youtube: parseFormatting(source, 'youtube'),
      tiktok: parseFormatting(source, 'tiktok'),
      facebook: parseFormatting(source, 'facebook'),
    },
    fallbackRules: configValue(source, 'Default Asset Fallback') || base.fallbackRules,
    frequency: frequencyFromConfig(configValue(source, 'Generation Frequency')),
    timezone: configValue(source, 'Timezone') || base.timezone,
    requireApproval: !/auto-publish/i.test(configValue(source, 'Approval Workflow')),
    metricIngestion: /enabled/i.test(configValue(source, 'Metric Ingestion')) || base.metricIngestion,
    optimizationTarget: optimizationFromConfig(configValue(source, 'Optimization Target')),
  };
}

export function syncRoadmapWithEpisodes(roadmap: RoadmapItem[], episodes: ContentEpisode[]): RoadmapItem[] {
  const activeEpisodes = episodes.filter((episode) =>
    !episode.sceneOnly
    && !episode.sourceEpisodeId
    && ['queued', 'generating', 'ready', 'published'].includes(episode.status),
  );
  if (activeEpisodes.length === 0) return roadmap;

  const orderedEpisodes = [...activeEpisodes].sort((a, b) => {
    const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return createdA - createdB;
  });

  return orderedEpisodes.map((episode, index) => {
    const current = roadmap[index];
    const title = episode.title.trim() || current?.title || `Episode ${index + 1}`;
    return {
      id: current?.id || episode._id || crypto.randomUUID(),
      title,
      keyword: current?.keyword?.trim() || episode.basePrompt?.trim().slice(0, 140) || '',
      slug: current?.slug?.trim() || slugify(title),
    };
  });
}

export function sanitizeThemeCoreRules(theme?: Pick<ContentTheme, 'defaultStoryPrompt'>): string {
  const raw = theme?.defaultStoryPrompt?.trim();
  if (!raw) return 'No core rules saved for this theme.';

  const beforeBuilderJson = raw.split(/\n?THEME_BUILDER_JSON\b/i)[0] ?? raw;
  const beforeCharacterJson = beforeBuilderJson.split(/\n?CHARACTER_REFERENCE_LIBRARY_JSON\b/i)[0] ?? beforeBuilderJson;

  const lines = beforeCharacterJson
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^[_a-f0-9]{12,}$/i.test(line))
    .filter((line) => !/^https?:\/\//i.test(line))
    .filter((line) => !/(cloudinary|s3|firebase|storage|publicId|s3Key|s3Url|cloudinaryUrl)/i.test(line))
    .filter((line) => !/^[[{].*[\]}]$/.test(line));

  return lines.join('\n') || 'No author-facing core rules saved for this theme.';
}

export function buildModuleConfig(form: ModuleWizard, theme?: ContentTheme) {
  const selectedPlatforms = (Object.keys(form.destinations) as Platform[]).filter((platform) => form.destinations[platform]);
  const roadmap = form.roadmap.filter((item) => item.title || item.keyword || item.slug);
  const automation = moduleAutomationFields(form);
  return [
    'MODULE CONFIGURATION',
    '',
    `Title: ${form.title}`,
    `Synopsis: ${form.synopsis}`,
    `Base URL Slug: ${form.slug}`,
    `Lifecycle Status: ${form.status}`,
    '',
    'THEME INHERITANCE',
    `Theme: ${theme?.title ?? 'No theme selected'}`,
    `Theme Tone/Core Rules: ${sanitizeThemeCoreRules(theme)}`,
    `Module Overrides: ${form.overrides || 'None'}`,
    '',
    'SEASON ARCHITECTURE',
    `Episode Scope: ${form.continuous ? 'Continuous / Infinite' : `${form.episodeQuota} target episodes`}`,
    ...roadmap.flatMap((item, index) => [
      `Episode ${index + 1}: ${item.title || 'Untitled'}`,
      `- Target Keyword/Topic: ${item.keyword || 'Unset'}`,
      `- Episode Slug: ${item.slug || 'unset'}`,
    ]),
    '',
    'DESTINATION ROUTING',
    `Central Platform Accounts: ${selectedPlatforms.map((platform) => PLATFORM_COPY[platform].account).join(', ') || 'None'}`,
    ...selectedPlatforms.flatMap((platform) => [
      `${PLATFORM_COPY[platform].label} Formatting:`,
      form.formatting[platform],
    ]),
    `Default Asset Fallback: ${form.fallbackRules}`,
    '',
    'AUTOMATION AND APPROVAL',
    `Generation Frequency: ${automation.frequency}`,
    `Timezone: ${automation.timezone}`,
    `Approval Workflow: ${automation.requireApproval ? 'Require manual approval' : 'Auto-publish via central API'}`,
    '',
    'PERFORMANCE FEEDBACK LOOP',
    `Metric Ingestion: ${form.metricIngestion ? 'Enabled' : 'Disabled'}`,
    `Optimization Target: ${form.optimizationTarget}`,
  ].join('\n');
}
