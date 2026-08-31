import { useCallback, useEffect, useRef, useState, type PointerEvent, type VideoHTMLAttributes } from 'react';
import { Loader2, Maximize2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import {
  directStudioMediaUrl,
  preventMediaContextMenu,
  protectedMediaSurfaceClass,
  protectedVideoProps,
  useProtectedMediaSrc,
} from './protectedMedia';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

type ProtectedStudioVideoProps = {
  originUrl?: string;
  className?: string;
  videoClassName?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onPlayStateChange?: (playing: boolean) => void;
} & Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src' | 'controls'>;

export function ProtectedStudioVideo({
  originUrl,
  className = '',
  videoClassName = '',
  autoPlay = false,
  muted = false,
  loop = false,
  onTimeUpdate,
  onEnded,
  onPlayStateChange,
  ...videoProps
}: ProtectedStudioVideoProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const { src: protectedSrc, loading, error } = useProtectedMediaSrc(originUrl);
  const [fallbackSrc, setFallbackSrc] = useState<string | undefined>();
  const src = fallbackSrc ?? protectedSrc;
  const [playing, setPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setFallbackSrc(undefined);
  }, [originUrl]);

  useEffect(() => {
    setIsMuted(muted);
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
  }, [volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    video.load();
    setCurrent(0);
    setPlaying(false);
    if (autoPlay) void video.play().catch(() => undefined);
  }, [src, autoPlay]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
      onPlayStateChange?.(true);
    } else {
      video.pause();
      setPlaying(false);
      onPlayStateChange?.(false);
    }
  }, [onPlayStateChange, src]);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(time)) return;
    video.currentTime = Math.min(Math.max(0, time), video.duration || time);
    setCurrent(video.currentTime);
  }, []);

  const onBarPointer = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const video = videoRef.current;
      const bar = barRef.current;
      if (!video || !bar || !duration) return;
      const rect = bar.getBoundingClientRect();
      const x = Math.min(Math.max(0, event.clientX - rect.left), rect.width);
      seek((x / rect.width) * duration);
    },
    [duration, seek],
  );

  const requestFullscreen = useCallback(() => {
    const element = wrapRef.current;
    if (!element) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void element.requestFullscreen();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`group relative overflow-hidden rounded-lg bg-black ${protectedMediaSurfaceClass} ${className}`}
      onContextMenu={preventMediaContextMenu}
    >
      {loading ? (
        <div className="flex aspect-video min-h-[10rem] items-center justify-center text-white/80">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : error || !src ? (
        <div className="flex aspect-video min-h-[10rem] items-center justify-center px-6 text-center text-xs font-medium text-white/75">
          Protected preview unavailable. Refresh and try again.
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            {...protectedVideoProps}
            {...videoProps}
            src={src}
            muted={isMuted}
            loop={loop}
            className={`h-full w-full object-contain ${videoClassName}`}
            onClick={togglePlay}
            onTimeUpdate={() => {
              const video = videoRef.current;
              if (!video) return;
              setCurrent(video.currentTime);
              onTimeUpdate?.(video.currentTime);
            }}
            onLoadedMetadata={() => {
              const video = videoRef.current;
              if (video) setDuration(video.duration || 0);
            }}
            onPlay={() => {
              setPlaying(true);
              onPlayStateChange?.(true);
            }}
            onPause={() => {
              setPlaying(false);
              onPlayStateChange?.(false);
            }}
            onEnded={() => onEnded?.()}
            onError={() => {
              const direct = directStudioMediaUrl(originUrl);
              if (direct && fallbackSrc !== direct) {
                setFallbackSrc(direct);
              }
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-3 pb-2 pt-8 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <div
              ref={barRef}
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.max(0, Math.floor(duration))}
              aria-valuenow={Math.floor(current)}
              tabIndex={0}
              className="mb-2 h-1.5 w-full cursor-pointer rounded-full bg-white/20"
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
                className="pointer-events-none h-full rounded-full bg-[var(--color-muted-olive)]"
                style={{ width: `${duration ? (current / duration) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={playing ? 'Pause' : 'Play'}
                className="rounded-lg p-1.5 text-white hover:bg-white/15"
                onClick={(event) => {
                  event.stopPropagation();
                  togglePlay();
                }}
              >
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <span className="min-w-[5rem] text-[11px] tabular-nums text-white/85">
                {formatTime(current)} / {formatTime(duration)}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  className="rounded-lg p-1.5 text-white hover:bg-white/15"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsMuted((value) => !value);
                  }}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  aria-label="Volume"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  className="h-1 w-16 accent-[var(--color-muted-olive)]"
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => {
                    const nextVolume = Number(event.target.value);
                    setVolume(nextVolume);
                    setIsMuted(nextVolume === 0);
                  }}
                />
                <button
                  type="button"
                  aria-label="Fullscreen"
                  className="rounded-lg p-1.5 text-white hover:bg-white/15"
                  onClick={(event) => {
                    event.stopPropagation();
                    requestFullscreen();
                  }}
                >
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
