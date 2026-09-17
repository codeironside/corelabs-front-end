import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Check, Loader2, Send, Sparkles, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  buildProductionPlan,
  createContentEpisode,
  createContentModule,
  createTheme,
  type ProductionPlan,
} from '@/api/content';
import { useAuthStore } from '@/store/authStore';

type Message = { role: 'assistant' | 'user'; text: string };

const DURATION_OPTIONS = [
  { label: '20 sec opening', seconds: 20 },
  { label: '1 minute', seconds: 60 },
  { label: '10 minutes', seconds: 600 },
  { label: '30 minutes', seconds: 1800 },
  { label: '90 minutes', seconds: 5400 },
] as const;

function slugFor(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'new-world';
  return `${base}-${Date.now().toString(36)}`;
}

function characterThemePayload(plan: ProductionPlan): string {
  const characters = plan.characters.map((character, index) => ({
    id: `character-${index + 1}`,
    name: character.name,
    handle: character.handle.startsWith('@') ? character.handle : `@${character.handle}`,
    role: character.role,
    appearance: character.appearance,
    personality: character.personality,
    gallery: [],
  }));
  return [
    plan.theme.worldBible,
    '',
    'CHARACTER_REFERENCE_LIBRARY_JSON',
    '```json',
    JSON.stringify({ characters }, null, 2),
    '```',
  ].join('\n');
}

