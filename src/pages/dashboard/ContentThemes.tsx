import { useEffect, useState, type ElementType, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  BookOpen,
  DollarSign,
  Eye,
  Globe2,
  Images,
  ImageIcon,
  Library,
  Loader2,
  Lock,
  Palette,
  PencilLine,
  RefreshCcw,
  Save,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tag,
  UploadCloud,
  UserRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createTheme,
  generateEpisodeImage as generateCharacterImageRequest,
  generateEpisodeTts,
  listAvailableAiModels,
  saveContentStudioDraft,
  updateTheme,
  uploadThemeReferences,
  type AvailableAiModels,
  type ContentTheme,
  type MediaUploadResult,
} from '@/api/content';
import { buildThemeCharacterImagePrompt } from './content-themes/themeCharacterPrompt';
import { ThemeCharacterTtsPreview } from './content-themes/ThemeCharacterTtsPreview';
import { ProtectedStudioImage } from '@/pages/dashboard/content-episodes/ProtectedStudioImage';
import { themeCharacterTtsProfile } from './content-episodes/characterTts';
import { normalizePitchPercent, normalizeToneDirection } from './content-episodes/ttsTone';
import { playEpisodeAudio } from './content-episodes/episodeAudioPlayback';
import { studioStreamMediaUrl } from './content-episodes/studioMediaUrl';

type ThemeCharacterImage = {
  id: string;
  url: string;
  label: string;
  prompt: string;
  s3Url?: string;
  s3Key?: string;
  publicId?: string;
};

type ThemeCharacter = {
  id: string;
  name: string;
  handle: string;
  role: string;
  motivations: string;
  quirks: string;
  visualPrompt: string;
  ttsVoiceProfile?: string;
  ttsTonePreset?: string;
  ttsToneDirection?: string;
  ttsPacePreset?: string;
  ttsPitchPercent?: number;
  ttsTestPhrase?: string;
  preview?: ThemeCharacterImage;
  gallery: ThemeCharacterImage[];
};

type ThemeAsset = {
  id: string;
  file?: File;
  name: string;
  tag: string;
};

type ThemeBuilderState = {
  name: string;
  pitch: string;
  tagInput: string;
  tags: string[];
  setting: string;
  locations: string;
  atmosphere: string;
  characters: ThemeCharacter[];
  rules: string;
  formal: number;
  humorous: number;
  formatting: string;
  negativeInput: string;
  negatives: string[];
  assets: ThemeAsset[];
  scope: 'private' | 'public';
  attribution: string;
  usageTracking: boolean;
};

const EMPTY_AI_MODELS: AvailableAiModels = {
  text: [],
  image: [],
  video: [],
  audio: [],
};

const CHARACTER_LIBRARY_MARKER = 'CHARACTER_REFERENCE_LIBRARY_JSON';
const MAX_LOCKED_CHARACTER_REFERENCE_IMAGES = 3;
const THEME_BUILDER_MARKER = 'THEME_BUILDER_JSON';

function emptyThemeBuilder(): ThemeBuilderState {
  return {
    name: '',
    pitch: '',
    tagInput: '',
    tags: [],
    setting: '',
    locations: '',
    atmosphere: '',
    characters: [],
    rules: '',
    formal: 50,
    humorous: 50,
    formatting: '',
    negativeInput: '',
    negatives: [],
    assets: [],
    scope: 'private',
    attribution: '',
    usageTracking: false,
  };
}

