import { STUDIO_VIDEOS, type StudioVideoKey } from '@/data/media';

interface AmbientVideoProps {
  videoKey: StudioVideoKey;
  className?: string;
  /** `panel` = inset media card; `background` = full-bleed behind content */
  variant?: 'panel' | 'background';
  /** Soft zoom motion on the video layer */
  kenBurns?: boolean;
  overlayClassName?: string;
}

export function AmbientVideo({
  videoKey,
  className = '',
  variant = 'panel',
  kenBurns = false,
  overlayClassName,
}: AmbientVideoProps): React.JSX.Element {
  if (variant === 'background') {
    return (
      <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
        <video
          className={`absolute inset-0 h-full w-full object-cover ${kenBurns ? 'video-ken-burns' : ''}`}
          autoPlay
          loop
          muted
          playsInline
          src={STUDIO_VIDEOS[videoKey]}
        />
        <div
          className={
            overlayClassName ??
            'absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-black/85'
          }
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 ${className}`}>
      <video
        className={`h-full w-full object-cover ${kenBurns ? 'video-ken-burns' : ''}`}
        autoPlay
        loop
        muted
        playsInline
        src={STUDIO_VIDEOS[videoKey]}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
    </div>
  );
}
