import type { SubtitleCue, SubtitleStyle } from './types';

export function activeSubtitleCue(cues: SubtitleCue[], playheadSec: number) {
  return cues.find((cue) => playheadSec >= cue.startSec && playheadSec < cue.endSec);
}

export function SubtitleOverlay({
  cue,
  style,
  playheadSec,
}: {
  cue?: SubtitleCue;
  style: SubtitleStyle;
  playheadSec: number;
}) {
  if (!cue?.text.trim()) return null;

  const duration = Math.max(0.1, cue.endSec - cue.startSec);
  const karaokeProgress = style.animation === 'karaoke'
    ? Math.min(100, Math.max(0, ((playheadSec - cue.startSec) / duration) * 100))
    : 100;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[10%] z-20 flex justify-center px-4">
      <p
        className="max-w-[92%] text-center font-semibold leading-snug"
        style={{
          fontFamily: style.font,
          fontSize: `${Math.max(14, style.size * 0.42)}px`,
          letterSpacing: `${style.tracking}px`,
          color: style.fill,
          WebkitTextStroke: `1px ${style.stroke}`,
          textShadow: style.shadow ? `0 2px 12px ${style.stroke}` : undefined,
          backgroundColor: `rgba(0,0,0,${style.backgroundOpacity / 100})`,
          padding: '0.35rem 0.75rem',
          borderRadius: '0.5rem',
          transform: style.animation === 'kinetic' ? 'translateY(-2px)' : undefined,
          backgroundImage: style.animation === 'karaoke'
            ? `linear-gradient(90deg, ${style.fill} ${karaokeProgress}%, rgba(255,255,255,0.35) ${karaokeProgress}%)`
            : undefined,
          WebkitBackgroundClip: style.animation === 'karaoke' ? 'text' : undefined,
        }}
      >
        {cue.text}
      </p>
    </div>
  );
}
