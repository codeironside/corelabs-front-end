import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, LockKeyhole, Play, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { loginHref } from '@/lib/authReturn';
import { STUDIO_VIDEOS } from '@/data/media';

const STEPS = ['Command', 'World', 'Characters', 'Scenes', 'Assembly'] as const;

const SCENES = [
  { title: 'The signal', beat: 'A lone navigator discovers a pulse beneath the flooded city.', video: STUDIO_VIDEOS.worlds },
  { title: 'Into the archive', beat: 'She follows the signal into a submerged memory vault.', video: STUDIO_VIDEOS.technology },
] as const;

export function StudioDemoPage(): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [order, setOrder] = useState([0, 1]);
  const [demoPrompt, setDemoPrompt] = useState('A near-future Lagos navigator discovers an archive beneath the flooded city that remembers erased stories.');
  const scene = SCENES[sceneIndex];
  const orderedScenes = useMemo(() => order.map((index) => SCENES[index]), [order]);

  function moveScene(index: number, direction: -1 | 1): void {
    const position = order.indexOf(index);
    const target = position + direction;
    if (position < 0 || target < 0 || target >= order.length) return;
    const next = [...order];
    [next[position], next[target]] = [next[target], next[position]];
    setOrder(next);
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <Link to="/" className="text-sm tracking-tight">corelabsstudio</Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-white/45 sm:inline">Interactive sample · no generation cost</span>
            <Link
              to={loginHref('/app')}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
            >
              Save & continue
            </Link>
          </div>
        </header>

        <section className="py-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-white/45 uppercase">Try the pipeline</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Build a story before signing in.</h1>
            </div>
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/55">Watermarked sample</span>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {STEPS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(index)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  step === index ? 'border-white bg-white text-black' : 'border-white/10 bg-white/5 text-white/65 hover:border-white/30'
                }`}
              >
                <span className="block text-[10px] font-semibold uppercase tracking-widest">Step {index + 1}</span>
                <span className="mt-1 block text-sm font-semibold">{label}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 min-h-[500px] rounded-3xl border border-white/10 bg-neutral-950 p-5 md:p-8">
            {step === 0 && (
              <div className="mx-auto max-w-3xl">
                <p className="text-xs uppercase tracking-widest text-white/45">Story command</p>
                <h2 className="mt-3 text-2xl font-semibold">Start with one rough idea.</h2>
                <p className="mt-2 text-sm text-white/55">In the full Studio, Command turns this into editable worlds, characters, modules, and an opening scene plan.</p>
                <textarea value={demoPrompt} onChange={(event) => setDemoPrompt(event.target.value)} rows={5} className="mt-6 w-full resize-none rounded-2xl border border-white/15 bg-black p-5 text-base leading-relaxed text-white outline-none focus:border-white/40" />
                <div className="mt-3 flex items-center justify-between rounded-xl bg-white/5 p-4">
                  <span className="text-sm text-white/55">Sample runtime: 10 minutes</span>
                  <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"><Sparkles size={14} /> Build sample plan</button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/45">World bible</p>
                  <h2 className="mt-3 text-2xl font-semibold">The Drowned Archive</h2>
                  <p className="mt-3 leading-relaxed text-white/60">
                    A near-future Lagos where rising seas conceal an analog archive that remembers every story erased from the network.
                  </p>
                  {['Afrofuturist noir', 'Rain-soaked cyan light', 'Intimate cinematic camera'].map((item) => (
                    <div key={item} className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm text-white/70">
                      <Check size={15} /> {item}
                    </div>
                  ))}
                </div>
                <video src={STUDIO_VIDEOS.worlds} autoPlay loop muted playsInline className="aspect-video w-full rounded-2xl object-cover" />
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="text-xs uppercase tracking-widest text-white/45">Character lock</p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {[
                    { name: 'Amara Vale', role: 'Navigator', traits: 'Measured · curious · relentless' },
                    { name: 'Kelechi-9', role: 'Archive custodian', traits: 'Ancient · precise · protective' },
                  ].map((character, index) => (
                    <article key={character.name} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                      <video src={index ? STUDIO_VIDEOS.character : STUDIO_VIDEOS.tall} autoPlay loop muted playsInline className="h-60 w-full object-cover" />
                      <div className="p-4">
                        <div className="flex items-center justify-between"><h2 className="font-semibold">{character.name}</h2><LockKeyhole size={15} /></div>
                        <p className="mt-1 text-sm text-white/55">{character.role}</p>
                        <p className="mt-3 text-xs text-white/45">{character.traits}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
                <div className="space-y-3">
                  {orderedScenes.map((item) => {
                    const originalIndex = SCENES.indexOf(item);
                    return (
                      <button key={item.title} type="button" onClick={() => setSceneIndex(originalIndex)} className={`w-full rounded-xl border p-4 text-left ${sceneIndex === originalIndex ? 'border-white bg-white text-black' : 'border-white/10 bg-white/5'}`}>
                        <span className="text-xs opacity-55">Scene {order.indexOf(originalIndex) + 1} · 10 sec</span>
                        <span className="mt-1 block font-semibold">{item.title}</span>
                        <span className="mt-2 block text-xs opacity-60">{item.beat}</span>
                        <span className="mt-3 flex gap-2">
                          <span onClick={(event) => { event.stopPropagation(); moveScene(originalIndex, -1); }} className="rounded-full border border-current/20 px-2 py-1 text-xs">Earlier</span>
                          <span onClick={(event) => { event.stopPropagation(); moveScene(originalIndex, 1); }} className="rounded-full border border-current/20 px-2 py-1 text-xs">Later</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="relative overflow-hidden rounded-2xl bg-black">
                  <video key={scene.video} src={scene.video} autoPlay loop muted playsInline className="aspect-video h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black p-5 pt-16"><p className="font-semibold">{scene.title}</p></div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl bg-black">
                  <video src={orderedScenes[0].video} controls playsInline className="aspect-video w-full object-cover" />
                  <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-black/65 px-3 py-1 text-xs">CoreLabs sample</span>
                </div>
                <div className="mx-auto mt-5 flex max-w-4xl gap-2 rounded-xl bg-white/5 p-3">
                  {orderedScenes.map((item, index) => <div key={item.title} className="flex-1 rounded-lg bg-white/15 px-3 py-4 text-xs">Scene {index + 1} · {item.title}</div>)}
                </div>
                <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-white/10 p-5 text-center">
                  <Sparkles className="mx-auto text-white/60" />
                  <h2 className="mt-3 text-xl font-semibold">Ready to create your version?</h2>
                  <p className="mt-2 text-sm text-white/55">Sign in to save a world and generate your first scene.</p>
                  <Link to={loginHref('/app')} className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"><Play size={14} /> Start my story</Link>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex justify-between">
            <button type="button" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm disabled:opacity-30"><ChevronLeft size={15} /> Back</button>
            <button type="button" disabled={step === STEPS.length - 1} onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-30">Continue <ChevronRight size={15} /></button>
          </div>
        </section>
      </div>
    </main>
  );
}
