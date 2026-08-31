import { directStudioMediaUrl, resolveProtectedAudioPlaybackUrl } from './protectedMedia';

export async function playEpisodeAudio(url: string): Promise<void> {
  const playbackUrl = await resolveProtectedAudioPlaybackUrl(url);
  if (!playbackUrl) throw new Error('Could not resolve audio playback URL.');

  const audio = new Audio();
  audio.preload = 'auto';
  audio.controls = false;
  audio.setAttribute('controlsList', 'nodownload noremoteplayback');
  audio.src = playbackUrl;

  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Could not load generated audio.'));
    };
    const cleanup = () => {
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('loadedmetadata', onReady);
      audio.removeEventListener('error', onError);
    };

    audio.addEventListener('canplaythrough', onReady, { once: true });
    audio.addEventListener('loadedmetadata', onReady, { once: true });
    audio.addEventListener('error', onError, { once: true });
    audio.load();
  });

  try {
    await audio.play();
  } finally {
    if (playbackUrl.startsWith('blob:')) {
      window.setTimeout(() => URL.revokeObjectURL(playbackUrl), 60_000);
    }
  }
}

export function episodeAudioPreviewUrl(url: string): string {
  return directStudioMediaUrl(url) ?? url;
}
