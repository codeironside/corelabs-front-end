import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Film, Loader2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getPublicEpisodePreview, previewMediaUrl } from '@/api/previewLinks';

export function EpisodePreviewPage(): React.JSX.Element {
  const token = useParams().token ?? '';
  const previewQuery = useQuery({
    queryKey: ['public', 'episode-preview', token],
    queryFn: () => getPublicEpisodePreview(token),
    enabled: Boolean(token),
    retry: false,
  });
  const [sceneNumber, setSceneNumber] = useState<number | null>(null);

  if (previewQuery.isLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-black text-white"><Loader2 className="animate-spin" /></main>;
  }
  if (!previewQuery.data || previewQuery.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="max-w-md text-center">
          <Film className="mx-auto text-white/40" />
          <h1 className="mt-4 text-2xl font-semibold">This preview is unavailable.</h1>
          <p className="mt-2 text-sm text-white/50">It may have expired or been revoked by its creator.</p>
          <Link to="/" className="mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-sm text-black">Visit CoreLabs</Link>
        </div>
      </main>
    );
  }

  const preview = previewQuery.data;
  const selectedScene = preview.scenes.find((scene) => scene.sceneNumber === sceneNumber);
  const streamToken = selectedScene?.streamToken ?? preview.masterStreamToken ?? preview.scenes[0]?.streamToken;

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <Link to="/" className="text-sm">corelabsstudio</Link>
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/50">Unlisted preview</span>
        </header>
        <section className="py-8">
          <p className="text-xs uppercase tracking-widest text-white/45">Creator preview</p>
          <h1 className="mt-2 text-3xl font-semibold">{preview.title}</h1>
          <p className="mt-2 text-sm text-white/45">Available until {new Date(preview.expiresAt).toLocaleString()}</p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-neutral-950">
            {streamToken ? (
              <video key={streamToken} src={previewMediaUrl(streamToken)} controls autoPlay playsInline className="aspect-video w-full bg-black object-contain" />
            ) : (
              <div className="flex aspect-video items-center justify-center text-sm text-white/45">No approved video is available yet.</div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {preview.masterStreamToken ? (
              <button type="button" onClick={() => setSceneNumber(null)} className={`rounded-full px-4 py-2 text-sm ${sceneNumber === null ? 'bg-white text-black' : 'border border-white/15 text-white/65'}`}>Full cut</button>
            ) : null}
            {preview.scenes.map((scene) => (
              <button key={scene.sceneNumber} type="button" onClick={() => setSceneNumber(scene.sceneNumber)} className={`rounded-full px-4 py-2 text-sm ${sceneNumber === scene.sceneNumber ? 'bg-white text-black' : 'border border-white/15 text-white/65'}`}>
                Scene {scene.sceneNumber}
              </button>
            ))}
            {streamToken ? (
              <a href={previewMediaUrl(streamToken)} download className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/70"><Download size={14} /> Download rough cut</a>
            ) : null}
          </div>
          {selectedScene?.beatDescription ? <p className="mt-5 rounded-xl bg-white/5 p-4 text-sm leading-relaxed text-white/55">{selectedScene.beatDescription}</p> : null}
        </section>
      </div>
    </main>
  );
}
