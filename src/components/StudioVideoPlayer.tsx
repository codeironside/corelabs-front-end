import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, ChevronRight, ChevronLeft, Subtitles } from 'lucide-react';
import { preventMediaContextMenu, protectedMediaSurfaceClass, protectedVideoProps } from '@/pages/dashboard/content-episodes/protectedMedia';

type StudioVideoPlayerProps = {
  src: string;
  poster?: string;
  captionsUrl?: string;
  title?: string;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  onMediaError?: () => void;
  className?: string;
};

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function StudioVideoPlayer({
  src,
  poster,
  captionsUrl,
  title,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  onMediaError,
  className = '',
}: StudioVideoPlayerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ccOn, setCcOn] = useState(false);
  const [hoverControls, setHoverControls] = useState(true);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    setCurrent(0);
    setPlaying(false);
  }, [src]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
  }, [muted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
  }, [volume]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tracks = v.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = ccOn && captionsUrl ? 'showing' : 'hidden';
    }
  }, [ccOn, captionsUrl]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const seek = useCallback((t: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(t)) return;
    v.currentTime = Math.min(Math.max(0, t), v.duration || t);
    setCurrent(v.currentTime);
  }, []);

  const skip = useCallback(
    (delta: number) => {
      const v = videoRef.current;
      if (!v) return;
      seek(v.currentTime + delta);
    },
    [seek],
  );

  const onBarPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const v = videoRef.current;
      const bar = barRef.current;
      if (!v || !bar || !duration) return;
      const r = bar.getBoundingClientRect();
      const x = Math.min(Math.max(0, e.clientX - r.left), r.width);
      seek((x / r.width) * duration);
    },
    [duration, seek],
  );

  const fs = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
      if (e.code === 'ArrowRight') skip(10);
      if (e.code === 'ArrowLeft') skip(-10);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, skip]);

  return (
    <div
      ref={wrapRef}
      className={`group relative rounded-xl bg-black overflow-hidden ${protectedMediaSurfaceClass} ${className}`}
      onMouseEnter={() => setHoverControls(true)}
      onMouseLeave={() => setHoverControls(false)}
      onContextMenu={preventMediaContextMenu}
    >
      {title ? (
        <p className="absolute top-2 left-2 right-2 z-10 text-xs font-medium text-white/90 drop-shadow truncate pointer-events-none">
          {title}
        </p>
      ) : null}
      <video
        ref={videoRef}
        {...protectedVideoProps}
        className="w-full max-h-[min(28rem,55vh)] object-contain bg-black"
        poster={poster}
        onError={() => onMediaError?.()}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (v) setCurrent(v.currentTime);
        }}
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (v) setDuration(v.duration || 0);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onClick={togglePlay}
      >
        <source src={src} type="video/mp4" />
        {captionsUrl ? <track kind="captions" srcLang="en" label="English" src={captionsUrl} /> : null}
      </video>

      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pt-8 pb-2 transition-opacity ${
          hoverControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <div
          ref={barRef}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, Math.floor(duration))}
          aria-valuenow={Math.floor(current)}
          tabIndex={0}
          className="h-1.5 w-full rounded-full bg-white/20 cursor-pointer mb-2"
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            onBarPointer(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons !== 1) return;
            onBarPointer(e);
          }}
        >
          <div
            className="h-full rounded-full bg-accent pointer-events-none"
            style={{ width: `${duration ? (current / duration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label={playing ? 'Pause' : 'Play'}
            className="p-1.5 rounded-lg text-white hover:bg-white/15"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
          >
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            type="button"
            aria-label="Back 10 seconds"
            className="p-1.5 rounded-lg text-white/90 hover:bg-white/15 text-xs font-medium"
            onClick={(e) => {
              e.stopPropagation();
              skip(-10);
            }}
          >
            -10s
          </button>
          <button
            type="button"
            aria-label="Forward 10 seconds"
            className="p-1.5 rounded-lg text-white/90 hover:bg-white/15 text-xs font-medium"
            onClick={(e) => {
              e.stopPropagation();
              skip(10);
            }}
          >
            +10s
          </button>
          <span className="text-[11px] text-white/85 tabular-nums min-w-[5rem]">
            {formatTime(current)} / {formatTime(duration)}
          </span>
          <div className="flex items-center gap-1 ml-auto">
            {hasPrev && onPrev ? (
              <button
                type="button"
                aria-label="Previous clip"
                className="p-1.5 rounded-lg text-white hover:bg-white/15"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev();
                }}
              >
                <ChevronLeft size={18} />
              </button>
            ) : null}
            {hasNext && onNext ? (
              <button
                type="button"
                aria-label="Next clip"
                className="p-1.5 rounded-lg text-white hover:bg-white/15"
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
              >
                <ChevronRight size={18} />
              </button>
            ) : null}
            <button
              type="button"
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="p-1.5 rounded-lg text-white hover:bg-white/15"
              onClick={(e) => {
                e.stopPropagation();
                setMuted((m) => !m);
              }}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              aria-label="Volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              className="w-16 h-1 accent-accent"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const nv = Number(e.target.value);
                setVolume(nv);
                setMuted(nv === 0);
              }}
            />
            <button
              type="button"
              aria-label="Captions"
              disabled={!captionsUrl}
              title={captionsUrl ? 'Toggle captions' : 'No caption file for this clip'}
              className={`p-1.5 rounded-lg text-white hover:bg-white/15 disabled:opacity-40`}
              onClick={(e) => {
                e.stopPropagation();
                if (captionsUrl) setCcOn((c) => !c);
              }}
            >
              <Subtitles size={18} />
            </button>
            <button
              type="button"
              aria-label="Fullscreen"
              className="p-1.5 rounded-lg text-white hover:bg-white/15"
              onClick={(e) => {
                e.stopPropagation();
                fs();
              }}
            >
              <Maximize size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
