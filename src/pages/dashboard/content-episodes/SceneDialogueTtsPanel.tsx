import { Loader2, Plus, Trash2, Volume2 } from 'lucide-react';
import { Select } from '@/components/Select';
import { ProtectedStudioAudio } from './ProtectedStudioAudio';
import type { EpisodeSceneCard, ThemeCharacterMention } from './storyboard';
import { voiceProfileLabel } from './storyboard';
import type { CharacterTtsProfile } from './characterTts';
import { resolveLineTtsFromSpeaker } from './characterTts';
import {
  ensureSceneTtsLines,
  type EpisodeSceneTtsLine,
} from './sceneTts';
import { resolveTtsLineTone, tonePresetLabel, toneSummary, type EpisodeTtsTone } from './ttsTone';

const NARRATOR_SPEAKER = '';

export function SceneDialogueTtsPanel({
  scene,
  characters,
  characterProfiles,
  narratorVoice,
  narratorTone,
  audioModel,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
  onGenerateLine,
}: {
  scene: EpisodeSceneCard;
  characters: ThemeCharacterMention[];
  characterProfiles: Record<string, CharacterTtsProfile>;
  narratorVoice: string;
  narratorTone: EpisodeTtsTone;
  audioModel?: string;
  onUpdateLine: (lineId: string, patch: Partial<EpisodeSceneTtsLine>) => void;
  onAddLine: () => void;
  onRemoveLine: (lineId: string) => void;
  onGenerateLine: (lineId: string) => void;
}) {
  const lines = ensureSceneTtsLines(scene, narratorVoice);
  const speakerOptions = [
    { value: NARRATOR_SPEAKER, label: 'Narrator (episode default)' },
    ...characters.map((character) => ({ value: character.handle, label: `${character.handle} ┬╖ ${character.name}` })),
  ];

  return (
    <div className="mt-3 rounded-xl border border-border bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-dark">Dialogue &amp; narration (TTS)</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            Choose who speaks each line. Voice and tone come from that character&apos;s theme preset ΓÇö separate from visual character references used for video below.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddLine}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-muted-olive)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-ash-brown)]"
        >
          <Plus size={13} />
          Add line
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {lines.map((line, index) => {
          const resolved = resolveLineTtsFromSpeaker(line.speaker, characterProfiles, narratorVoice, narratorTone);
          const tone = resolveTtsLineTone(line, narratorTone, characterProfiles);
          const canGenerate = Boolean(audioModel && line.text.trim());
          const speakerLabel = line.speaker?.trim() || 'Narrator';
          return (
            <div key={line.id} className="rounded-xl border border-[var(--color-tea-green)]/60 bg-[var(--color-vanilla-cream)]/35 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Line {index + 1}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onGenerateLine(line.id)}
                    disabled={!canGenerate || line.status === 'generating'}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-muted-olive)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-ash-brown)] disabled:opacity-45"
                  >
                    {line.status === 'generating' ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />}
                    {line.status === 'ready' ? 'Replay' : 'Generate'}
                  </button>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveLine(line.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-semibold text-muted hover:text-red-600"
                      aria-label={`Remove dialogue line ${index + 1}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 grid gap-2 md:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1.2fr)]">
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Speaker</p>
                  <Select
                    aria-label={`Speaker for scene ${scene.sceneNumber} line ${index + 1}`}
                    value={line.speaker ?? NARRATOR_SPEAKER}
                    options={speakerOptions}
                    onChange={(value) => onUpdateLine(line.id, { speaker: value || undefined })}
                  />
                </div>
                <div className="rounded-lg border border-border bg-white px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Character delivery</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-dark">
                    {voiceProfileLabel(resolved.voiceProfile)}
                    {toneSummary(tone) ? ` ┬╖ ${toneSummary(tone)}` : ` ┬╖ ${tonePresetLabel(tone.preset)}`}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">From theme preset ΓÇö episode mood applies only to narrator lines.</p>
                </div>
              </div>

              <div className="mt-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Line text</p>
                <textarea
                  className="input-field min-h-20 text-xs"
                  value={line.text}
                  placeholder="What this character says in this beat."
                  onChange={(event) => onUpdateLine(line.id, { text: event.target.value })}
                />
              </div>

              <p className="mt-2 text-[10px] text-muted">
                {line.status === 'ready'
                  ? `Ready ┬╖ ${speakerLabel} ┬╖ ${voiceProfileLabel(resolved.voiceProfile)}${toneSummary(tone) ? ` ┬╖ ${toneSummary(tone)}` : ''}`
                  : `${speakerLabel} will use ${voiceProfileLabel(resolved.voiceProfile)}${toneSummary(tone) ? ` ┬╖ ${toneSummary(tone)}` : ''} when generated.`}
              </p>

              {line.audioUrl && line.status === 'ready' && (
                <div className="mt-2">
                  <ProtectedStudioAudio key={`${scene.id}-${line.id}-${line.audioUrl}`} originUrl={line.audioUrl} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
