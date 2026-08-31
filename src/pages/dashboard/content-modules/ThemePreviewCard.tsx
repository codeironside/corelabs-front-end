import { BookOpen, ImageIcon, Sparkles, UserRound } from 'lucide-react';
import type { ContentTheme, ReferenceImage } from '@/api/content';
import { ProtectedStudioImage } from '@/pages/dashboard/content-episodes/ProtectedStudioImage';
import { parseThemeCharacterMentions, parseThemeCharacterReferences } from '../content-episodes/storyboard';
import { sanitizeThemeCoreRules } from './moduleUtils';

function referenceImageUrl(image: ReferenceImage): string | undefined {
  return image.cloudinaryUrl || image.s3Url;
}

export function ThemePreviewCard({ theme }: { theme?: ContentTheme }) {
  if (!theme) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-white p-5 text-center">
        <BookOpen size={24} className="mx-auto text-[var(--color-ash-brown)]" />
        <p className="mt-2 text-sm font-semibold text-dark">Select a theme to preview inheritance</p>
        <p className="mt-1 text-xs text-muted">Tone, core rules, and global references will appear here.</p>
      </div>
    );
  }

  const imageRefs = (theme.referenceImages ?? []).filter(referenceImageUrl);
  const characterRefs = parseThemeCharacterReferences(theme);
  const characters = parseThemeCharacterMentions(theme);

  return (
    <div className="rounded-xl border border-[var(--color-tea-green)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-dark">{theme.title}</p>
          <p className="text-xs text-muted">/{theme.slug} by {theme.authorName}</p>
        </div>
        <span className="rounded-full bg-[var(--color-tea-green)]/45 px-3 py-1 text-[10px] font-semibold text-[var(--color-ash-brown)]">
          {imageRefs.length + characterRefs.length} refs
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted">Tone / Genre</p>
          <p className="mt-1 text-xs font-semibold text-dark">{theme.defaultGenre || 'Not set'}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted">Global Image References</p>
          <p className="mt-1 text-xs font-semibold text-dark">{imageRefs.length} uploaded</p>
        </div>
        <div className="rounded-lg border border-border p-3 sm:col-span-2">
          <p className="text-[10px] uppercase tracking-wider text-muted">Character Roster</p>
          <p className="mt-1 text-xs font-semibold text-dark">{characters.length} theme characters, {characterRefs.length} saved variants</p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-[var(--color-tea-green)] bg-[var(--color-tea-green)]/15 p-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[var(--color-muted-olive)]" />
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-ash-brown)]">Core Rules</p>
        </div>
        <div className="mt-2 max-h-36 overflow-y-auto rounded-lg bg-white p-3">
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted">
            {sanitizeThemeCoreRules(theme)}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-border p-3">
        <div className="mb-2 flex items-center gap-2">
          <UserRound size={14} className="text-[var(--color-ash-brown)]" />
          <p className="text-[10px] uppercase tracking-wider text-muted">Theme Character Cast</p>
        </div>
        {characters.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {characters.map((character) => (
                <span key={character.id} className="rounded-full bg-[var(--color-tea-green)]/35 px-3 py-1 text-[11px] font-semibold text-[var(--color-ash-brown)]">
                  {character.handle} <span className="font-medium text-muted">{character.name}</span>
                </span>
              ))}
            </div>
            {characterRefs.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {characterRefs.slice(0, 6).map((reference) => (
                  <div key={reference.id} className="overflow-hidden rounded-lg border border-border bg-white">
                    <div className="aspect-square bg-white">
                      <ProtectedStudioImage
                        originUrl={reference.url}
                        alt={`${reference.handle} reference`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="border-t border-border px-2 py-1">
                      <p className="truncate text-[10px] font-semibold text-dark">{reference.handle}</p>
                      <p className="truncate text-[9px] text-muted">{reference.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted">No theme characters saved yet.</p>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-border p-3">
        <div className="mb-2 flex items-center gap-2">
          <ImageIcon size={14} className="text-[var(--color-ash-brown)]" />
          <p className="text-[10px] uppercase tracking-wider text-muted">Visual References</p>
        </div>
        {imageRefs.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {imageRefs.slice(0, 6).map((image, index) => (
              <div key={`${referenceImageUrl(image)}-${index}`} className="aspect-square overflow-hidden rounded-lg border border-border bg-white">
                <ProtectedStudioImage
                  originUrl={referenceImageUrl(image)}
                  alt={`Theme reference ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted">No global image references uploaded.</p>
        )}
      </div>
    </div>
  );
}
