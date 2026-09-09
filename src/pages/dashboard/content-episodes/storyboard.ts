import type { ContentEpisodeScene, ContentTheme } from '@/api/content';

export type ThemeCharacterReference = {
  id: string;
  characterId: string;
  handle: string;
  name: string;
  label: string;
  url: string;
  s3Url?: string;
  s3Key?: string;
  publicId?: string;
  prompt?: string;
};

export type ThemeCharacterMention = {
  id: string;
  handle: string;
  name: string;
};

export type EpisodeLoraTune = {
  id: string;
  label: string;
  category: string;
  weight: number;
};

export type EpisodeSceneCard = {
  id: string;
  sceneNumber: number;
  startSec: number;
  endSec: number;
  voiceOver: string;
  visualPrompt: string;
  characterHandles: string[];
  approved: boolean;
  ttsStatus: 'idle' | 'generating' | 'ready';
  ttsAudioUrl?: string;
  ttsLabel?: string;
  audioSegmentUrl?: string;
  voiceProfile?: string;
  ttsLines?: Array<{
    id: string;
    speaker?: string;
    text: string;
    voiceProfile?: string;
    tonePreset?: string;
    toneDirection?: string;
    tonePace?: string;
    tonePitch?: number | string;
    status?: 'idle' | 'generating' | 'ready';
    audioUrl?: string;
    label?: string;
  }>;
  selectedCharacterRefIds?: string[];
  catalogStatus?: ContentEpisodeScene['status'];
  sceneVideoStatus?: 'idle' | 'generating' | 'pending_approval' | 'ready' | 'failed';
  sceneVideoUrl?: string;
  sceneVideoTakeId?: string;
  episodeSceneDocId?: string;
  sceneVideoAudioEnabled?: boolean;
  chapterIndex?: number;
  chapterTitle?: string;
  generationStartedAt?: string;
  updatedAt?: string;
  lastFrameUrl?: string;
};

const CHARACTER_LIBRARY_MARKER = 'CHARACTER_REFERENCE_LIBRARY_JSON';
const THEME_BUILDER_MARKER = 'THEME_BUILDER_JSON';

export const VOICE_PROFILE_OPTIONS = [
  { value: 'lagos-warm-female', label: 'Lagos Warm Female' },
  { value: 'lagos-calm-male', label: 'Lagos Calm Male' },
  { value: 'west-african-documentary', label: 'West African Documentary' },
  { value: 'neutral-global-female', label: 'Neutral Global Female' },
  { value: 'youthful-storyteller', label: 'Youthful Storyteller' },
];

export function voiceProfileLabel(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return 'No voice set';
  const preset = VOICE_PROFILE_OPTIONS.find((option) => option.value === trimmed);
  if (preset) return preset.label;
  if (trimmed.startsWith('google:')) {
    const parts = trimmed.slice('google:'.length).split(':');
    if (parts.length >= 2) return parts.slice(1).join(':');
    return trimmed.slice('google:'.length);
  }
  if (trimmed.startsWith('elevenlabs:')) {
    const voiceId = trimmed.slice('elevenlabs:'.length);
    return voiceId.length > 24 ? `${voiceId.slice(0, 21)}ΓÇª` : voiceId;
  }
  return trimmed.length > 28 ? `${trimmed.slice(0, 25)}ΓÇª` : trimmed;
}

export function resolveSceneVoiceProfile(scene: Pick<EpisodeSceneCard, 'voiceProfile'>, fallback: string) {
  return scene.voiceProfile?.trim() || fallback;
}