function emptyThemeCharacter(): ThemeCharacter {
  return {
    id: crypto.randomUUID(),
    name: '',
    handle: '',
    role: '',
    motivations: '',
    quirks: '',
    visualPrompt: '',
    gallery: [],
  };
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function addToken(value: string, tokens: string[]) {
  const next = value.trim();
  if (!next || tokens.includes(next)) return tokens;
  return [...tokens, next];
}

function normalizeCharacter(character: Partial<ThemeCharacter>): ThemeCharacter {
  return {
    id: character.id || crypto.randomUUID(),
    name: character.name || '',
    handle: character.handle || '',
    role: character.role || '',
    motivations: character.motivations || '',
    quirks: character.quirks || '',
    visualPrompt: character.visualPrompt || '',
    ttsVoiceProfile: character.ttsVoiceProfile,
    ttsTonePreset: character.ttsTonePreset,
    ttsToneDirection: normalizeToneDirection(character.ttsToneDirection),
    ttsPacePreset: character.ttsPacePreset,
    ttsPitchPercent: normalizePitchPercent(character.ttsPitchPercent ?? (character as { ttsPitchPreset?: string }).ttsPitchPreset),
    ttsTestPhrase: character.ttsTestPhrase,
    preview: character.preview,
    gallery: Array.isArray(character.gallery) ? character.gallery : [],
  };
}

function normalizeThemeBuilder(builder: ThemeBuilderState): ThemeBuilderState {
  return {
    ...builder,
    characters: (builder.characters ?? []).map((character) => normalizeCharacter(character)),
    assets: builder.assets ?? [],
    tags: builder.tags ?? [],
    negatives: builder.negatives ?? [],
  };
}

function normalizeHandle(value: string, fallbackName = '') {
  const source = value.trim() || fallbackName.trim();
  if (!source) return '';
  const cleaned = source.replace(/^@+/, '').replace(/\s+/g, '').replace(/[^\w-]/g, '');
  return cleaned ? `@${cleaned}` : '';
}

function uploadToCharacterImage(upload: MediaUploadResult, prompt: string, label: string): ThemeCharacterImage {
  const storedUrl = upload.cloudinaryUrl || upload.s3Url;
  return {
    id: crypto.randomUUID(),
    url: storedUrl,
    label,
    prompt,
    s3Url: upload.s3Url || storedUrl,
    s3Key: upload.s3Key,
    publicId: upload.publicId,
  };
}

function serializeTheme(builder: ThemeBuilderState) {
  return [
    `Elevator Pitch: ${builder.pitch}`,
    '',
    'WORLD-BUILDING AND LORE',
    `Setting and time period: ${builder.setting || 'Unset'}`,
    `Physical locations: ${builder.locations || 'Unset'}`,
    `Atmospheric vibe: ${builder.atmosphere || 'Unset'}`,
    '',
    'CHARACTER ROSTER',
    ...builder.characters.flatMap((character, index) => [
      `Character ${index + 1}: ${character.name || 'Unnamed'}`,
      `- Handle: ${normalizeHandle(character.handle, character.name) || 'Unset'}`,
      `- Role: ${character.role || 'Unset'}`,
      `- Core motivations: ${character.motivations || 'Unset'}`,
      `- Behavioral quirks: ${character.quirks || 'Unset'}`,
      `- Base visual prompt: ${character.visualPrompt || 'Unset'}`,
      `- Saved visual variants: ${character.gallery.length}`,
    ]),
    '',
    THEME_BUILDER_MARKER,
    '```json',
    JSON.stringify(builderSnapshotForStorage(builder)),
    '```',
    '',
    'CORE RULES / BOUNDARIES',
    builder.rules || 'No strict boundaries set.',
    '',
    'TONE OF VOICE AND STYLE',
    `Formal vs Casual: ${builder.formal}/100 formal`,
    `Humorous vs Serious: ${builder.humorous}/100 humorous`,
    `Formatting directives: ${builder.formatting || 'Unset'}`,
    `Do not use: ${builder.negatives.join(', ') || 'None'}`,
    '',
    'GLOBAL IMAGE AND ASSET REFERENCES',
    ...builder.assets.map((asset, index) => `Asset ${index + 1}: ${asset.name || asset.file?.name || 'Untitled'} (${asset.tag || 'untagged'})`),
    '',
    'PERMISSIONS AND MARKETPLACE',
    `Scope: ${builder.scope === 'public' ? 'Public Theme Library' : 'Private Workspace'}`,
    `Attribution: ${builder.attribution || 'Not specified'}`,
    `Usage tracking: ${builder.usageTracking ? 'Enabled' : 'Disabled'}`,
  ].join('\n');
}

function themeDraftForStorage(builder: ThemeBuilderState): ThemeBuilderState {
  const normalized = normalizeThemeBuilder(builder);
  return {
    ...normalized,
    characters: normalized.characters.map((character) => ({
      ...character,
      gallery: character.gallery.slice(0, MAX_LOCKED_CHARACTER_REFERENCE_IMAGES),
    })),
    assets: normalized.assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      tag: asset.tag,
    })),
  };
}

function builderSnapshotForStorage(builder: ThemeBuilderState): ThemeBuilderState {
  return themeDraftForStorage(builder);
}

function extractJsonBlock<T>(source: string, marker: string): T | null {
  const match = source.match(new RegExp(`${marker}\\s*\`\`\`json\\s*([\\s\\S]*?)\`\`\``));
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]) as T;
  } catch {
    return null;
  }
}

function matchLine(source: string, pattern: RegExp) {
  return source.match(pattern)?.[1]?.trim() ?? '';
}

