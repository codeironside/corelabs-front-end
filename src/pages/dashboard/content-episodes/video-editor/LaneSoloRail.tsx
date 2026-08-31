import type { AudioSoloTarget } from './types';

export function LaneSoloRail({
  laneCount,
  track,
  solo,
  onSoloChange,
}: {
  laneCount: number;
  track: 'tts' | 'music-sfx';
  solo: AudioSoloTarget;
  onSoloChange: (solo: AudioSoloTarget) => void;
}) {
  if (laneCount <= 0) return null;

  return (
    <div className="absolute left-0 top-0 z-30 flex flex-col gap-1 py-1">
      {Array.from({ length: laneCount }, (_, lane) => {
        const active = solo?.track === track && solo.lane === lane;
        return (
          <button
            key={`${track}-solo-${lane}`}
            type="button"
            title={active ? 'Clear solo' : `Solo lane ${lane + 1}`}
            onClick={() => onSoloChange(active ? null : { track, lane })}
            style={{ top: lane * 38 + 4 }}
            className={`absolute left-0 h-7 w-7 rounded-md text-[9px] font-bold shadow-sm ring-1 ${active ? 'bg-[var(--color-faded-copper)] text-white ring-[var(--color-faded-copper)]' : 'bg-white text-[var(--color-ash-brown)] ring-border hover:bg-[var(--color-tea-green)]/50'}`}
          >
            S{lane + 1}
          </button>
        );
      })}
    </div>
  );
}
