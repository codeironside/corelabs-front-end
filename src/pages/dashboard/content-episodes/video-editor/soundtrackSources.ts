export type SoundtrackSource = {
  id: string;
  name: string;
  url: string;
  kind: 'free' | 'free-attribution' | 'affordable';
  bestFor: string;
  note: string;
};

export const SOUNDTRACK_SOURCES: SoundtrackSource[] = [
  {
    id: 'pixabay',
    name: 'Pixabay Music & SFX',
    url: 'https://pixabay.com/music/',
    kind: 'free',
    bestFor: 'Fast background beds and simple SFX',
    note: 'Check each asset page and keep the license context with the episode.',
  },
  {
    id: 'mixkit',
    name: 'Mixkit',
    url: 'https://mixkit.co/free-stock-music/',
    kind: 'free',
    bestFor: 'Short creator-friendly tracks',
    note: 'Good for quick edits when you need music without an account-heavy flow.',
  },
  {
    id: 'youtube-audio-library',
    name: 'YouTube Audio Library',
    url: 'https://studio.youtube.com/channel/UC/music',
    kind: 'free',
    bestFor: 'YouTube-safe music and SFX',
    note: 'Best opened from YouTube Studio; review attribution and usage notes per track.',
  },
  {
    id: 'free-music-archive',
    name: 'Free Music Archive',
    url: 'https://freemusicarchive.org/',
    kind: 'free-attribution',
    bestFor: 'Creative Commons music discovery',
    note: 'Licenses vary by track, so confirm commercial use and attribution rules.',
  },
  {
    id: 'incompetech',
    name: 'Incompetech',
    url: 'https://incompetech.com/music/',
    kind: 'free-attribution',
    bestFor: 'Reliable cinematic and utility tracks',
    note: 'Often free with attribution; no-attribution licenses are available per track.',
  },
  {
    id: 'freesound',
    name: 'Freesound',
    url: 'https://freesound.org/',
    kind: 'free-attribution',
    bestFor: 'Real field-recorded SFX and ambience',
    note: 'Filter for CC0 or CC BY if the final episode is commercial.',
  },
  {
    id: 'bensound',
    name: 'Bensound',
    url: 'https://www.bensound.com/',
    kind: 'affordable',
    bestFor: 'Polished commercial music beds',
    note: 'Free and paid tiers differ; confirm the license before publishing.',
  },
  {
    id: 'ncs',
    name: 'NoCopyrightSounds',
    url: 'https://ncs.io/',
    kind: 'free-attribution',
    bestFor: 'High-energy creator music',
    note: 'Usually attribution-driven; verify requirements on the track page.',
  },
];
