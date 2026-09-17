import { Loader2, Volume2 } from 'lucide-react';
import {
  TTS_TONE_DIRECTION_MAX_LENGTH,
  tonePresetLabel,
  toneSummary,
} from '../content-episodes/ttsTone';
import { themeCharacterTtsProfile } from '../content-episodes/characterTts';

export type ThemeCharacterTtsFields = {
  id: string;
  name: string;
  handle: string;
  ttsVoiceProfile?: string;
  ttsTonePreset?: string;
  ttsToneDirection?: string;
  ttsPacePreset?: string;
  ttsPitchPercent?: number | string;
  /** Free-text pitch description from the creator (not a preset slug). */
  ttsPitchDescription?: string;
  ttsTestPhrase?: string;
};

const TONE_DESC_MAX = 120;
const PACE_DESC_MAX = 80;
const PITCH_DESC_MAX = 80;

export function ThemeCharacterTtsPreview({
  character,
  characterIndex,
  audioModel,
  onUpdateCharacter,
  onPreview,
  previewPending,
}: {
  character: ThemeCharacterTtsFields;
  characterIndex: number;
  audioModel: string;
  onUpdateCharacter: (
    id: string,
    key:
      | 'ttsVoiceProfile'
      | 'ttsTonePreset'
      | 'ttsToneDirection'
      | 'ttsPacePreset'
      | 'ttsPitchPercent'
      | 'ttsPitchDescription'
      | 'ttsTestPhrase',
    value: string,
  ) => void;
  onPreview: (characterId: string) => void;
  previewPending: boolean;
}) {
  const profile = themeCharacterTtsProfile(character, characterIndex, '');
  const testPhrase = character.ttsTestPhrase?.trim() || `Hi, I'm ${character.name.trim() || 'this character'}. This is how I sound.`;
  const canPreview = Boolean(audioModel && testPhrase && profile.voiceProfile.trim());
  const deliverySummary = toneSummary(profile.tone) ?? tonePresetLabel(profile.tone.preset);

  return (
    <div className="rounded-xl border border-[var(--color-tea-green)]/50 bg-[var(--color-vanilla-cream)]/20 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">This character&apos;s TTS voice &amp; delivery</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        Describe how this character should sound in your own words. Episodes inherit these when the character speaks.
      </p>
      <div className="mt-2 grid gap-2">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Voice</p>
          <textarea
            className="input-field min-h-16 text-sm"
            aria-label={`Theme TTS voice description for ${character.name || 'character'}`}
            value={character.ttsVoiceProfile ?? ''}
            maxLength={120}
            placeholder="Describe the voice — e.g. warm young Nigerian woman, deep calm male narrator, bright teenage storyteller"
            onChange={(event) => {
              onUpdateCharacter(character.id, 'ttsVoiceProfile', event.target.value.slice(0, 120));
            }}
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Tone</p>
          <textarea
            className="input-field min-h-16 text-sm"
            aria-label={`Theme TTS tone description for ${character.name || 'character'}`}
            value={character.ttsTonePreset ?? ''}
            maxLength={TONE_DESC_MAX}
            placeholder="Describe the tone — e.g. warm and wry, cold news anchor, soft and intimate"
            onChange={(event) => {
              onUpdateCharacter(character.id, 'ttsTonePreset', event.target.value.slice(0, TONE_DESC_MAX));
            }}
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Pace</p>
          <textarea
            className="input-field min-h-16 text-sm"
            aria-label={`Theme TTS pace description for ${character.name || 'character'}`}
            value={character.ttsPacePreset ?? ''}
            maxLength={PACE_DESC_MAX}
            placeholder="Describe the pace — e.g. slow with long pauses, rapid and breathless, steady mid-tempo"
            onChange={(event) => {
              onUpdateCharacter(character.id, 'ttsPacePreset', event.target.value.slice(0, PACE_DESC_MAX));
            }}
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Pitch</p>
          <textarea
            className="input-field min-h-16 text-sm"
            aria-label={`Theme TTS pitch description for ${character.name || 'character'}`}
            value={character.ttsPitchDescription ?? ''}
            maxLength={PITCH_DESC_MAX}
            placeholder="Describe the pitch — e.g. deeper than average, bright and high, slightly lower"
            onChange={(event) => {
              onUpdateCharacter(character.id, 'ttsPitchDescription', event.target.value.slice(0, PITCH_DESC_MAX));
            }}
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Extra delivery notes (optional)</p>
          <input
            className="input-field text-sm"
            value={character.ttsToneDirection || ''}
            maxLength={TTS_TONE_DIRECTION_MAX_LENGTH}
            onChange={(e) => onUpdateCharacter(character.id, 'ttsToneDirection', e.target.value.slice(0, TTS_TONE_DIRECTION_MAX_LENGTH))}
            placeholder="Anything else — accent hints, breathiness, attitude"
          />
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-border bg-white p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Test phrase</p>
        <p className="mt-0.5 text-[11px] text-muted">
          Preview this character&apos;s voice before saving the theme. Uses {deliverySummary}.
        </p>
        <textarea
          className="input-field mt-2 min-h-16 text-xs"
          value={character.ttsTestPhrase ?? ''}
          placeholder={testPhrase}
          onChange={(e) => onUpdateCharacter(character.id, 'ttsTestPhrase', e.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPreview(character.id)}
            disabled={!canPreview || previewPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-muted-olive)] px-3 py-2 text-[11px] font-semibold text-[var(--color-ash-brown)] disabled:opacity-45"
          >
            {previewPending ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />}
            {previewPending ? 'Generating...' : 'Preview voice'}
          </button>
          <span className="text-[10px] text-muted">TTS model is routed automatically.</span>
        </div>
      </div>
    </div>
  );
}
