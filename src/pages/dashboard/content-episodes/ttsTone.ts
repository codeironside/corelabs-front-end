import { characterHandleKey } from './characterTts';
import { normalizeToneDirection } from '@/lib/ttsToneDirection';

export const TTS_TONE_PRESETS = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'warm', label: 'Warm & welcoming' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'calm', label: 'Calm & measured' },
  { value: 'energetic', label: 'Energetic' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'intimate', label: 'Intimate & close' },
] as const;

export const TTS_PACE_PRESETS = [
  { value: 'very-slow', label: 'Very slow' },
  { value: 'slow', label: 'Slow' },
  { value: 'normal', label: 'Normal pace' },
  { value: 'fast', label: 'Fast' },
  { value: 'very-fast', label: 'Very fast' },
] as const;

export type EpisodeTtsTonePreset = (typeof TTS_TONE_PRESETS)[number]['value'];
export type EpisodeTtsPacePreset = (typeof TTS_PACE_PRESETS)[number]['value'];

export const CHARACTER_TONE_PRESET_ROTATION: EpisodeTtsTonePreset[] = [
  'warm',
  'dramatic',
  'calm',
  'energetic',
  'documentary',
  'intimate',
  'neutral',
];

const LEGACY_PITCH_PRESET_PERCENT: Record<string, number> = {
  'very-low': -50,
  low: -25,
  normal: 0,
  high: 25,
  'very-high': 50,
};

export type EpisodeTtsTone = {
  preset?: EpisodeTtsTonePreset;
  direction?: string;
  pace?: EpisodeTtsPacePreset;
  /** Pitch offset as a percentage. 0 = neutral. */
  pitch?: number;
};

export { normalizeToneDirection, TTS_TONE_DIRECTION_MAX_LENGTH } from '@/lib/ttsToneDirection';

export function tonePresetLabel(value?: string) {
  return TTS_TONE_PRESETS.find((option) => option.value === value)?.label ?? 'Neutral';
}

export function pacePresetLabel(value?: string) {
  return TTS_PACE_PRESETS.find((option) => option.value === value)?.label ?? 'Normal pace';
}

export function normalizePitchPercent(value?: number | string | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'string') {
    const trimmed = value.trim().replace(/%$/, '');
    if (trimmed in LEGACY_PITCH_PRESET_PERCENT) {
      return LEGACY_PITCH_PRESET_PERCENT[trimmed];
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(-100, Math.min(100, Math.round(parsed)));
  }
  if (!Number.isFinite(value)) return 0;
  return Math.max(-100, Math.min(100, Math.round(value)));
}

export function formatPitchPercent(value?: number | string | null): string {
  const normalized = normalizePitchPercent(value);
  if (normalized === 0) return '0%';
  return normalized > 0 ? `+${normalized}%` : `${normalized}%`;
}

export function defaultCharacterTonePreset(index: number): EpisodeTtsTonePreset {
  return CHARACTER_TONE_PRESET_ROTATION[index % CHARACTER_TONE_PRESET_ROTATION.length] ?? 'neutral';
}

export function resolveTtsLineTone(
  line: {
    speaker?: string;
    tonePreset?: string;
    toneDirection?: string;
    tonePace?: string;
    tonePitch?: string | number;
  },
  narratorDefaults: EpisodeTtsTone,
  characterProfiles?: Record<string, {
    tonePreset?: string;
    toneDirection?: string;
    pacePreset?: string;
    pitchPercent?: number;
  }>,
): EpisodeTtsTone {
  const profile = line.speaker ? characterProfiles?.[characterHandleKey(line.speaker)] : undefined;
  if (profile) {
    return {
      preset: (profile.tonePreset as EpisodeTtsTonePreset | undefined) ?? 'neutral',
      direction: normalizeToneDirection(profile.toneDirection),
      pace: (profile.pacePreset as EpisodeTtsPacePreset | undefined) ?? 'normal',
      pitch: profile.pitchPercent ?? 0,
    };
  }
  return {
    preset: (line.tonePreset as EpisodeTtsTonePreset | undefined) ?? narratorDefaults.preset ?? 'neutral',
    direction: normalizeToneDirection(line.toneDirection) || normalizeToneDirection(narratorDefaults.direction),
    pace: (line.tonePace as EpisodeTtsPacePreset | undefined) ?? narratorDefaults.pace ?? 'normal',
    pitch: normalizePitchPercent(line.tonePitch ?? narratorDefaults.pitch ?? 0),
  };
}

export function toneSummary(tone: EpisodeTtsTone): string | undefined {
  const parts = [
    tone.preset && tone.preset !== 'neutral' ? tonePresetLabel(tone.preset) : '',
    tone.pace && tone.pace !== 'normal' ? pacePresetLabel(tone.pace) : '',
    tone.pitch && tone.pitch !== 0 ? formatPitchPercent(tone.pitch) : '',
    tone.direction?.trim() ?? '',
  ].filter(Boolean);
  return parts.length ? parts.join(' ┬╖ ') : undefined;
}