export const LORA_LIBRARY: Array<Omit<EpisodeLoraTune, 'weight'> & { description: string; defaultWeight: number }> = [
  {
    id: 'nollywood-cinematic-35mm',
    label: 'Nollywood Cinematic 35mm',
    category: 'Style',
    description: 'Warm dramatic lighting, expressive blocking, cinematic Nigerian film texture.',
    defaultWeight: 0.7,
  },
  {
    id: 'lagos-streets-architecture',
    label: 'Lagos Streets',
    category: 'Environment',
    description: 'Urban Lagos roads, storefronts, traffic rhythm, market color, concrete and signage detail.',
    defaultWeight: 0.62,
  },
  {
    id: 'afrofuturist-editorial',
    label: 'Afrofuturist Editorial',
    category: 'Style',
    description: 'Sleek speculative African visual language with polished editorial contrast.',
    defaultWeight: 0.58,
  },
  {
    id: 'documentary-natural-light',
    label: 'Documentary Natural Light',
    category: 'Camera',
    description: 'Handheld realism, natural skin tones, practical light, observational pacing.',
    defaultWeight: 0.5,
  },
  {
    id: 'animated-storybook-texture',
    label: 'Animated Storybook Texture',
    category: 'Style',
    description: 'Painterly illustrated finish for fables, youth stories, and mythic explainers.',
    defaultWeight: 0.56,
  },
];

function themeCharacterJson(theme?: ContentTheme) {
  const source = theme?.defaultStoryPrompt ?? '';
  const builderMatch = source.match(new RegExp(`${THEME_BUILDER_MARKER}\\s*\`\`\`json\\s*([\\s\\S]*?)\`\`\``));
  const libraryMatch = source.match(new RegExp(`${CHARACTER_LIBRARY_MARKER}\\s*\`\`\`json\\s*([\\s\\S]*?)\`\`\``));
  return builderMatch?.[1] || libraryMatch?.[1] || '';
}

export function handleForCharacter(character: { handle?: string; name?: string }, index: number) {
  const fromHandle = character.handle?.trim();
  if (fromHandle) return fromHandle.startsWith('@') ? fromHandle : `@${fromHandle}`;
  const fromName = character.name?.trim().replace(/\s+/g, '').replace(/[^\w-]/g, '');
  return fromName ? `@${fromName}` : `@Character${index + 1}`;
}

export function parseThemeCharacterReferences(theme?: ContentTheme): ThemeCharacterReference[] {
  const jsonSource = themeCharacterJson(theme);
  if (!jsonSource) return [];

  try {
    const parsed = JSON.parse(jsonSource) as {
      characters?: Array<{
        id?: string;
        name?: string;
        handle?: string;
        gallery?: Array<{ id?: string; url?: string; label?: string; prompt?: string; s3Url?: string; s3Key?: string; publicId?: string }>;
      }>;
    };

    return (parsed.characters ?? []).flatMap((character, characterIndex) => {
      const handle = handleForCharacter(character, characterIndex);
      return (character.gallery ?? [])
        .map((image) => ({
          ...image,
          url: image.url?.trim() || image.s3Url?.trim() || '',
        }))
        .filter((image) => Boolean(image.url))
        .map((image, imageIndex) => ({
          id: `${character.id || characterIndex}:${image.id || imageIndex}`,
          characterId: character.id || `${characterIndex}`,
          handle,
          name: character.name || handle,
          label: image.label || `${handle} variant ${imageIndex + 1}`,
          url: image.url,
          s3Url: image.s3Url,
          s3Key: image.s3Key,
          publicId: image.publicId,
          prompt: image.prompt,
        }));
    });
  } catch {
    return [];
  }
}

export function parseThemeCharacterMentions(theme?: ContentTheme): ThemeCharacterMention[] {
  const jsonSource = themeCharacterJson(theme);
  if (!jsonSource) return [];

  try {
    const parsed = JSON.parse(jsonSource) as {
      characters?: Array<{ id?: string; name?: string; handle?: string }>;
    };
    const byHandle = new Map<string, ThemeCharacterMention>();
    (parsed.characters ?? []).forEach((character, index) => {
      const handle = handleForCharacter(character, index);
      if (!byHandle.has(handle)) {
        byHandle.set(handle, {
          id: character.id || `${index}`,
          handle,
          name: character.name?.trim() || handle,
        });
      }
    });
    return Array.from(byHandle.values());
  } catch {
    return [];
  }
}

