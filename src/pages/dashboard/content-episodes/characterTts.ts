import type { ThemeCharacterMention } from './storyboard';
import { handleForCharacter } from './storyboard';
import type { EpisodeTtsTone, EpisodeTtsPacePreset, EpisodeTtsTonePreset } from './ttsTone';
import { normalizePitchPercent, normalizeToneDirection } from './ttsTone';

const CHARACTER_TONE_PRESET_ROTATION: EpisodeTtsTonePreset[] = [
  'warm', 'dramatic', 'calm', 'energetic', 'documentary', 'intimate', 'neutral',
];

function defaultCharacterTonePreset(index: number): EpisodeTtsTonePreset {
  return CHARACTER_TONE_PRESET_ROTATION[index % CHARACTER_TONE_PRESET_ROTATION.length] ?? 'neutral';
}

export type CharacterTtsProfile = {
  handle: string;
  name: string;
  voiceProfile: string;
  tonePreset: EpisodeTtsTonePreset | string;
  toneDirection?: string;
  pacePreset: EpisodeTtsPacePreset | string;
  pitchPercent: number;
  source: 'theme';
};

export function normalizeCharacterHandle(handle?: string): string {
  const trimmed = handle?.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

export function characterHandleKey(handle?: string): string {
  return normalizeCharacterHandle(handle).toLowerCase();
}

type ThemeCharacterJson = {
  characters?: Array<{
    id?: string;
    handle?: string;
    name?: string;
    ttsVoiceProfile?: string;
    ttsTonePreset?: string;
    ttsToneDirection?: string;
    ttsPacePreset?: string;
    ttsPitchPercent?: number | string;
    ttsPitchDescription?: string;
    /** @deprecated legacy preset slug */
    ttsPitchPreset?: string;
  }>;
};

function parseThemeCharacterJson(themeJson: string): ThemeCharacterJson | null {
  if (!themeJson.trim()) return null;
  try {
    return JSON.parse(themeJson) as ThemeCharacterJson;
  } catch {
    return null;
  }
}

function parsePacePreset(value?: string): EpisodeTtsPacePreset | string {
  const trimmed = value?.trim().slice(0, 80);
  if (!trimmed) return 'normal';
  return trimmed;
}

function parseTonePreset(value: string | undefined, _index: number): EpisodeTtsTonePreset | string {
  const trimmed = value?.trim().slice(0, 120);
  if (!trimmed) return 'neutral';
  return trimmed;
}

/** Map free-text pitch descriptions to a percent when possible. */
export function inferPitchPercentFromDescription(value?: string | null): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^-?\d+(\.\d+)?%?$/.test(trimmed.replace(/\s/g, ''))) {
    return normalizePitchPercent(trimmed);
  }

  const lower = trimmed.toLowerCase();
  if (/(very\s+)?(low|deep|deeper|lower|bass)/.test(lower)) {
    return /very/.test(lower) ? -50 : -25;
  }
  if (/(very\s+)?(high|higher|bright|thin|soprano)/.test(lower)) {
    return /very/.test(lower) ? 50 : 25;
  }
  if (/neutral|mid|medium|average|normal/.test(lower)) return 0;
  return undefined;
}

function parseCharacterPitchPercent(character: {
  ttsPitchPercent?: number | string;
  ttsPitchPreset?: string;
  ttsPitchDescription?: string;
}): number {
  const fromDescription = inferPitchPercentFromDescription(character.ttsPitchDescription);
  if (fromDescription !== undefined) return fromDescription;
  if (character.ttsPitchPercent !== undefined && character.ttsPitchPercent !== null && character.ttsPitchPercent !== '') {
    return normalizePitchPercent(character.ttsPitchPercent);
  }
  if (character.ttsPitchPreset) {
    return normalizePitchPercent(character.ttsPitchPreset);
  }
  return 0;
}

function mergeToneDirection(
  direction?: string,
  pitchDescription?: string,
  voiceDescription?: string,
): string | undefined {
  const pitchNote = pitchDescription?.trim();
  const inferred = inferPitchPercentFromDescription(pitchNote);
  const pitchAsNote = pitchNote && inferred === undefined ? pitchNote : undefined;
  const voiceNote = voiceDescription?.trim() && !looksLikeCatalogVoiceId(voiceDescription)
    ? voiceDescription.trim()
    : undefined;
  return normalizeToneDirection([direction, voiceNote, pitchAsNote].filter(Boolean).join(', '));
}

