import { renderSfxPresetFile } from './sfxSynthesis';

export type SfxPresetId =
  | 'crowd-bed'
  | 'crowd-cheer'
  | 'crowd-gasp'
  | 'applause'
  | 'violin-swell'
  | 'piano-bed'
  | 'low-drone'
  | 'cinematic-hit'
  | 'whoosh'
  | 'reverse-whoosh'
  | 'bass-drop'
  | 'street-ambience'
  | 'rain-ambience'
  | 'office-room'
  | 'market-ambience'
  | 'soft-riser'
  | 'heartbeat'
  | 'camera-click'
  | 'notification'
  | 'typing'
  | 'door-knock'
  | 'footsteps'
  | 'page-turn';

export type SfxCategory = 'Ambience' | 'Crowd' | 'Music Beds' | 'Transitions' | 'Impacts' | 'Foley';

export type SfxPreset = {
  id: SfxPresetId;
  label: string;
  category: SfxCategory;
  description: string;
  duration: number;
  volume: number;
};

export const SFX_PRESETS: SfxPreset[] = [
  { id: 'crowd-bed', label: 'Crowd Bed', category: 'Crowd', description: 'Soft audience texture under a scene.', duration: 8, volume: 45 },
  { id: 'crowd-cheer', label: 'Crowd Cheer', category: 'Crowd', description: 'Short upbeat crowd reaction.', duration: 3, volume: 62 },
  { id: 'crowd-gasp', label: 'Crowd Gasp', category: 'Crowd', description: 'Quick shocked audience swell.', duration: 2, volume: 58 },
  { id: 'applause', label: 'Applause', category: 'Crowd', description: 'Warm clapping response.', duration: 5, volume: 56 },
  { id: 'violin-swell', label: 'Violin Swell', category: 'Music Beds', description: 'Emotional rising string accent.', duration: 5, volume: 55 },
  { id: 'piano-bed', label: 'Piano Bed', category: 'Music Beds', description: 'Gentle tonal underscore.', duration: 10, volume: 38 },
  { id: 'low-drone', label: 'Low Drone', category: 'Music Beds', description: 'Subtle tension bed.', duration: 10, volume: 34 },
  { id: 'cinematic-hit', label: 'Cinematic Hit', category: 'Impacts', description: 'Heavy moment punctuation.', duration: 2, volume: 75 },
  { id: 'bass-drop', label: 'Bass Drop', category: 'Impacts', description: 'Deep transition hit.', duration: 3, volume: 72 },
  { id: 'heartbeat', label: 'Heartbeat', category: 'Impacts', description: 'Rhythmic tension pulse.', duration: 4, volume: 55 },
  { id: 'whoosh', label: 'Whoosh', category: 'Transitions', description: 'Fast scene movement.', duration: 2, volume: 65 },
  { id: 'reverse-whoosh', label: 'Reverse Whoosh', category: 'Transitions', description: 'Build into a reveal.', duration: 3, volume: 62 },
  { id: 'soft-riser', label: 'Soft Riser', category: 'Transitions', description: 'Gentle build before a beat.', duration: 6, volume: 50 },
  { id: 'street-ambience', label: 'Street Ambience', category: 'Ambience', description: 'Outdoor city-room texture.', duration: 10, volume: 40 },
  { id: 'market-ambience', label: 'Market Ambience', category: 'Ambience', description: 'Busy public space bed.', duration: 10, volume: 42 },
  { id: 'rain-ambience', label: 'Rain Ambience', category: 'Ambience', description: 'Soft weather background.', duration: 10, volume: 36 },
  { id: 'office-room', label: 'Office Room', category: 'Ambience', description: 'Quiet indoor room tone.', duration: 10, volume: 32 },
  { id: 'camera-click', label: 'Camera Click', category: 'Foley', description: 'Single camera shutter.', duration: 1, volume: 70 },
  { id: 'notification', label: 'Notification', category: 'Foley', description: 'Short app alert tone.', duration: 1, volume: 58 },
  { id: 'typing', label: 'Typing', category: 'Foley', description: 'Keyboard typing texture.', duration: 4, volume: 45 },
  { id: 'door-knock', label: 'Door Knock', category: 'Foley', description: 'Three short knocks.', duration: 2, volume: 60 },
  { id: 'footsteps', label: 'Footsteps', category: 'Foley', description: 'Simple walking rhythm.', duration: 5, volume: 48 },
  { id: 'page-turn', label: 'Page Turn', category: 'Foley', description: 'Paper movement accent.', duration: 1, volume: 52 },
];

export async function createSfxPresetFile(preset: SfxPreset) {
  return renderSfxPresetFile(preset);
}
