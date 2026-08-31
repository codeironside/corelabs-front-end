import type { AudioFxSettings } from './types';

export const DEFAULT_AUDIO_FX: AudioFxSettings = {
  noiseReduction: 0,
  deClick: 0,
  dePlosive: 0,
  deEss: 0,
  noiseGate: 0,
  deReverb: 0,
  lowCutHz: 80,
  bassDb: 0,
  midDb: 0,
  trebleDb: 0,
  presenceDb: 0,
  compression: 0,
  limiting: 0,
  pitchSemitones: 0,
  autoTune: 0,
  reverb: 0,
  delay: 0,
  chorus: 0,
  saturation: 0,
  vocalRiding: 0,
};

/** Sensible starting point when a mic take is added ΓÇö author can tweak in the equalizer panel. */
export const MIC_SUGGESTED_FX: Partial<AudioFxSettings> = {
  noiseReduction: 42,
  dePlosive: 28,
  deEss: 18,
  noiseGate: 35,
  deReverb: 22,
  lowCutHz: 100,
  bassDb: 2,
  presenceDb: 3,
  compression: 24,
  vocalRiding: 18,
};

export type AudioFxControl = {
  key: keyof AudioFxSettings;
  label: string;
  category: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
  help: string;
};

export const AUDIO_FX_CONTROLS: AudioFxControl[] = [
  { key: 'noiseReduction', label: 'Noise reduction', category: 'Cleanup', min: 0, max: 100, step: 1, suffix: '%', help: 'Softens room hum and steady background noise. Great for mic takes recorded at home.' },
  { key: 'deClick', label: 'De-click / de-crackle', category: 'Cleanup', min: 0, max: 100, step: 1, suffix: '%', help: 'Reduces sharp clicks, pops, and crackle from bad cables or mouth noise.' },
  { key: 'dePlosive', label: 'De-plosive', category: 'Cleanup', min: 0, max: 100, step: 1, suffix: '%', help: 'Tames harsh P and B bursts so vocals sit cleaner in the mix.' },
  { key: 'deEss', label: 'De-ess', category: 'Cleanup', min: 0, max: 100, step: 1, suffix: '%', help: 'Smooths harsh S and T sounds that feel piercing on headphones.' },
  { key: 'noiseGate', label: 'Noise gate / expander', category: 'Cleanup', min: 0, max: 100, step: 1, suffix: '%', help: 'Cuts audio when you are not speaking, hiding keyboard and room noise between phrases.' },
  { key: 'deReverb', label: 'De-reverb', category: 'Cleanup', min: 0, max: 100, step: 1, suffix: '%', help: 'Dries up echoey rooms so dialogue feels closer and more direct.' },
  { key: 'lowCutHz', label: 'Low-cut (rumble filter)', category: 'EQ', min: 20, max: 320, step: 5, suffix: ' Hz', help: 'Removes low rumble, HVAC hum, and mic handling noise below this frequency.' },
  { key: 'bassDb', label: 'Bass (subtractive/additive)', category: 'EQ', min: -12, max: 12, step: 0.5, suffix: ' dB', help: 'Boost warmth for voiceovers or reduce boomy low end on music beds.' },
  { key: 'midDb', label: 'Mid body EQ', category: 'EQ', min: -12, max: 12, step: 0.5, suffix: ' dB', help: 'Shapes vocal body and instrument fullness around 1 kHz.' },
  { key: 'presenceDb', label: 'Presence / clarity', category: 'EQ', min: -12, max: 12, step: 0.5, suffix: ' dB', help: 'Adds intelligibility so speech cuts through music and SFX.' },
  { key: 'trebleDb', label: 'Treble / air', category: 'EQ', min: -12, max: 12, step: 0.5, suffix: ' dB', help: 'Brightens detail or softens brittle highs.' },
  { key: 'compression', label: 'Compression', category: 'Dynamics', min: 0, max: 100, step: 1, suffix: '%', help: 'Evens out loud and quiet moments so levels stay consistent.' },
  { key: 'limiting', label: 'Limiting', category: 'Dynamics', min: 0, max: 100, step: 1, suffix: '%', help: 'Prevents peaks from clipping when multiple layers stack together.' },
  { key: 'vocalRiding', label: 'Volume automation (vocal riding)', category: 'Dynamics', min: 0, max: 100, step: 1, suffix: '%', help: 'Lifts quieter speech so every line stays audible over the soundtrack.' },
  { key: 'pitchSemitones', label: 'Pitch shift', category: 'Pitch & time', min: -12, max: 12, step: 0.5, suffix: ' st', help: 'Moves performance up or down in semitones without re-recording.' },
  { key: 'autoTune', label: 'Auto-tune / pitch correct', category: 'Pitch & time', min: 0, max: 100, step: 1, suffix: '%', help: 'Gently pulls pitch toward the nearest note for tighter sung or spoken takes.' },
  { key: 'saturation', label: 'Saturation / exciter', category: 'Color', min: 0, max: 100, step: 1, suffix: '%', help: 'Adds harmonic warmth so thin recordings feel fuller and more expensive.' },
  { key: 'reverb', label: 'Reverb', category: 'Space', min: 0, max: 100, step: 1, suffix: '%', help: 'Places the voice in a room. Use lightly for podcast polish.' },
  { key: 'delay', label: 'Delay / echo', category: 'Space', min: 0, max: 100, step: 1, suffix: '%', help: 'Adds rhythmic echoes for trailer-style emphasis.' },
  { key: 'chorus', label: 'Chorus / doubling', category: 'Space', min: 0, max: 100, step: 1, suffix: '%', help: 'Thickens vocals with a subtle doubled effect.' },
];

export function mergeAudioFx(partial?: Partial<AudioFxSettings>): AudioFxSettings {
  return { ...DEFAULT_AUDIO_FX, ...partial };
}

export function audioFxSignature(fx?: Partial<AudioFxSettings>) {
  return JSON.stringify(mergeAudioFx(fx));
}
