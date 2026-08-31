import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { Loader2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import {
  preventMediaContextMenu,
  protectedMediaSurfaceClass,
  useProtectedAudioSrc,
} from './protectedMedia';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function ProtectedStudioAudio({
  originUrl,
  label,
  className = '',
}: {
  originUrl?: string;
  label?: string;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const { src, loading, error } = useProtectedAudioSrc(originUrl);
  const [playing, setPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    audio.load();
    setCurrent(0);
    setPlaying(false);
    setPlaybackError(false);
  }, [src]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (audio.paused) {
      void audio.play()
        .then(() => setPlaying(true))
        .catch(() => {
          setPlaying(false);
          setPlaybackError(true);
        });
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, [src]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(time)) return;
    audio.currentTime = Math.min(Math.max(0, time), audio.duration || time);
    setCurrent(audio.currentTime);
  }, []);

  const onBarPointer = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      const bar = barRef.current;
      if (!audio || !bar || !duration) return;
      const rect = bar.getBoundingClientRect();
      const x = Math.min(Math.max(0, event.clientX - rect.left), rect.width);
      seek((x / rect.width) * duration);
    },
    [duration, seek],
  );

  return (
    <div
      className={`rounded-lg bg-white p-0 ${protectedMediaSurfaceClass} ${className}`}
      onContextMenu={preventMediaContextMenu}
    >
      {label ? <p className="mb-2 truncate text-[10px] font-semibold text-[var(--color-ash-brown)]">{label}</p> : null}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        controls={false}
        controlsList="nodownload noremoteplayback"
        draggable={false}
        className="hidden"
        onTimeUpdate={() => {
          const audio = audioRef.current;
          if (audio) setCurrent(audio.currentTime);
        }}
        onLoadedMetadata={() => {
          const audio = audioRef.current;
          if (audio) setDuration(audio.duration || 0);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setPlaybackError(true)}
      />
      {loading ? (
        <div className="flex h-10 items-center justify-center text-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : error || !src ? (
        <p className="text-xs text-muted">Protected audio preview unavailable.</p>
      ) : playbackError ? (
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted">Could not start narration playback.</p>
          <button
            type="button"
            className="text-xs font-semibold text-[var(--color-muted-olive)] underline"
            onClick={() => {
              setPlaybackError(false);
              togglePlay();
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={playing ? 'Pause narration' : 'Play narration'}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted-olive)] text-[var(--color-vanilla-cream)]"
            onClick={togglePlay}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div className="min-w-0 flex-1">
            <div
              ref={barRef}
              role="slider"
              aria-label="Seek narration"
              aria-valuemin={0}
              aria-valuemax={Math.max(0, Math.floor(duration))}
              aria-valuenow={Math.floor(current)}
              tabIndex={0}
              className="h-1.5 w-full cursor-pointer rounded-full bg-[var(--color-tea-green)]/50"
              onPointerDown={(event) => {
                (event.target as HTMLElement).setPointerCapture(event.pointerId);
                onBarPointer(event);
              }}
              onPointerMove={(event) => {
                if (event.buttons !== 1) return;
                onBarPointer(event);
              }}
            >
              <div
                className="h-full rounded-full bg-[var(--color-muted-olive)]"
                style={{ width: `${duration ? (current / duration) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] tabular-nums text-muted">
              {formatTime(current)} / {formatTime(duration)}
            </p>
          </div>
          <button
            type="button"
            aria-label={isMuted ? 'Unmute narration' : 'Mute narration'}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-[var(--color-ash-brown)]"
            onClick={() => setIsMuted((value) => !value)}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            aria-label="Narration volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            className="w-16 accent-[var(--color-muted-olive)]"
            onChange={(event) => {
              const nextVolume = Number(event.target.value);
              setVolume(nextVolume);
              setIsMuted(nextVolume === 0);
            }}
          />
        </div>
      )}
    </div>
  );
}