function themeToBuilder(theme: ContentTheme): ThemeBuilderState {
  const source = theme.defaultStoryPrompt ?? '';
  const snapshot = extractJsonBlock<ThemeBuilderState>(source, THEME_BUILDER_MARKER);
  if (snapshot) {
    return normalizeThemeBuilder({
      ...emptyThemeBuilder(),
      ...snapshot,
      name: snapshot.name || theme.title,
      tags: snapshot.tags?.length ? snapshot.tags : theme.defaultGenre?.split(',').map((tag) => tag.trim()).filter(Boolean) ?? [],
      attribution: snapshot.attribution || theme.authorName,
    });
  }

  const characterLibrary = extractJsonBlock<{ characters?: ThemeCharacter[] }>(source, CHARACTER_LIBRARY_MARKER);
  const characters = characterLibrary?.characters?.length ? characterLibrary.characters.map(normalizeCharacter) : [emptyThemeCharacter()];
  return normalizeThemeBuilder({
    ...emptyThemeBuilder(),
    name: theme.title,
    pitch: matchLine(source, /^Elevator Pitch:\s*(.*)$/m),
    tags: theme.defaultGenre?.split(',').map((tag) => tag.trim()).filter(Boolean) ?? [],
    setting: matchLine(source, /^Setting and time period:\s*(.*)$/m).replace(/^Unset$/, ''),
    locations: matchLine(source, /^Physical locations:\s*(.*)$/m).replace(/^Unset$/, ''),
    atmosphere: matchLine(source, /^Atmospheric vibe:\s*(.*)$/m).replace(/^Unset$/, ''),
    characters,
    rules: source.match(/CORE RULES \/ BOUNDARIES\n([\s\S]*?)\n\nTONE OF VOICE AND STYLE/)?.[1]?.trim().replace(/^No strict boundaries set\.$/, '') ?? '',
    formal: Number(matchLine(source, /^Formal vs Casual:\s*(\d+)\/100 formal$/m)) || 55,
    humorous: Number(matchLine(source, /^Humorous vs Serious:\s*(\d+)\/100 humorous$/m)) || 35,
    formatting: matchLine(source, /^Formatting directives:\s*(.*)$/m).replace(/^Unset$/, ''),
    negatives: matchLine(source, /^Do not use:\s*(.*)$/m).split(',').map((item) => item.trim()).filter((item) => item && item !== 'None'),
    scope: source.includes('Scope: Public Theme Library') ? 'public' : 'private',
    attribution: theme.authorName,
    usageTracking: !source.includes('Usage tracking: Disabled'),
  });
}

function Panel({
  title,
  kicker,
  icon: Icon,
  children,
}: {
  title: string;
  kicker: string;
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-tea-green)]/45">
          <Icon size={18} className="text-[var(--color-ash-brown)]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-dark">{title}</h2>
          <p className="mt-0.5 text-xs text-muted">{kicker}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function TokenInput({
  value,
  tokens,
  placeholder,
  onValueChange,
  onTokensChange,
}: {
  value: string;
  tokens: string[];
  placeholder: string;
  onValueChange: (value: string) => void;
  onTokensChange: (tokens: string[]) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {tokens.map((token) => (
          <button
            key={token}
            type="button"
            onClick={() => onTokensChange(tokens.filter((item) => item !== token))}
            className="rounded-full bg-[var(--color-tea-green)]/45 px-2.5 py-1 text-[11px] font-medium text-[var(--color-ash-brown)]"
          >
            {token}
          </button>
        ))}
      </div>
      <input
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            onTokensChange(addToken(value.replace(',', ''), tokens));
            onValueChange('');
          }
        }}
        className="w-full bg-transparent text-sm text-dark outline-none placeholder:text-light-muted"
        placeholder={placeholder}
      />
    </div>
  );
}