export function themeCharacterJsonSource(theme?: ContentTheme): string {
  return themeCharacterJson(theme);
}

export function inferBackgroundLoras(source: string): EpisodeLoraTune[] {
  const text = source.toLowerCase();
  const picked = new Map<string, EpisodeLoraTune>();

  function add(id: string, weight?: number) {
    const lora = LORA_LIBRARY.find((item) => item.id === id);
    if (!lora || picked.has(id)) return;
    picked.set(id, {
      id: lora.id,
      label: lora.label,
      category: lora.category,
      weight: weight ?? lora.defaultWeight,
    });
  }

  if (/\b(lagos|nigeria|nigerian|naija|market|street|island|mainland)\b/.test(text)) add('lagos-streets-architecture', 0.58);
  if (/\b(nollywood|cinematic|film|drama|35mm|movie)\b/.test(text)) add('nollywood-cinematic-35mm', 0.62);
  if (/\b(afrofutur|futuristic|sci-fi|speculative|tech hub)\b/.test(text)) add('afrofuturist-editorial', 0.55);
  if (/\b(documentary|realistic|natural|interview|observational)\b/.test(text)) add('documentary-natural-light', 0.48);
  if (/\b(animated|storybook|myth|folktale|children|illustrated)\b/.test(text)) add('animated-storybook-texture', 0.52);

  if (picked.size === 0) add('documentary-natural-light', 0.35);
  return Array.from(picked.values()).slice(0, 3);
}

export function sceneCountForDuration(seconds: number) {
  return Math.max(1, Math.ceil(seconds / 10));
}

export function formatEpisodeRuntimeLabel(seconds: number): string {
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}m`;
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

export function timestamp(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function retimeScenes(scenes: EpisodeSceneCard[]): EpisodeSceneCard[] {
  return scenes.map((scene, index) => ({
    ...scene,
    sceneNumber: index + 1,
    startSec: index * 10,
    endSec: (index + 1) * 10,
  }));
}

export function extractHandles(value: string) {
  return Array.from(new Set((value.match(/@[\w-]+/g) ?? []).map((handle) => handle.trim())));
}

export function createSceneCard(
  index: number,
  seed: string,
  handles: string[],
  defaultVoiceProfile?: string,
): EpisodeSceneCard {
  const startSec = index * 10;
  const handleText = handles.length ? handles.join(' ') : '';
  return {
    id: crypto.randomUUID(),
    sceneNumber: index + 1,
    startSec,
    endSec: startSec + 10,
    voiceOver: seed
      ? `Scene ${index + 1}: ${seed}`
      : `Scene ${index + 1}: Write the voice-over for this scene.`,
    visualPrompt: `${handleText}${handleText ? ' - ' : ''}Describe camera, setting, action, mood, and continuity for this scene.`,
    characterHandles: handles,
    approved: false,
    ttsStatus: 'idle',
    sceneVideoAudioEnabled: false,
    voiceProfile: defaultVoiceProfile,
    ttsLines: [{
      id: crypto.randomUUID(),
      text: seed
        ? `Scene ${index + 1}: ${seed}`
        : `Scene ${index + 1}: Write the voice-over for this scene.`,
      voiceProfile: defaultVoiceProfile,
      status: 'idle',
    }],
  };
}

export function buildSceneCards(
  title: string,
  basePrompt: string,
  durationSeconds: number,
  mentions: ThemeCharacterMention[],
  defaultVoiceProfile?: string,
) {
  const count = sceneCountForDuration(durationSeconds);
  const handles = mentions.slice(0, 3).map((mention) => mention.handle);
  const seed = basePrompt.trim() || title.trim() || 'Episode idea';
  const words = seed.split(/\s+/).filter(Boolean);
  const chunkSize = Math.max(8, Math.ceil(words.length / count));
  return Array.from({ length: count }, (_, index) => {
    const chunk = words.slice(index * chunkSize, (index + 1) * chunkSize).join(' ') || seed;
    return createSceneCard(index, chunk, handles, defaultVoiceProfile);
  });
}
