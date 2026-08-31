import { Loader2, Volume2 } from 'lucide-react';
import { Select } from '@/components/Select';
import type { AvailableAiModels } from '@/api/content';
import { TtsVoiceSelect } from '../content-episodes/TtsVoiceSelect';
import {
  formatPitchPercent,
  normalizePitchPercent,
  TTS_PACE_PRESETS,
  TTS_TONE_DIRECTION_MAX_LENGTH,
  TTS_TONE_PRESETS,
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
  ttsTestPhrase?: string;
};

export function ThemeCharacterTtsPreview({
  character,
  characterIndex,
  audioModels,
  audioModel,
  onAudioModelChange,
  onUpdateCharacter,
  onPreview,
  previewPending,
}: {
  character: ThemeCharacterTtsFields;
  characterIndex: number;
  audioModels: AvailableAiModels['audio'];
  audioModel: string;
  onAudioModelChange: (value: string) => void;
  onUpdateCharacter: (
    id: string,
    key: 'ttsVoiceProfile' | 'ttsTonePreset' | 'ttsToneDirection' | 'ttsPacePreset' | 'ttsPitchPercent' | 'ttsTestPhrase',
    value: string,
  ) => void;
  onPreview: (characterId: string) => void;
  previewPending: boolean;
}) {
  const profile = themeCharacterTtsProfile(character, characterIndex, '');
  const testPhrase = character.ttsTestPhrase?.trim() || `Hi, I'm ${character.name.trim() || 'this character'}. This is how I sound.`;
  const canPreview = Boolean(audioModel && testPhrase && profile.voiceProfile.trim());
  const deliverySummary = toneSummary(profile.tone) ?? tonePresetLabel(profile.tone.preset);
  const pitchPercent = normalizePitchPercent(character.ttsPitchPercent);

  return (
    <div className="rounded-xl border border-[var(--color-tea-green)]/50 bg-[var(--color-vanilla-cream)]/20 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">This character&apos;s TTS voice &amp; tone</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        Lock each character&apos;s delivery here ΓÇö voice, tone, pace, pitch (%), and direction notes.
        Episodes pick this character as a dialogue speaker and inherit these settings.
      </p>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <TtsVoiceSelect
          label="Voice"
          ariaLabel={`Theme TTS voice for ${character.name || 'character'}`}
          value={character.ttsVoiceProfile ?? ''}
          onChange={(next) => onUpdateCharacter(character.id, 'ttsVoiceProfile', next)}
        />
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Tone preset</p>
          <Select
            aria-label={`Theme TTS tone for ${character.name || 'character'}`}
            value={character.ttsTonePreset ?? ''}
            options={[{ value: '', label: 'Select tone preset' }, ...TTS_TONE_PRESETS]}
            onChange={(value) => onUpdateCharacter(character.id, 'ttsTonePreset', value)}
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Pace</p>
          <Select
            aria-label={`Theme TTS pace for ${character.name || 'character'}`}
            value={character.ttsPacePreset ?? ''}
            options={[{ value: '', label: 'Select pace' }, ...TTS_PACE_PRESETS]}
            onChange={(value) => onUpdateCharacter(character.id, 'ttsPacePreset', value)}
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Pitch (%)</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={-100}
              max={100}
              step={5}
              className="input-field text-sm"
              aria-label={`Theme TTS pitch percent for ${character.name || 'character'}`}
              value={pitchPercent}
              onChange={(event) => {
                const next = normalizePitchPercent(event.target.value);
                onUpdateCharacter(character.id, 'ttsPitchPercent', String(next));
              }}
            />
            <span className="text-xs font-semibold text-muted">{formatPitchPercent(pitchPercent)}</span>
          </div>
          <p className="mt-1 text-[10px] text-muted">0% is neutral. Negative lowers pitch, positive raises it.</p>
        </div>
      </div>
      <input
        className="input-field mt-2 text-sm"
        value={character.ttsToneDirection || ''}
        maxLength={TTS_TONE_DIRECTION_MAX_LENGTH}
        onChange={(e) => onUpdateCharacter(character.id, 'ttsToneDirection', e.target.value.slice(0, TTS_TONE_DIRECTION_MAX_LENGTH))}
        placeholder="Delivery notes, e.g. aggressive, raspy, fast-talking"
      />
      <p className="mt-1 text-[10px] text-muted">Notes for your team ΓÇö not spoken aloud. Tone, pace, and pitch presets shape the voice instead.</p>
      <div className="mt-3 rounded-lg border border-border bg-white p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Test phrase</p>
        <p className="mt-0.5 text-[11px] text-muted">
          Preview this character&apos;s preset before saving the theme. Uses {deliverySummary}.
        </p>
        <textarea
          className="input-field mt-2 min-h-16 text-xs"
          value={character.ttsTestPhrase ?? ''}
          placeholder={testPhrase}
          onChange={(e) => onUpdateCharacter(character.id, 'ttsTestPhrase', e.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            className="input-field min-w-40 flex-1 text-xs"
            value={audioModel}
            onChange={(e) => onAudioModelChange(e.target.value)}
            disabled={audioModels.length === 0}
          >
            <option value="">{audioModels.length === 0 ? 'No TTS models available' : 'Select TTS model'}</option>
            {audioModels.map((model) => (
              <option key={model.value} value={model.value}>
                {model.providerLabel} {model.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onPreview(character.id)}
            disabled={!canPreview || previewPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-muted-olive)] px-3 py-2 text-[11px] font-semibold text-[var(--color-ash-brown)] disabled:opacity-45"
          >
            {previewPending ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />}
            {previewPending ? 'Generating...' : 'Preview voice'}
          </button>
        </div>
      </div>
    </div>
  );
}