function ThemeCard({ builder, theme, onEdit }: { builder?: ThemeBuilderState; theme?: ContentTheme; onEdit?: (theme: ContentTheme) => void }) {
  const themeBuilder = theme ? themeToBuilder(theme) : undefined;
  const title = builder?.name || theme?.title || 'Theme Name';
  const pitch = builder?.pitch || themeBuilder?.pitch || theme?.defaultStoryPrompt || 'A concise marketplace pitch will appear here.';
  const tags = builder?.tags.length ? builder.tags : themeBuilder?.tags.length ? themeBuilder.tags : theme?.defaultGenre ? theme.defaultGenre.split(',').map((tag) => tag.trim()) : ['Educational', 'Corporate'];
  const isPublic = builder ? builder.scope === 'public' : themeBuilder ? themeBuilder.scope === 'public' : true;
  const attribution = builder?.attribution || themeBuilder?.attribution || theme?.authorName || 'Theme Author';

  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-tea-green)]/45">
          <Palette size={22} className="text-[var(--color-ash-brown)]" />
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isPublic ? 'bg-[var(--color-muted-olive)]/20 text-[var(--color-ash-brown)]' : 'bg-white text-muted border border-border'}`}>
          {isPublic ? 'Public Library' : 'Private'}
        </span>
      </div>
      <h3 className="text-base font-semibold text-dark">{title}</h3>
      <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted">{pitch}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {tags.slice(0, 5).map((tag) => (
          <span key={tag} className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-muted">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-border p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted">Author</p>
          <p className="mt-1 font-semibold text-dark">{attribution}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted">Usage</p>
          <p className="mt-1 font-semibold text-dark">{(builder ?? themeBuilder)?.usageTracking === false ? 'Untracked' : 'Tracked'}</p>
        </div>
      </div>
      {theme && onEdit && (
        <button
          type="button"
          onClick={() => onEdit(theme)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-muted-olive)] px-3 py-2 text-xs font-semibold text-[var(--color-ash-brown)] hover:bg-[var(--color-tea-green)]/20"
        >
          <PencilLine size={14} /> Edit theme
        </button>
      )}
    </article>
  );
}

export function ThemeLibraryView({ themes }: { themes: ContentTheme[] }) {
  return (
    <div className="space-y-5">
      <Panel title="Theme Library Marketplace View" kicker="Profile cards for public themes after deployment." icon={Store}>
        {themes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white px-5 py-8 text-center">
            <Store size={26} className="mx-auto text-[var(--color-ash-brown)]" />
            <p className="mt-3 text-sm font-semibold text-dark">No marketplace themes yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">Create a theme, choose Public / Theme Library, and its card profile will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {themes.map((theme) => (
              <ThemeCard key={theme._id} theme={theme} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

export function ContentThemes({ themes }: { themes: ContentTheme[] }) {
  const qc = useQueryClient();
  const [builder, setBuilder] = useState<ThemeBuilderState>(() => emptyThemeBuilder());
  const [editingThemeId, setEditingThemeId] = useState('');
  const [characterImageModel, setCharacterImageModel] = useState('');
  const [characterTtsAudioModel, setCharacterTtsAudioModel] = useState('');
  const { data: aiModels = EMPTY_AI_MODELS } = useQuery({
    queryKey: ['content', 'ai-provider-capabilities'],
    queryFn: listAvailableAiModels,
  });
  const canSaveTheme = Boolean(
    builder.name.trim() &&
    builder.pitch.trim() &&
    builder.setting.trim() &&
    builder.locations.trim() &&
    builder.atmosphere.trim(),
  );

  const saveThemeMut = useMutation({
    mutationFn: async () => {
      const missingWorldFields = [
        !builder.setting.trim() ? 'setting and time period' : '',
        !builder.locations.trim() ? 'physical locations' : '',
        !builder.atmosphere.trim() ? 'atmospheric vibe' : '',
      ].filter(Boolean);
      if (missingWorldFields.length) {
        throw new Error(`Complete the World-Building & Lore fields: ${missingWorldFields.join(', ')}.`);
      }
      const payload = {
        title: builder.name.trim(),
        slug: slugify(builder.name),
        authorName: builder.attribution.trim() || 'LedgerNode Creator',
        defaultGenre: builder.tags.join(', '),
        defaultStoryPrompt: serializeTheme(builder),
      };
      const theme = editingThemeId ? await updateTheme(editingThemeId, payload) : await createTheme(payload);
      const files = builder.assets.map((asset) => asset.file).filter((file): file is File => Boolean(file));
      if (files.length) await uploadThemeReferences(theme._id, files);
      return theme;
    },
    onSuccess: () => {
      toast.success(editingThemeId ? 'Theme updated.' : 'Theme saved.');
      setBuilder(emptyThemeBuilder());
      setEditingThemeId('');
      setCharacterImageModel('');
      setCharacterTtsAudioModel('');
      qc.invalidateQueries({ queryKey: ['content', 'themes'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : editingThemeId ? 'Could not update theme.' : 'Could not save theme. Check the theme name or try again.'),
  });

  const generateCharacterImageMut = useMutation({
    mutationFn: async ({ characterId }: { characterId: string }) => {
      const character = builder.characters.find((item) => item.id === characterId);
      if (!character) throw new Error('Character not found.');
      if (!characterImageModel) throw new Error('No image model available.');
      if (!canSaveTheme) {
        throw new Error('Complete theme name, pitch, setting, locations, and atmosphere before generating character images.');
      }
      const handle = normalizeHandle(character.handle, character.name);
      const prompt = buildThemeCharacterImagePrompt({
        character,
        theme: builder,
        handle,
      });
      const result = await generateCharacterImageRequest({ prompt, model: characterImageModel });
      return { characterId, prompt, image: uploadToCharacterImage(result.image, prompt, `${handle || character.name || 'Character'} variant`) };
    },
    onSuccess: ({ characterId, image }) => {
      setBuilder((current) => ({
        ...current,
        characters: current.characters.map((character) => (character.id === characterId ? { ...character, preview: image } : character)),
      }));
      toast.success('Character image generated.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not generate character image.'),
  });

  const updateCharacter = (id: string, key: keyof Omit<ThemeCharacter, 'id'>, value: string) => {
    setBuilder((current) => ({
      ...current,
      characters: current.characters.map((character) => {
        if (character.id !== id) return character;
        if (key === 'ttsPitchPercent') {
          return { ...character, ttsPitchPercent: normalizePitchPercent(value) };
        }
        return { ...character, [key]: value };
      }),
    }));
  };

  const updateAsset = (id: string, key: keyof Omit<ThemeAsset, 'id' | 'file'>, value: string) => {
    setBuilder((current) => ({
      ...current,
      assets: current.assets.map((asset) => (asset.id === id ? { ...asset, [key]: value } : asset)),
    }));
  };

  useEffect(() => {
    const nextAudio = aiModels.audio.some((model) => model.value === 'free:auto')
      ? 'free:auto'
      : aiModels.audio[0]?.value ?? 'free:auto';
    if (characterTtsAudioModel !== nextAudio) setCharacterTtsAudioModel(nextAudio);
    const nextImage = aiModels.image.some((model) => model.value === 'free:auto')
      ? 'free:auto'
      : aiModels.image[0]?.value ?? 'free:auto';
    if (characterImageModel !== nextImage) setCharacterImageModel(nextImage);
  }, [aiModels.audio, aiModels.image, characterImageModel, characterTtsAudioModel]);

  const previewCharacterTtsMut = useMutation({
    mutationFn: async ({ characterId }: { characterId: string }) => {
      const character = builder.characters.find((item) => item.id === characterId);
      const index = builder.characters.findIndex((item) => item.id === characterId);
      if (!character || index < 0) throw new Error('Character not found.');
      if (!characterTtsAudioModel) throw new Error('No TTS model available.');
      const profile = themeCharacterTtsProfile(character, index, '');
      const text = character.ttsTestPhrase?.trim() || `Hi, I'm ${character.name.trim() || 'this character'}. This is how I sound.`;
      if (!profile.voiceProfile.trim()) {
        throw new Error('Set a voice for this character first ΓÇö pick from the ElevenLabs or Google voice catalog.');
      }
      return generateEpisodeTts({
        text,
        model: characterTtsAudioModel,
        voiceProfile: profile.voiceProfile,
        tonePreset: profile.tone.preset,
        toneDirection: profile.tone.direction,
        tonePace: profile.tone.pace,
        tonePitch: profile.tone.pitch,
      });
    },
    onSuccess: (result) => {
      const audioUrl = studioStreamMediaUrl(result.audio.cloudinaryUrl, result.audio.s3Url);
      if (!audioUrl) {
        toast.error('TTS generated but no playable audio URL was returned.');
        return;
      }
      void playEpisodeAudio(audioUrl).catch(() => toast.error('Preview generated, but browser playback was blocked.'));
      toast.success('Character voice preview ready.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not preview character voice.'),
  });

  const saveDraftMut = useMutation({
    mutationFn: () => saveContentStudioDraft('theme', themeDraftForStorage(builder) as unknown as Record<string, unknown>),
    onSuccess: () => toast.success('Theme draft saved to your workspace.'),
    onError: () => toast.error('Could not save theme draft.'),
  });

  function handleSaveThemeDraft() {
    saveDraftMut.mutate();
  }

  function canGenerateThemeCharacterImage(character: ThemeCharacter): boolean {
    return Boolean(canSaveTheme && character.visualPrompt.trim());
  }

  function handleSaveCharacterPreview(characterId: string) {
    const target = builder.characters.find((character) => character.id === characterId);
    if (!target?.preview) return;
    if (target.gallery.length >= MAX_LOCKED_CHARACTER_REFERENCE_IMAGES) {
      toast.error(`Each character keeps ${MAX_LOCKED_CHARACTER_REFERENCE_IMAGES} locked reference images. Remove a variant before adding another.`);
      return;
    }
    setBuilder((current) => ({
      ...current,
      characters: current.characters.map((character) => {
        if (character.id !== characterId || !character.preview) return character;
        return {
          ...character,
          gallery: [...character.gallery, { ...character.preview, id: crypto.randomUUID() }].slice(0, MAX_LOCKED_CHARACTER_REFERENCE_IMAGES),
        };
      }),
    }));
    toast.success('Character variant saved to Theme Asset Library.');
  }

  function handleEditTheme(theme: ContentTheme) {
    setBuilder(themeToBuilder(theme));
    setEditingThemeId(theme._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('Theme loaded for editing.');
  }

  function handleNewTheme() {
    setBuilder(emptyThemeBuilder());
    setEditingThemeId('');
    setCharacterImageModel('');
    setCharacterTtsAudioModel('');
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-tea-green)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-faded-copper)]">
              <BookOpen size={12} /> Theme Creation and Management
            </div>
            <h1 className="text-2xl font-semibold text-dark">Categorized Theme Builder</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
              {editingThemeId
                ? 'Edit the saved show bible, update character references, and keep modules linked to the latest theme definition.'
                : 'Build the show bible in structured sections, preview its marketplace profile, then return to Modules and link it during module creation.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {editingThemeId && (
              <button
                type="button"
                onClick={handleNewTheme}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-dark hover:border-[var(--color-muted-olive)]"
              >
                <BookOpen size={16} /> New theme
              </button>
            )}
            <button
              type="button"
              onClick={() => saveThemeMut.mutate()}
              disabled={saveThemeMut.isPending || !canSaveTheme}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-5 py-2.5 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-40"
            >
              <UploadCloud size={16} /> {saveThemeMut.isPending ? 'Saving...' : editingThemeId ? 'Update theme' : 'Save theme'}
            </button>
            <button
              type="button"
              onClick={handleSaveThemeDraft}
              disabled={saveDraftMut.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-muted-olive)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ash-brown)] disabled:opacity-45"
            >
              <BookOpen size={16} /> {saveDraftMut.isPending ? 'Saving...' : 'Save draft'}
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_22rem]">
        <main className="space-y-5">
          <Panel title="1. Theme Identity & Marketplace Metadata" kicker="Define what this theme is and how other authors can find it." icon={Tag}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted">Theme Name</label>
                <input className="input-field mt-1 text-sm" value={builder.name} onChange={(e) => setBuilder((current) => ({ ...current, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Marketplace Tags</label>
                <TokenInput
                  value={builder.tagInput}
                  tokens={builder.tags}
                  placeholder="Educational, Corporate, African Mythology..."
                  onValueChange={(tagInput) => setBuilder((current) => ({ ...current, tagInput }))}
                  onTokensChange={(tags) => setBuilder((current) => ({ ...current, tags }))}
                />
              </div>
              <div className="lg:col-span-2">
                <label className="text-xs font-medium text-muted">Elevator Pitch</label>
                <textarea className="input-field mt-1 min-h-[96px] text-sm" value={builder.pitch} onChange={(e) => setBuilder((current) => ({ ...current, pitch: e.target.value }))} />
              </div>
            </div>
          </Panel>

          <Panel title="2. World-Building & Lore" kicker="The consistency engine for setting, characters, and unbreakable rules." icon={Globe2}>
            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-muted">Setting and Time Period <span className="text-[var(--color-faded-copper)]">*</span></label>
                <textarea
                  className="input-field mt-1 min-h-[120px] text-sm"
                  value={builder.setting}
                  onChange={(e) => setBuilder((current) => ({ ...current, setting: e.target.value }))}
                  placeholder="Example: Modern-day Nigeria, 2026, civic media satire with realistic institutions."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Physical Locations <span className="text-[var(--color-faded-copper)]">*</span></label>
                <textarea
                  className="input-field mt-1 min-h-[120px] text-sm"
                  value={builder.locations}
                  onChange={(e) => setBuilder((current) => ({ ...current, locations: e.target.value }))}
                  placeholder="Example: government offices, Lagos streets, homes, press rooms, campaign venues."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Atmospheric Vibe <span className="text-[var(--color-faded-copper)]">*</span></label>
                <textarea
                  className="input-field mt-1 min-h-[120px] text-sm"
                  value={builder.atmosphere}
                  onChange={(e) => setBuilder((current) => ({ ...current, atmosphere: e.target.value }))}
                  placeholder="Example: optimistic, grounded, story-driven, visually warm, documentary-inspired."
                />
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-dark">Character Roster</p>
                <button
                  type="button"
                  onClick={() => setBuilder((current) => ({ ...current, characters: [...current.characters, emptyThemeCharacter()] }))}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-dark hover:border-[var(--color-muted-olive)]"
                >
                  <UserRound size={13} /> Add character
                </button>
              </div>
              {builder.characters.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
                  No characters yet. Use Add character when you are ready.
                </p>
              ) : null}
              {builder.characters.map((character, index) => (
                <div key={character.id} className="rounded-xl border border-border bg-white p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Character Factory {index + 1}</p>
                      <p className="mt-1 text-xs text-muted">Locked look: 1–3 reference stills plus Role, Motivations, Quirks, and Base visual prompt. Scene generation never writes back here — update the look only with an explicit edit.</p>
                    </div>
                    <span className="rounded-full bg-[var(--color-tea-green)]/40 px-2.5 py-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">
                      {Math.min(character.gallery.length, MAX_LOCKED_CHARACTER_REFERENCE_IMAGES)} / {MAX_LOCKED_CHARACTER_REFERENCE_IMAGES} locked stills
                    </span>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-[1fr_18rem]">
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <input className="input-field text-sm" value={character.name} onChange={(e) => updateCharacter(character.id, 'name', e.target.value)} placeholder="Character name" />
                        <input
                          className="input-field text-sm"
                          value={character.handle}
                          onChange={(e) => updateCharacter(character.id, 'handle', e.target.value)}
                          onBlur={() => updateCharacter(character.id, 'handle', normalizeHandle(character.handle, character.name))}
                          placeholder="@CharacterHandle"
                        />
                        <input className="input-field text-sm" value={character.role} onChange={(e) => updateCharacter(character.id, 'role', e.target.value)} placeholder="Role" />
                        <input className="input-field text-sm" value={character.motivations} onChange={(e) => updateCharacter(character.id, 'motivations', e.target.value)} placeholder="Core motivations" />
                      </div>
                      <input className="input-field text-sm" value={character.quirks} onChange={(e) => updateCharacter(character.id, 'quirks', e.target.value)} placeholder="Behavioral quirks" />
                      <textarea className="input-field min-h-[105px] text-sm" value={character.visualPrompt} onChange={(e) => updateCharacter(character.id, 'visualPrompt', e.target.value)} placeholder="Base visual prompt defining appearance, wardrobe, face, posture, art direction, and consistency cues." />
                      <ThemeCharacterTtsPreview
                        character={character}
                        characterIndex={index}
                        audioModels={aiModels.audio}
                        audioModel={characterTtsAudioModel}
                        onAudioModelChange={setCharacterTtsAudioModel}
                        onUpdateCharacter={updateCharacter}
                        onPreview={(characterId) => previewCharacterTtsMut.mutate({ characterId })}
                        previewPending={previewCharacterTtsMut.isPending && previewCharacterTtsMut.variables?.characterId === character.id}
                      />
                      <div className="grid gap-2">
                        <p className="text-[11px] text-muted">Character image model is routed automatically.</p>
                        <button
                          type="button"
                          onClick={() => generateCharacterImageMut.mutate({ characterId: character.id })}
                          disabled={!canGenerateThemeCharacterImage(character) || generateCharacterImageMut.isPending}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-muted-olive)] px-4 py-2 text-sm font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45"
                        >
                          {generateCharacterImageMut.isPending && generateCharacterImageMut.variables?.characterId === character.id ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                          Generate Character Image
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="aspect-square overflow-hidden rounded-xl border border-border bg-[var(--color-muted-olive)]">
                        {generateCharacterImageMut.isPending && generateCharacterImageMut.variables?.characterId === character.id ? (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(135deg,#adc178,#a98467)] p-5 text-center">
                            <Loader2 size={30} className="animate-spin text-[var(--color-vanilla-cream)]" />
                            <p className="mt-3 text-xs font-semibold text-[var(--color-vanilla-cream)]">Generating character reference...</p>
                          </div>
                        ) : character.preview?.url ? (
                          <ProtectedStudioImage
                            originUrl={character.preview.url}
                            alt={`${character.name || 'Character'} preview`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(135deg,#adc178,#a98467)] p-5 text-center">
                            <Images size={34} className="text-[var(--color-vanilla-cream)]" />
                            <p className="mt-3 text-xs font-semibold text-[var(--color-vanilla-cream)]">Generated preview appears here.</p>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => generateCharacterImageMut.mutate({ characterId: character.id })}
                          disabled={!canGenerateThemeCharacterImage(character) || generateCharacterImageMut.isPending}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-dark disabled:opacity-45"
                        >
                          <RefreshCcw size={14} /> Regenerate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveCharacterPreview(character.id)}
                          disabled={!character.preview?.url}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-ash-brown)] px-3 py-2 text-xs font-semibold text-[var(--color-vanilla-cream)] disabled:opacity-45"
                        >
                          <Save size={14} /> Save Variant
                        </button>
                      </div>
                    </div>
                  </div>
                  {character.gallery.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-semibold text-dark">Theme Asset Library: {normalizeHandle(character.handle, character.name) || character.name || 'Character'}</p>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {character.gallery.map((image, variantIndex) => (
                          <div key={image.id} className="overflow-hidden rounded-xl border border-border bg-white">
                            <div className="aspect-square bg-[var(--color-tea-green)]/30">
                              <ProtectedStudioImage
                                originUrl={image.url}
                                alt={image.label}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <p className="truncate px-2 py-2 text-[10px] font-semibold text-muted">Variant {variantIndex + 1}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <textarea className="input-field mt-5 min-h-[110px] text-sm" value={builder.rules} onChange={(e) => setBuilder((current) => ({ ...current, rules: e.target.value }))} placeholder="Core rules / boundaries the AI must never break" />
          </Panel>

          <Panel title="3. Tone of Voice & Stylistic Guidelines" kicker="Define personality, formatting rules, and banned language." icon={SlidersHorizontal}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <label className="flex items-center justify-between text-xs font-medium text-muted">Formal vs Casual <span>{builder.formal}% formal</span></label>
                <input type="range" min={0} max={100} value={builder.formal} onChange={(e) => setBuilder((current) => ({ ...current, formal: Number(e.target.value) }))} className="mt-3 w-full accent-[var(--color-muted-olive)]" />
              </div>
              <div className="rounded-xl border border-border p-4">
                <label className="flex items-center justify-between text-xs font-medium text-muted">Humorous vs Serious <span>{builder.humorous}% humorous</span></label>
                <input type="range" min={0} max={100} value={builder.humorous} onChange={(e) => setBuilder((current) => ({ ...current, humorous: Number(e.target.value) }))} className="mt-3 w-full accent-[var(--color-muted-olive)]" />
              </div>
              <textarea className="input-field min-h-[96px] text-sm lg:col-span-2" value={builder.formatting} onChange={(e) => setBuilder((current) => ({ ...current, formatting: e.target.value }))} placeholder="Formatting directives" />
              <div className="lg:col-span-2">
                <label className="mb-1 flex items-center gap-2 text-xs font-medium text-muted"><Ban size={13} /> Negative Prompting: Do Not Use</label>
                <TokenInput
                  value={builder.negativeInput}
                  tokens={builder.negatives}
                  placeholder="Banned words, phrases, cliches..."
                  onValueChange={(negativeInput) => setBuilder((current) => ({ ...current, negativeInput }))}
                  onTokensChange={(negatives) => setBuilder((current) => ({ ...current, negatives }))}
                />
              </div>
            </div>
          </Panel>

          <Panel title="4. Global Image & Asset References" kicker="Upload foundational references and label what each image represents." icon={ImageIcon}>
            <label className="block cursor-pointer rounded-xl border border-dashed border-[var(--color-tea-green)] bg-white p-6 text-center">
              <UploadCloud size={28} className="mx-auto text-[var(--color-ash-brown)]" />
              <p className="mt-3 text-sm font-semibold text-dark">Drop mood boards, character sheets, or foundational references</p>
              <p className="mt-1 text-xs text-muted">Files upload when the theme is saved.</p>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  setBuilder((current) => ({
                    ...current,
                    assets: [...current.assets, ...files.map((file) => ({ id: crypto.randomUUID(), file, name: file.name, tag: '' }))],
                  }));
                  e.target.value = '';
                }}
              />
            </label>
            {builder.assets.length > 0 && (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {builder.assets.map((asset) => (
                  <div key={asset.id} className="rounded-xl border border-border bg-white p-3">
                    <p className="truncate text-xs font-semibold text-dark">{asset.file?.name ?? asset.name}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <input className="input-field text-xs" value={asset.name} onChange={(e) => updateAsset(asset.id, 'name', e.target.value)} placeholder="Asset name" />
                      <input className="input-field text-xs" value={asset.tag} onChange={(e) => updateAsset(asset.id, 'tag', e.target.value)} placeholder="Asset tag" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="5. Permissions & Marketplace Deployment" kicker="Choose whether the theme stays private or becomes browseable in the Theme Library." icon={Shield}>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className={`rounded-xl border p-4 ${builder.scope === 'private' ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/25' : 'border-border bg-white'}`}>
                <input type="radio" name="theme-scope" checked={builder.scope === 'private'} onChange={() => setBuilder((current) => ({ ...current, scope: 'private' }))} />
                <span className="ml-2 inline-flex items-center gap-2 text-sm font-semibold text-dark"><Lock size={15} /> Private Workspace</span>
                <span className="mt-2 block text-xs leading-relaxed text-muted">Only the author can use this theme.</span>
              </label>
              <label className={`rounded-xl border p-4 ${builder.scope === 'public' ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/25' : 'border-border bg-white'}`}>
                <input type="radio" name="theme-scope" checked={builder.scope === 'public'} onChange={() => setBuilder((current) => ({ ...current, scope: 'public' }))} />
                <span className="ml-2 inline-flex items-center gap-2 text-sm font-semibold text-dark"><Store size={15} /> Public / Theme Library</span>
                <span className="mt-2 block text-xs leading-relaxed text-muted">Publish this theme profile for other creators to import and use.</span>
              </label>
              {builder.scope === 'public' && (
                <>
                  <input className="input-field text-sm" value={builder.attribution} onChange={(e) => setBuilder((current) => ({ ...current, attribution: e.target.value }))} placeholder="Author attribution" />
                  <label className="flex items-center gap-3 rounded-xl border border-border p-4 text-sm font-semibold text-dark">
                    <input type="checkbox" checked={builder.usageTracking} onChange={(e) => setBuilder((current) => ({ ...current, usageTracking: e.target.checked }))} />
                    <DollarSign size={15} className="text-[var(--color-ash-brown)]" /> Enable attribution and usage tracking
                  </label>
                </>
              )}
            </div>
          </Panel>
        </main>

        <aside className="space-y-5">
          <Panel title="Marketplace Profile Preview" kicker="How this theme appears to other authors." icon={Eye}>
            <ThemeCard builder={builder} />
          </Panel>
          <Panel title="Saved Theme Profiles" kicker="Completed themes available for module linking." icon={Library}>
            {themes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-white px-5 py-8 text-center">
                <Palette size={26} className="mx-auto text-[var(--color-ash-brown)]" />
                <p className="mt-3 text-sm font-semibold text-dark">No themes yet</p>
                <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">Save a categorized theme to make it available during module creation.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {themes.map((theme) => (
                  <ThemeCard key={theme._id} theme={theme} onEdit={handleEditTheme} />
                ))}
              </div>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
