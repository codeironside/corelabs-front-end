import type { ThemeCharacterMention } from './storyboard';
import { voiceProfileLabel } from './storyboard';
import type { CharacterTtsProfile } from './characterTts';
import { characterHandleKey } from './characterTts';
import { tonePresetLabel, pacePresetLabel, formatPitchPercent } from './ttsTone';

export function ThemeCharacterTtsSummary({
  characters,
  profiles,
}: {
  characters: ThemeCharacterMention[];
  profiles: Record<string, CharacterTtsProfile>;
}) {
  if (characters.length === 0) {
    return (
      <p className="text-xs text-muted">Add characters in the linked theme to give each one their own TTS actor and tone preset.</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-relaxed text-muted">
        These presets are for dialogue TTS only. Visual references for video generation are chosen separately per scene.
      </p>
      <div className="space-y-2">
        {characters.map((character) => {
          const profile = profiles[characterHandleKey(character.handle)];
          return (
            <div key={character.id} className="rounded-xl border border-[var(--color-tea-green)]/60 bg-[var(--color-vanilla-cream)]/25 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-dark">{character.handle}</p>
                  <p className="text-[11px] text-muted">{character.name}</p>
                </div>
                <p className="text-[10px] font-semibold text-[var(--color-ash-brown)]">
                  {voiceProfileLabel(profile?.voiceProfile)}
                  {' ┬╖ '}
                  {tonePresetLabel(profile?.tonePreset)}
                  {profile?.pacePreset && profile.pacePreset !== 'normal' ? ` ┬╖ ${pacePresetLabel(profile.pacePreset)}` : ''}
                  {profile?.pitchPercent && profile.pitchPercent !== 0 ? ` ┬╖ ${formatPitchPercent(profile.pitchPercent)}` : ''}
                  {profile?.toneDirection ? ` ┬╖ ${profile.toneDirection}` : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