export function CommandProductionPlanner({
  onOpenEpisodes,
}: {
  onOpenEpisodes: () => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [prompt, setPrompt] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(600);
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Don't know where to start? Describe the story you want to make and how long it should be. I'll build the world, characters, modules, and opening episode plan for you.",
    },
  ]);

  const planMutation = useMutation({
    mutationFn: (message: string) => buildProductionPlan({
      prompt: message,
      durationSeconds,
      previousPlan: plan ?? undefined,
    }),
    onSuccess: (result, message) => {
      setPlan(result);
      setMessages((current) => [
        ...current,
        { role: 'user', text: message },
        {
          role: 'assistant',
          text: `I built “${result.theme.title}” with ${result.characters.length} locked characters and ${result.modules.length} module${result.modules.length === 1 ? '' : 's'}. Review the production plan below, refine it here, or create the project.`,
        },
      ]);
      setPrompt('');
    },
    onError: () => toast.error('Could not build the production plan. Try describing the idea another way.'),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!plan) throw new Error('No plan');
      const theme = await createTheme({
        title: plan.theme.title,
        slug: slugFor(plan.theme.title),
        authorName: user?.name || user?.email || 'CoreLabs creator',
        defaultGenre: plan.theme.genre,
        defaultStoryPrompt: characterThemePayload(plan),
        atmosphericVibe: plan.theme.atmosphere,
        videoStyle: plan.theme.videoStyle,
      });
      const modules = [];
      for (const item of plan.modules) {
        const module = await createContentModule({
          title: item.title,
          themeLine: item.premise,
          genre: plan.theme.genre,
          creativePrompt: item.premise,
          durationSeconds: Math.max(10, Math.min(3600, Math.round(item.durationSeconds / 5) * 5)),
          soundEnabled: false,
          generationMode: 'text2video',
          themeId: theme._id,
        });
        modules.push(module);
      }
      const firstModule = modules[0];
      if (!firstModule) throw new Error('No module was created');
      const episode = await createContentEpisode({
        moduleId: firstModule._id,
        title: plan.modules[0]?.firstEpisodeTitle || 'Opening episode',
        basePrompt: plan.modules[0]?.firstEpisodePrompt || plan.summary,
        runtimeTargetSeconds: plan.recommendedFirstCutSeconds,
        durationSeconds: plan.recommendedFirstCutSeconds,
        soundEnabled: false,
        outputMode: 'media',
      });
      sessionStorage.setItem('content-studio-episode-module-id', firstModule._id);
      return { theme, modules, episode };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['content'] });
      toast.success(`Project created. Your ${result.episode.durationSeconds}-second opening is ready to break into scenes.`);
      onOpenEpisodes();
    },
    onError: () => toast.error('Could not create the project. Your plan is still here—please retry.'),
  });

  function submit(): void {
    const message = prompt.trim();
    if (message.length < 10 || planMutation.isPending) return;
    planMutation.mutate(message);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-950">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center gap-2 text-white"><Sparkles size={17} /><h2 className="font-semibold">Build with Command</h2></div>
        <p className="mt-1 text-xs text-white/50">One idea becomes a structured, editable production plan. Nothing is generated or charged until you approve it.</p>
      </div>

      <div className="max-h-72 space-y-3 overflow-y-auto p-5">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
            {message.role === 'assistant' ? <Bot size={18} className="mt-1 shrink-0 text-white/50" /> : null}
            <p className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user' ? 'bg-white text-black' : 'bg-white/5 text-white/70'}`}>{message.text}</p>
            {message.role === 'user' ? <UserRound size={18} className="mt-1 shrink-0 text-white/50" /> : null}
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((option) => (
            <button key={option.seconds} type="button" onClick={() => setDurationSeconds(option.seconds)} className={`rounded-full border px-3 py-1.5 text-xs ${durationSeconds === option.seconds ? 'border-white bg-white text-black' : 'border-white/15 text-white/55'}`}>
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } }} rows={3} placeholder={plan ? 'Ask for a change, e.g. “Make the world warmer and add a rival.”' : 'Describe your story, audience, tone, characters, or even just a rough idea…'} className="min-h-24 flex-1 resize-none rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/40" />
          <button type="button" onClick={submit} disabled={prompt.trim().length < 10 || planMutation.isPending} className="self-end rounded-xl bg-white p-3 text-black disabled:opacity-35" aria-label="Build production plan">
            {planMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
      </div>

      {plan ? (
        <div className="space-y-4 border-t border-white/10 p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="text-[10px] uppercase tracking-widest text-white/40">World</span>
              <input value={plan.theme.title} onChange={(event) => setPlan({ ...plan, theme: { ...plan.theme, title: event.target.value } })} className="mt-2 block w-full bg-transparent text-lg font-semibold outline-none" />
              <textarea value={plan.theme.worldBible} onChange={(event) => setPlan({ ...plan, theme: { ...plan.theme, worldBible: event.target.value } })} rows={4} className="mt-2 w-full resize-none bg-transparent text-sm leading-relaxed text-white/55 outline-none" />
            </label>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="text-[10px] uppercase tracking-widest text-white/40">Production shape</span>
              <p className="mt-2 text-sm text-white/65">{plan.summary}</p>
              <p className="mt-3 text-xs text-white/45">{plan.modules.length} modules · about {plan.estimatedSceneCount} scene blocks total · first cut {plan.recommendedFirstCutSeconds}s</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {plan.characters.map((character, index) => (
              <div key={`${character.handle}-${index}`} className="rounded-xl border border-white/10 p-4">
                <span className="text-[10px] uppercase tracking-widest text-white/40">Character lock</span>
                <input value={character.name} onChange={(event) => setPlan({ ...plan, characters: plan.characters.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} className="mt-2 block w-full bg-transparent font-semibold outline-none" />
                <input value={character.role} onChange={(event) => setPlan({ ...plan, characters: plan.characters.map((item, itemIndex) => itemIndex === index ? { ...item, role: event.target.value } : item) })} className="mt-1 block w-full bg-transparent text-xs text-white/45 outline-none" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {plan.modules.map((module, index) => (
              <div key={index} className="grid gap-2 rounded-xl border border-white/10 p-4 md:grid-cols-[220px_1fr_auto] md:items-center">
                <input value={module.title} onChange={(event) => setPlan({ ...plan, modules: plan.modules.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) })} className="bg-transparent text-sm font-semibold outline-none" />
                <input value={module.premise} onChange={(event) => setPlan({ ...plan, modules: plan.modules.map((item, itemIndex) => itemIndex === index ? { ...item, premise: event.target.value } : item) })} className="bg-transparent text-xs text-white/50 outline-none" />
                <span className="text-xs text-white/35">{Math.round(module.durationSeconds / 60)} min</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button type="button" disabled={createMutation.isPending} onClick={() => createMutation.mutate()} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-40">
              {createMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Create project and opening episode
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
