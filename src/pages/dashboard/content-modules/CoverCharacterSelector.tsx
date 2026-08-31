import { Check, UserRound } from 'lucide-react';
import { ProtectedStudioImage } from '@/pages/dashboard/content-episodes/ProtectedStudioImage';
import type {
  ThemeCharacterMention,
  ThemeCharacterReference,
} from '../content-episodes/storyboard';

interface CoverCharacterSelectorProps {
  characters: ThemeCharacterMention[];
  references: ThemeCharacterReference[];
  selectedHandles: string[];
  onChange: (handles: string[]) => void;
}

interface CoverCharacterCard {
  id: string;
  handle: string;
  name: string;
  imageUrl?: string;
  variantCount: number;
}

function characterCards(
  characters: ThemeCharacterMention[],
  references: ThemeCharacterReference[],
): CoverCharacterCard[] {
  return characters.map((character) => {
    const characterRefs = references.filter((reference) => reference.handle === character.handle);
    return {
      id: character.id,
      handle: character.handle,
      name: character.name,
      imageUrl: characterRefs[0]?.url,
      variantCount: characterRefs.length,
    };
  });
}

function toggleHandle(selectedHandles: string[], handle: string): string[] {
  if (selectedHandles.includes(handle)) {
    return selectedHandles.filter((item) => item !== handle);
  }
  return [...selectedHandles, handle];
}

export function selectedCoverCharacterPrompt(handles: string[]): string {
  if (!handles.length) return '';
  return `Selected theme cover characters: ${handles.join(' ')}`;
}

export function CoverCharacterSelector({
  characters,
  references,
  selectedHandles,
  onChange,
}: CoverCharacterSelectorProps) {
  const cards = characterCards(characters, references);

  if (!cards.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-white p-4">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-[var(--color-tea-green)]/25 p-2 text-[var(--color-ash-brown)]">
            <UserRound size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-dark">No theme characters available</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Link a theme with saved characters to select visual references for module cover media.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-dark">Theme character references</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Select characters to anchor this module cover image or video.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={!selectedHandles.length}
          className="w-fit rounded-lg border border-border px-3 py-2 text-xs font-semibold text-dark disabled:opacity-45"
        >
          Use full roster
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((character) => {
          const selected = selectedHandles.includes(character.handle);
          return (
            <button
              key={character.handle}
              type="button"
              onClick={() => onChange(toggleHandle(selectedHandles, character.handle))}
              className={`flex min-h-24 items-center gap-3 rounded-xl border p-3 text-left transition ${
                selected
                  ? 'border-[var(--color-muted-olive)] bg-[var(--color-tea-green)]/25'
                  : 'border-border bg-white hover:border-[var(--color-tea-green)]'
              }`}
            >
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-[var(--color-tea-green)]/20">
                {character.imageUrl ? (
                  <ProtectedStudioImage
                    originUrl={character.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[var(--color-ash-brown)]">
                    <UserRound size={20} />
                  </span>
                )}
                {selected && (
                  <span className="absolute right-1 top-1 rounded-full bg-[var(--color-muted-olive)] p-1 text-[var(--color-vanilla-cream)]">
                    <Check size={10} />
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-dark">{character.name}</span>
                <span className="mt-0.5 block text-xs font-semibold text-[var(--color-ash-brown)]">{character.handle}</span>
                <span className="mt-1 block text-[11px] text-muted">
                  {character.variantCount ? `${character.variantCount} saved visual variant${character.variantCount === 1 ? '' : 's'}` : 'No saved image variants yet'}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
