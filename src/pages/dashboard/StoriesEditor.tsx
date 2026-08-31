import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import {
  listEditorStories,
  createEditorStory,
  updateEditorStory,
  uploadStoryFirstAd,
  uploadStoryCover,
  deleteEditorStory,
  getStoryAnalytics,
  listContentModules,
  type EditorStory,
  type ContentModule,
} from '@/api/content';
import { moduleThumbPreview } from '@/lib/moduleCover';
import { BarChart3, Trash2, Upload, PlayCircle, X, ImageIcon, Plus, Video, ChevronUp, ChevronDown } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import toast from 'react-hot-toast';

/** Matches backend slug: ^[a-z0-9]+(?:-[a-z0-9]+)*$ */
function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}


export function StoriesEditor() {
  const qc = useQueryClient();
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [aiStoryPrompt, setAiStoryPrompt] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [noIndex, setNoIndex] = useState(false);
  const [coverVideoUrl, setCoverVideoUrl] = useState('');
  const [draftIntroModuleId, setDraftIntroModuleId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['content', 'stories'],
    queryFn: listEditorStories,
  });

  const { data: studioModules = [] } = useQuery({
    queryKey: ['content', 'modules'],
    queryFn: listContentModules,
  });

  const { data: analytics } = useQuery({
    queryKey: ['content', 'story-analytics', selectedStoryId],
    queryFn: () => getStoryAnalytics(selectedStoryId!),
    enabled: Boolean(selectedStoryId),
  });

  const effectiveSlug = slug.trim() ? slugify(slug) : slugify(title);

  const validateCreateDraft = (): string | null => {
    if (!title.trim()) return 'Title is required.';
    if (!summary.trim()) return 'Public summary is required.';
    if (!effectiveSlug) return 'Could not build a valid URL slug ΓÇö use letters and numbers in the title.';
    return null;
  };

  const loadStoryIntoForm = (s: EditorStory) => {
    setSelectedStoryId(s._id);
    setTitle(s.title);
    setSlug(s.slug);
    setSummary(s.summary);
    setAuthorName(s.authorName ?? '');
    setAiStoryPrompt(s.aiStoryPrompt ?? '');
    setSeoTitle(s.seoTitle ?? '');
    setSeoDescription(s.seoDescription ?? '');
    setNoIndex(Boolean(s.noIndex));
    setCoverVideoUrl(s.coverVideoUrl ?? '');
    setDraftIntroModuleId(null);
  };

  const clearSelection = useCallback(() => {
    setSelectedStoryId(null);
    setTitle('');
    setSlug('');
    setSummary('');
    setAuthorName('');
    setAiStoryPrompt('');
    setSeoTitle('');
    setSeoDescription('');
    setNoIndex(false);
    setCoverVideoUrl('');
    setDraftIntroModuleId(null);
  }, []);

  const applyStudioModule = (m: ContentModule) => {
    if (selectedStoryId) {
      const next = {
        firstVideoModuleId: m._id,
        aiStoryPrompt: aiStoryPrompt.trim() || m.creativePrompt || undefined,
        authorName: authorName.trim() || undefined,
      };
      if (!title.trim()) setTitle(m.title);
      if (!summary.trim()) setSummary(m.creativePrompt.slice(0, 500) || m.title);
      if (!aiStoryPrompt.trim()) setAiStoryPrompt(m.creativePrompt);
      updateEditorStory(selectedStoryId, next)
        .then(() => {
          toast.success('Story updated with this module as intro video.');
          qc.invalidateQueries({ queryKey: ['content', 'stories'] });
        })
        .catch(() => toast.error('Could not link module.'));
      return;
    }
    setDraftIntroModuleId(m._id);
    if (!title.trim()) setTitle(m.title);
    if (!summary.trim()) setSummary(m.creativePrompt.slice(0, 500) || m.title);
    if (!aiStoryPrompt.trim()) setAiStoryPrompt(m.creativePrompt);
    toast.success('Intro module selected ΓÇö save when you create the draft.');
  };

  const coverUploadMut = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadStoryCover(id, file),
    onSuccess: () => {
      toast.success('Cover image uploaded.');
      qc.invalidateQueries({ queryKey: ['content', 'stories'] });
    },
    onError: () => toast.error('Cover upload failed.'),
  });

  useEffect(() => {
    if (!selectedStoryId) return;
    const stillThere = stories.some((s) => s._id === selectedStoryId);
    if (!stillThere) clearSelection();
  }, [selectedStoryId, stories, clearSelection]);

  const createMut = useMutation({
    mutationFn: () =>
      createEditorStory({
        title: title.trim(),
        slug: effectiveSlug,
        summary: summary.trim(),
        authorName: authorName.trim() || undefined,
        aiStoryPrompt: aiStoryPrompt.trim() || undefined,
        published: false,
        sortOrder: stories.length,
        firstVideoModuleId: draftIntroModuleId ?? undefined,
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        noIndex,
        coverVideoUrl: coverVideoUrl.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Story draft created.');
      clearSelection();
      qc.invalidateQueries({ queryKey: ['content', 'stories'] });
    },
    onError: (err: unknown) => {
      const msg =
        isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
          ? (err.response.data as { message?: string }).message
          : undefined;
      toast.error(msg ?? 'Could not create story.');
    },
  });

  const saveDetailsMut = useMutation({
    mutationFn: () => {
      if (!selectedStoryId) throw new Error('No story');
      const nextSlug = slug.trim() ? slugify(slug) : slugify(title);
      if (!nextSlug) throw new Error('Invalid slug');
      return updateEditorStory(selectedStoryId, {
        title: title.trim(),
        slug: nextSlug,
        summary: summary.trim(),
        authorName: authorName.trim() || undefined,
        aiStoryPrompt: aiStoryPrompt.trim() || undefined,
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        noIndex,
        coverVideoUrl: coverVideoUrl.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Story details saved.');
      qc.invalidateQueries({ queryKey: ['content', 'stories'] });
      qc.invalidateQueries({ queryKey: ['content', 'story-analytics'] });
    },
    onError: (err: unknown) => {
      const msg =
        isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
          ? (err.response.data as { message?: string }).message
          : undefined;
      toast.error(msg ?? 'Could not save story.');
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => {
      if (!selectedStoryId) throw new Error('No story');
      return deleteEditorStory(selectedStoryId);
    },
    onSuccess: () => {
      toast.success('Story deleted.');
      clearSelection();
      qc.invalidateQueries({ queryKey: ['content', 'stories'] });
    },
    onError: () => toast.error('Could not delete story.'),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-serif text-dark">Stories & playlists</h1>
        <p className="text-sm text-muted mt-1">
          Wire public story pages to studio modules. Create playlists, generate video, and publish from the{' '}
          <span className="text-dark font-medium">Studio & modules</span> tab.{' '}
          <Link to="/stories" className="text-[var(--color-ash-brown)] hover:underline">
            Public page
          </Link>
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-2">
          <h2 className="text-sm font-semibold text-dark">Studio videos (episodes)</h2>
          <p className="text-xs text-muted mt-1 mb-3">
            Click a module to use it as the intro video and pre-fill story fields (no redirect). Playlist order is edited in each story below.
          </p>
          {studioModules.length === 0 ? (
            <p className="text-xs text-muted pb-3">No modules yet ΓÇö create them in the Studio tab.</p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-4">
              {studioModules.map((m: ContentModule) => {
                const th = moduleThumbPreview(m);
                return (
                  <li key={m._id}>
                    <button
                      type="button"
                      onClick={() => applyStudioModule(m)}
                      className="w-full text-left rounded-xl border border-border overflow-hidden bg-white hover:border-[var(--color-muted-olive)] transition-colors"
                    >
                      <div className="aspect-video bg-black/80">
                        {th?.kind === 'image' ? (
                          <img src={th.url} alt="" className="h-full w-full object-cover" />
                        ) : th?.kind === 'video' ? (
                          <video src={th.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-border/40" />
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-dark px-2 py-2 line-clamp-2 leading-snug">{m.title}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="relative aspect-[2/1] max-h-[200px] overflow-hidden bg-[var(--color-ash-brown)] border-t border-border">
          <video
            className="h-full w-full object-cover opacity-90"
            src="https://videos.pexels.com/video-files/855282/855282-hd_1920_1080_25fps.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ash-brown)]/85 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                {selectedStoryId ? 'Edit story' : 'New story'}
              </p>
              <p className="font-serif text-xl text-white drop-shadow">
                {selectedStoryId ? 'Update copy, slug, and SEO' : 'Wire episodes into a public story or playlist'}
              </p>
            </div>
            {selectedStoryId && (
              <button
                type="button"
                onClick={clearSelection}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 text-xs text-white hover:bg-white/25"
              >
                <X size={14} /> New story instead
              </button>
            )}
          </div>
        </div>
        <div className="p-5 space-y-3">
          <input className="input-field w-full text-sm" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div>
            <input
              className="input-field w-full text-sm"
              placeholder="URL slug (optional ΓÇö generated from title if empty)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <p className="text-[10px] text-muted mt-1">
              Preview: <span className="font-mono text-dark">/{effectiveSlug || 'ΓÇª'}</span>
            </p>
          </div>
          <input className="input-field w-full text-sm" placeholder="Author name (on website)" value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted">Storyline / prompt for AI</label>
            <textarea
              className="input-field w-full text-sm min-h-[100px] mt-1"
              placeholder="What should episodes explore? Editors refine per clip in the studio module."
              value={aiStoryPrompt}
              onChange={(e) => setAiStoryPrompt(e.target.value)}
            />
          </div>
          <textarea className="input-field w-full text-sm min-h-[80px]" placeholder="Public summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
          <div className="pt-2 border-t border-border/80 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted">SEO (public page)</p>
            <input
              className="input-field w-full text-sm"
              placeholder="SEO title (optional ΓÇö defaults to story title)"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
            />
            <textarea
              className="input-field w-full text-sm min-h-[64px]"
              placeholder="Meta description (optional)"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
            />
            <label className="flex items-center gap-2 text-xs text-dark cursor-pointer">
              <input type="checkbox" checked={noIndex} onChange={(e) => setNoIndex(e.target.checked)} />
              Hide from search engines (noindex)
            </label>
          </div>
          <div className="pt-2 border-t border-border/80 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted">Story cover (public cards)</p>
            {selectedStoryId ? (
              <label className="inline-flex items-center gap-2 text-xs cursor-pointer border border-border rounded-lg px-3 py-2 hover:bg-white">
                <ImageIcon size={14} />
                Upload cover image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && selectedStoryId) coverUploadMut.mutate({ id: selectedStoryId, file: f });
                    e.target.value = '';
                  }}
                />
              </label>
            ) : (
              <p className="text-xs text-muted">Save a draft first, then upload a cover image.</p>
            )}
            <input
              className="input-field w-full text-sm"
              placeholder="Cover video URL (optional ΓÇö e.g. looping preview)"
              value={coverVideoUrl}
              onChange={(e) => setCoverVideoUrl(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {selectedStoryId ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const err = validateCreateDraft();
                    if (err) {
                      toast.error(err);
                      return;
                    }
                    saveDetailsMut.mutate();
                  }}
                  disabled={saveDetailsMut.isPending}
                  className="btn-accent text-sm px-4 py-2 rounded-xl"
                >
                  {saveDetailsMut.isPending ? 'SavingΓÇª' : 'Save story details'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={deleteMut.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-2 hover:bg-red-100"
                >
                  <Trash2 size={16} /> Delete
                </button>
                <ConfirmModal
                  open={deleteConfirmOpen}
                  title="Delete story"
                  message="This will permanently remove the story and all its bookmarks, comments, and reactions. This cannot be undone."
                  confirmLabel="Delete story"
                  onConfirm={() => {
                    setDeleteConfirmOpen(false);
                    deleteMut.mutate();
                  }}
                  onCancel={() => setDeleteConfirmOpen(false)}
                />
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const err = validateCreateDraft();
                  if (err) {
                    toast.error(err);
                    return;
                  }
                  createMut.mutate();
                }}
                disabled={createMut.isPending}
                className="btn-accent text-sm px-4 py-2 rounded-xl"
              >
                {createMut.isPending ? 'CreatingΓÇª' : 'Create draft'}
              </button>
            )}
          </div>
          {selectedStoryId && analytics && (
            <div className="rounded-2xl border border-[var(--color-tea-green)] bg-white p-5 mt-3 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-dark flex items-center gap-2">
                  <BarChart3 size={18} className="text-[var(--color-ash-brown)]" /> Live analytics
                </p>
                <Link
                  to={`/stories/${stories.find((s) => s._id === selectedStoryId)?.slug ?? ''}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-[var(--color-ash-brown)] hover:underline"
                >
                  View public page ΓåÆ
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Page views', value: analytics.viewCount, color: 'text-[var(--color-ash-brown)]' },
                  { label: 'Bookmarks', value: analytics.bookmarks, color: 'text-[var(--color-blue-slate)]' },
                  { label: 'Comments', value: analytics.comments, color: 'text-[var(--color-deep-space)]' },
                  { label: 'Reactions', value: analytics.reactions, color: 'text-amber-600' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-white border border-border/60 p-3 text-center">
                    <p className={`text-2xl font-bold ${stat.color} tabular-nums`}>{stat.value.toLocaleString()}</p>
                    <p className="text-[10px] text-muted mt-0.5 uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>
              {analytics.reactionByEmoji.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {analytics.reactionByEmoji.map((r) => (
                    <span key={r.emoji} className="inline-flex items-center gap-1 rounded-full bg-white border border-border/60 px-2.5 py-1 text-xs">
                      {r.emoji} <span className="font-medium text-dark">{r.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card-white border border-border">
        <h2 className="text-sm font-semibold text-dark mb-4">Stories</h2>
        <p className="text-xs text-muted mb-3">Select a story to load title, slug, summary, and SEO into the form above.</p>
        {isLoading ? (
          <p className="text-sm text-muted">LoadingΓÇª</p>
        ) : stories.length === 0 ? (
          <p className="text-sm text-muted">No stories yet.</p>
        ) : (
          <ul className="space-y-6">
            {stories.map((s: EditorStory) => (
              <StoryPlaylistRow
                key={s._id}
                story={s}
                allStories={stories}
                studioModules={studioModules}
                isSelected={selectedStoryId === s._id}
                onSelect={() => loadStoryIntoForm(s)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StoryPlaylistRow({
  story: s,
  allStories,
  studioModules,
  isSelected,
  onSelect,
}: {
  story: EditorStory;
  allStories: EditorStory[];
  studioModules: ContentModule[];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const qc = useQueryClient();
  const [authorName, setAuthorName] = useState(s.authorName ?? '');
  const [introId, setIntroId] = useState(s.firstVideoModuleId ?? '');
  const [playlistIds, setPlaylistIds] = useState<string[]>(s.playlistModuleIds ?? []);
  const [limit, setLimit] = useState(String(s.websiteEpisodeLimit ?? 3));
  const [yt, setYt] = useState(s.youtubePlaylistUrl ?? '');
  const [aiStoryPrompt, setAiStoryPrompt] = useState(s.aiStoryPrompt ?? '');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setAuthorName(s.authorName ?? '');
    setIntroId(s.firstVideoModuleId ?? '');
    setPlaylistIds(s.playlistModuleIds ?? []);
    setLimit(String(s.websiteEpisodeLimit ?? 3));
    setYt(s.youtubePlaylistUrl ?? '');
    setAiStoryPrompt(s.aiStoryPrompt ?? '');
  }, [
    s._id,
    s.authorName,
    s.firstVideoModuleId,
    s.playlistModuleIds,
    s.websiteEpisodeLimit,
    s.youtubePlaylistUrl,
    s.aiStoryPrompt,
  ]);

  const togglePub = useMutation({
    mutationFn: (published: boolean) => updateEditorStory(s._id, { published }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content', 'stories'] }),
  });

  const uploadAd = useMutation({
    mutationFn: (file: File) => uploadStoryFirstAd(s._id, file),
    onSuccess: () => {
      toast.success('Ad image uploaded.');
      qc.invalidateQueries({ queryKey: ['content', 'stories'] });
    },
    onError: () => toast.error('Upload failed.'),
  });

  const saveMut = useMutation({
    mutationFn: () =>
      updateEditorStory(s._id, {
        authorName: authorName.trim() || undefined,
        firstVideoModuleId: introId || null,
        playlistModuleIds: playlistIds,
        websiteEpisodeLimit: Math.min(20, Math.max(0, parseInt(limit, 10) || 0)),
        youtubePlaylistUrl: yt.trim() || undefined,
        aiStoryPrompt: aiStoryPrompt.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Saved.');
      qc.invalidateQueries({ queryKey: ['content', 'stories'] });
    },
    onError: () => toast.error('Save failed.'),
  });

  const usedElsewhere = new Set<string>();
  for (const st of allStories) {
    if (st._id === s._id) continue;
    if (st.firstVideoModuleId) usedElsewhere.add(st.firstVideoModuleId);
    for (const pid of st.playlistModuleIds ?? []) usedElsewhere.add(pid);
  }

  const introModule = studioModules.find((m) => m._id === introId);
  const introThumb = introModule ? moduleThumbPreview(introModule) : null;

  const addToPlaylist = (id: string) => {
    if (!playlistIds.includes(id)) setPlaylistIds([...playlistIds, id]);
  };
  const removeFromPlaylist = (id: string) => {
    setPlaylistIds(playlistIds.filter((x) => x !== id));
  };
  const moveEpisode = (idx: number, dir: -1 | 1) => {
    const next = [...playlistIds];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setPlaylistIds(next);
  };

  const availableForPlaylist = studioModules.filter(
    (m) => m._id !== introId && !playlistIds.includes(m._id) && (m.status === 'ready' || m.status === 'published'),
  );

  return (
    <li
      className={`border rounded-xl overflow-hidden bg-white transition-shadow ${
        isSelected ? 'border-[var(--color-muted-olive)] ring-2 ring-[var(--color-muted-olive)]/25 shadow-md' : 'border-border'
      }`}
    >
      <div className="relative aspect-[2/1] max-h-[160px] bg-[var(--color-ash-brown)]">
        {introThumb?.kind === 'video' ? (
          <video className="h-full w-full object-cover opacity-85" src={introThumb.url} autoPlay muted loop playsInline />
        ) : introThumb?.kind === 'image' ? (
          <img src={introThumb.url} alt="" className="h-full w-full object-cover opacity-85" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[var(--color-deep-space)] to-[var(--color-ash-brown)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end gap-2">
          <div className="min-w-0">
            <p className="font-medium text-white text-sm drop-shadow truncate">{s.title}</p>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-white/80 font-mono">/{s.slug}</p>
              {typeof s.viewCount === 'number' && s.viewCount > 0 && (
                <span className="text-[10px] text-white/70 bg-white/15 rounded px-1.5 py-0.5">{s.viewCount} views</span>
              )}
              {s.published && <span className="text-[10px] text-green-300 bg-green-900/30 rounded px-1.5 py-0.5">Live</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={onSelect}
            className="shrink-0 rounded-lg bg-white/20 px-2 py-1 text-[10px] font-medium text-white hover:bg-white/30"
          >
            {isSelected ? 'Selected' : 'Edit details'}
          </button>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap justify-between gap-2 items-start">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Video size={14} className="text-[var(--color-ash-brown)]" />
            {playlistIds.length} episode{playlistIds.length !== 1 ? 's' : ''}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={s.published} onChange={() => togglePub.mutate(!s.published)} />
              Published
            </label>
            <label className="text-xs flex items-center gap-1 cursor-pointer border border-border rounded-lg px-2 py-1 hover:bg-white">
              <Upload size={12} />
              Ad image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAd.mutate(f);
                  e.target.value = '';
                }}
              />
            </label>
            <Link to={`/stories/${s.slug}`} className="text-xs text-[var(--color-ash-brown)] hover:underline" target="_blank" rel="noreferrer">
              Open
            </Link>
          </div>
        </div>
        <p className="text-sm text-muted line-clamp-3">{s.summary}</p>

        <div className="space-y-3 pt-2 border-t border-border/80">
          {/* Author */}
          <div>
            <label htmlFor={`story-row-${s._id}-author`} className="text-[10px] uppercase tracking-wider text-muted">Author</label>
            <input
              id={`story-row-${s._id}-author`}
              className="input-field mt-1 text-sm"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Author on story card"
            />
          </div>

          {/* AI prompt */}
          <div>
            <label htmlFor={`story-row-${s._id}-prompt`} className="text-[10px] uppercase tracking-wider text-muted">Storyline / AI prompt</label>
            <textarea
              id={`story-row-${s._id}-prompt`}
              className="input-field mt-1 text-sm min-h-[60px]"
              value={aiStoryPrompt}
              onChange={(e) => setAiStoryPrompt(e.target.value)}
              placeholder="Episode generation prompt"
            />
          </div>

          {/* Intro video picker */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Intro video (plays on site)</p>
            {introModule ? (
              <div className="flex items-center gap-2 p-2 rounded-lg border border-[var(--color-tea-green)] bg-[var(--color-tea-green)]/20">
                <div className="w-14 h-9 rounded bg-black/80 overflow-hidden shrink-0">
                  {introThumb?.kind === 'image' ? (
                    <img src={introThumb.url} alt="" className="h-full w-full object-cover" />
                  ) : introThumb?.kind === 'video' ? (
                    <video src={introThumb.url} muted preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-border/40" />
                  )}
                </div>
                <p className="text-xs text-dark flex-1 min-w-0 truncate">{introModule.title}</p>
                <button type="button" onClick={() => setIntroId('')} aria-label="Remove intro" className="shrink-0 p-1 rounded hover:bg-white text-muted">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted italic">No intro selected ΓÇö pick a video below or from the modules at the top of the page.</p>
            )}
          </div>

          {/* Playlist episodes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] uppercase tracking-wider text-muted">Playlist episodes (drag to reorder)</p>
              <button
                type="button"
                onClick={() => setPickerOpen(!pickerOpen)}
                className="text-[10px] text-[var(--color-ash-brown)] font-medium hover:underline inline-flex items-center gap-1"
              >
                <Plus size={12} /> Add episode
              </button>
            </div>
            {playlistIds.length === 0 ? (
              <p className="text-xs text-muted italic py-2">No episodes yet. Click "Add episode" to pick videos.</p>
            ) : (
              <ul className="space-y-1.5">
                {playlistIds.map((pid, idx) => {
                  const mod = studioModules.find((m) => m._id === pid);
                  const th = mod ? moduleThumbPreview(mod) : null;
                  return (
                    <li key={pid} className="flex items-center gap-2 p-1.5 rounded-lg border border-border bg-white group">
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveEpisode(idx, -1)}
                          disabled={idx === 0}
                          className="p-0.5 text-muted hover:text-dark disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ChevronUp size={14} strokeWidth={1.8} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveEpisode(idx, 1)}
                          disabled={idx === playlistIds.length - 1}
                          className="p-0.5 text-muted hover:text-dark disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ChevronDown size={14} strokeWidth={1.8} />
                        </button>
                      </div>
                      <span className="text-[10px] text-muted font-mono w-5 text-center shrink-0">{idx + 1}</span>
                      <div className="w-12 h-8 rounded bg-black/80 overflow-hidden shrink-0">
                        {th?.kind === 'image' ? (
                          <img src={th.url} alt="" className="h-full w-full object-cover" />
                        ) : th?.kind === 'video' ? (
                          <video src={th.url} muted preload="metadata" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-border/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-dark truncate">{mod?.title ?? pid}</p>
                        {mod && (
                          <p className="text-[10px] text-muted">
                            {mod.status === 'published' ? 'Published' : mod.status === 'ready' ? 'Ready' : mod.status}
                            {usedElsewhere.has(pid) && <span className="text-amber-600 ml-1">(used in another story)</span>}
                          </p>
                        )}
                      </div>
                      <button type="button" onClick={() => removeFromPlaylist(pid)} aria-label="Remove episode" className="shrink-0 p-1 rounded hover:bg-red-50 text-muted hover:text-red-600">
                        <X size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Picker dropdown */}
            {pickerOpen && (
              <div className="mt-2 border border-border rounded-xl bg-white shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-border/60">
                  <p className="text-[10px] text-muted">Select a video to add as an episode. Only ready/published videos shown.</p>
                </div>
                {availableForPlaylist.length === 0 ? (
                  <p className="text-xs text-muted p-3">No more available videos. Create more in the Studio tab.</p>
                ) : (
                  <ul className="divide-y divide-border/40">
                    {availableForPlaylist.map((m) => {
                      const th = moduleThumbPreview(m);
                      const alreadyUsed = usedElsewhere.has(m._id);
                      return (
                        <li key={m._id}>
                          <button
                            type="button"
                            onClick={() => {
                              addToPlaylist(m._id);
                              setPickerOpen(false);
                            }}
                            className="w-full flex items-center gap-2 p-2 text-left hover:bg-[var(--color-tea-green)]/20 transition-colors"
                          >
                            <div className="w-14 h-9 rounded bg-black/80 overflow-hidden shrink-0">
                              {th?.kind === 'image' ? (
                                <img src={th.url} alt="" className="h-full w-full object-cover" />
                              ) : th?.kind === 'video' ? (
                                <video src={th.url} muted preload="metadata" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full bg-border/40" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-dark truncate">{m.title}</p>
                              <p className="text-[10px] text-muted">
                                {m.durationSeconds}s ┬╖ {m.status}
                                {alreadyUsed && <span className="text-amber-600 ml-1">(in another story)</span>}
                              </p>
                            </div>
                            <Plus size={14} className="shrink-0 text-[var(--color-ash-brown)]" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Episode limit & YT playlist */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`story-row-${s._id}-limit`} className="text-[10px] uppercase tracking-wider text-muted">Episodes on site</label>
              <input
                id={`story-row-${s._id}-limit`}
                type="number"
                min={0}
                max={20}
                className="input-field mt-1 text-sm"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor={`story-row-${s._id}-yt`} className="text-[10px] uppercase tracking-wider text-muted flex items-center gap-1">
                <PlayCircle size={12} /> YouTube playlist URL
              </label>
              <input
                id={`story-row-${s._id}-yt`}
                className="input-field mt-1 text-sm"
                value={yt}
                onChange={(e) => setYt(e.target.value)}
                placeholder="https://youtube.com/playlist?list=ΓÇª"
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="btn-accent text-xs px-4 py-2 rounded-lg"
        >
          {saveMut.isPending ? 'SavingΓÇª' : 'Save playlist'}
        </button>
      </div>
    </li>
  );
}