function looksLikeCatalogVoiceId(value?: string): boolean {
  const trimmed = value?.trim().toLowerCase() ?? '';
  if (!trimmed) return false;
  if (/^(lagos-|neutral-|west-|youthful-|flux-|aura-|groq:|deepgram:)/.test(trimmed)) return true;
  return ['troy', 'hannah', 'austin', 'dan', 'autumn', 'diana'].includes(trimmed);
}

function themeCharacterRecord(
  character: NonNullable<ThemeCharacterJson['characters']>[number],
  index: number,
  narratorVoice: string,
) {
  const handle = normalizeCharacterHandle(handleForCharacter(character, index));
  return {
    handle,
    name: character.name?.trim() || handle,
    voiceProfile: character.ttsVoiceProfile?.trim() || narratorVoice,
    tonePreset: parseTonePreset(character.ttsTonePreset, index),
    toneDirection: mergeToneDirection(
      character.ttsToneDirection,
      character.ttsPitchDescription,
      character.ttsVoiceProfile,
    ),
    pacePreset: parsePacePreset(character.ttsPacePreset),
    pitchPercent: parseCharacterPitchPercent(character),
  };
}

export function parseThemeCharacterTtsProfiles(
  themeJson: string,
  mentions: ThemeCharacterMention[],
  narratorVoice: string,
): Record<string, CharacterTtsProfile> {
  const parsed = parseThemeCharacterJson(themeJson);
  if (!parsed?.characters?.length) return {};

  const byHandle = new Map<string, CharacterTtsProfile>();
  parsed.characters.forEach((character, index) => {
    const record = themeCharacterRecord(character, index, narratorVoice);
    byHandle.set(characterHandleKey(record.handle), {
      ...record,
      source: 'theme',
    });
  });

  mentions.forEach((mention, index) => {
    const key = characterHandleKey(mention.handle);
    if (byHandle.has(key)) return;
    byHandle.set(key, {
      handle: mention.handle,
      name: mention.name,
      voiceProfile: narratorVoice,
      tonePreset: defaultCharacterTonePreset(index),
      pacePreset: 'normal',
      pitchPercent: 0,
      source: 'theme',
    });
  });

  return Object.fromEntries(byHandle.entries());
}

export function syncCharacterTtsProfilesFromTheme(
  themeJson: string,
  mentions: ThemeCharacterMention[],
  narratorVoice: string,
): Record<string, CharacterTtsProfile> {
  return parseThemeCharacterTtsProfiles(themeJson, mentions, narratorVoice);
}

export function resolveLineTtsFromSpeaker(
  speaker: string | undefined,
  characterProfiles: Record<string, CharacterTtsProfile>,
  narratorVoice: string,
  episodeMood: EpisodeTtsTone,
): { voiceProfile: string; tone: EpisodeTtsTone } {
  const key = characterHandleKey(speaker);
  const profile = key ? characterProfiles[key] : undefined;
  if (!profile) {
    return {
      voiceProfile: narratorVoice,
      tone: episodeMood,
    };
  }
  return {
    voiceProfile: profile.voiceProfile,
    tone: {
      preset: profile.tonePreset,
      direction: profile.toneDirection,
      pace: profile.pacePreset,
      pitch: profile.pitchPercent,
    },
  };
}

export function themeCharacterTtsProfile(
  character: {
    ttsVoiceProfile?: string;
    ttsTonePreset?: string;
    ttsToneDirection?: string;
    ttsPacePreset?: string;
    ttsPitchPercent?: number | string;
    ttsPitchPreset?: string;
    ttsPitchDescription?: string;
  },
  index: number,
  narratorVoice: string,
): { voiceProfile: string; tone: EpisodeTtsTone } {
  return {
    voiceProfile: character.ttsVoiceProfile?.trim() || narratorVoice,
    tone: {
      preset: parseTonePreset(character.ttsTonePreset, index),
      direction: mergeToneDirection(
        character.ttsToneDirection,
        character.ttsPitchDescription,
        character.ttsVoiceProfile,
      ),
      pace: parsePacePreset(character.ttsPacePreset),
      pitch: parseCharacterPitchPercent(character),
    },
  };
}
