import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Circle,
  CirclePause,
  ExternalLink,
  Globe2,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  UserRound,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  confirmProducerRun,
  createProducerRun,
  listProducerRuns,
  producerFeatureDisabled,
  producerQueryKeys,
  runProducerAction,
  sendProducerMessage,
  uploadProducerAttachment,
  getProducerAttachment,
  acceptProducerExtraction,
  getProducerCapabilities,
  type ProducerAttachment,
  type ProducerActionName,
  type ProducerChecklistItem,
  type ProducerPlan,
  type ProducerRun,
} from '@/api/producer';
import { useProtectedVideoSrc } from '@/pages/dashboard/content-episodes/protectedMedia';
import { useProducerRun } from '@/pages/app/producer/useProducerRun';

const surface = 'rounded-xl border border-white/10 bg-white/[0.035]';

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function statusIcon(item: ProducerChecklistItem): ReactNode {
  if (item.status === 'completed') return <CheckCircle2 size={16} className="text-emerald-400" />;
  if (item.status === 'failed') return <XCircle size={16} className="text-red-400" />;
  if (item.status === 'running') return <Loader2 size={16} className="animate-spin text-sky-300" />;
  if (item.status === 'blocked') return <CirclePause size={16} className="text-amber-300" />;
  if (item.status === 'skipped') return <Check size={16} className="text-white/35" />;
  return <Circle size={16} className="text-white/25" />;
}

function confidenceBand(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

function bandClass(band: 'high' | 'medium' | 'low'): string {
  if (band === 'high') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  if (band === 'medium') return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
  return 'border-red-400/30 bg-red-400/10 text-red-200';
}

function ProducerPreview({ url }: { url?: string }): React.JSX.Element | null {
  const media = useProtectedVideoSrc(url);
  if (!url) return null;
  return (
    <section className={`${surface} overflow-hidden`}>
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold">Production preview</h3>
        <p className="mt-0.5 text-xs text-white/45">Latest clip during production; the full assembled draft when complete.</p>
      </div>
      <div className="aspect-video bg-black">
        {media.loading ? (
          <div className="flex h-full items-center justify-center text-white/45"><Loader2 className="animate-spin" /></div>
        ) : media.src ? (
          <video src={media.src} controls playsInline className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/45">Preview is not available.</div>
        )}
      </div>
    </section>
  );
}

function RunIndicators({ run, connection }: { run: ProducerRun; connection: string }): React.JSX.Element {
  const connected = connection === 'live';
  return (
    <div className="flex flex-wrap gap-2">
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${connected ? 'border-emerald-400/25 text-emerald-200' : 'border-white/15 text-white/45'}`}>
        {connected ? <Wifi size={12} /> : <WifiOff size={12} />} {connection}
      </span>
      <span className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/55">{run.phase.replaceAll('_', ' ')}</span>
      {run.degradedCritic ? <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-200">Fallback critic</span> : null}
      {run.takeover ? <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-[11px] text-sky-200">Canvas takeover</span> : null}
      {run.feature?.cohort ? <span className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/45">Cohort {run.feature.cohort}</span> : null}
    </div>
  );
}

function EditablePlan({
  plan,
  busy,
  onChange,
  onSave,
  onConfirm,
}: {
  plan: ProducerPlan;
  busy: boolean;
  onChange: (plan: ProducerPlan) => void;
  onSave: () => void;
  onConfirm: () => void;
}): React.JSX.Element {
  return (
    <section className={`${surface} p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-white/40 uppercase">Editable production plan</p>
          <p className="mt-1 text-xs text-white/45">Review every field. Generation starts only after confirmation.</p>
        </div>
        {plan.version ? <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-white/40">v{String(plan.version)}</span> : null}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/45">
          Title
          <input value={plan.title} onChange={(event) => onChange({ ...plan, title: event.target.value })} className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/35" />
        </label>
        <label className="text-xs text-white/45">
          Format
          <select value={plan.format} onChange={(event) => onChange({ ...plan, format: event.target.value as ProducerPlan['format'], needsWorld: event.target.value === 'episode', themeAction: event.target.value === 'social' ? 'sandbox' : plan.themeAction === 'sandbox' ? 'create' : plan.themeAction, moduleAction: event.target.value === 'social' ? 'sandbox' : plan.moduleAction === 'sandbox' ? 'create' : plan.moduleAction })} className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/35">
            <option value="social">Short social</option>
            <option value="episode">Episode / world</option>
          </select>
        </label>
        <label className="text-xs text-white/45">
          Duration (seconds)
          <input type="number" min={10} max={7200} value={plan.runtimeSeconds} onChange={(event) => {
            const runtimeSeconds = Number(event.target.value) || 20;
            onChange({ ...plan, runtimeSeconds, sceneCount: Math.max(1, Math.ceil(runtimeSeconds / 10)) });
          }} className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/35" />
        </label>
        <label className="text-xs text-white/45">
          Scene blocks
          <input type="number" min={1} max={720} value={plan.sceneCount} onChange={(event) => onChange({ ...plan, sceneCount: Number(event.target.value) || 1 })} className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/35" />
        </label>
      </div>
      <label className="mt-3 block text-xs text-white/45">
        Creative direction
        <textarea rows={5} value={plan.summary} onChange={(event) => onChange({ ...plan, summary: event.target.value })} className="mt-1.5 w-full resize-y rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm leading-relaxed text-white outline-none focus:border-white/35" />
      </label>
      {plan.steps && Array.isArray(plan.steps) && plan.steps.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(plan.steps as Array<{ id?: string; title: string; detail?: string }>).map((step, index) => (
            <div key={step.id ?? `${step.title}-${index}`} className="rounded-lg bg-white/5 px-3 py-2">
              <p className="text-xs font-medium text-white/75">{step.title}</p>
              {step.detail ? <p className="mt-1 text-[11px] text-white/40">{step.detail}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-[11px] text-white/40">
          {plan.sceneCount} scene blocks · {plan.themeAction}/{plan.moduleAction} world path · web {plan.webEnabled ? "on" : "off"}
        </div>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" disabled={busy} onClick={onSave} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/65 hover:bg-white/5 disabled:opacity-40">Save edits</button>
        <button type="button" disabled={busy || !plan.title.trim() || !plan.summary.trim()} onClick={onConfirm} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-40">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Confirm & start
        </button>
      </div>
    </section>
  );
}

function RunPlanEditor({
  plan,
  busy,
  onSave,
  onConfirm,
}: {
  plan: ProducerPlan;
  busy: boolean;
  onSave: (plan: ProducerPlan) => void;
  onConfirm: (plan: ProducerPlan) => void;
}): React.JSX.Element {
  const [editedPlan, setEditedPlan] = useState(plan);
  return (
    <EditablePlan
      plan={editedPlan}
      busy={busy}
      onChange={setEditedPlan}
      onSave={() => onSave(editedPlan)}
      onConfirm={() => onConfirm(editedPlan)}
    />
  );
}

export function StudioProducerPanel(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const runId = searchParams.get('runId');
  const runState = useProducerRun(runId);
  const [intent, setIntent] = useState('');
  const [allowWeb, setAllowWeb] = useState(false);
  const [mode, setMode] = useState<'autonomous' | 'guided'>('autonomous');
  const [runtime, setRuntime] = useState('600');
  const [renderLimit, setRenderLimit] = useState(72);
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const [attachmentRole, setAttachmentRole] = useState<ProducerAttachment['role']>('script');
  const [attachmentLabel, setAttachmentLabel] = useState('');
  const [attachmentDescription, setAttachmentDescription] = useState('');
  const [scriptMode, setScriptMode] = useState<'screenplay' | 'narration'>('screenplay');
  const [adaptation, setAdaptation] = useState<'faithful' | 'creative'>('faithful');
  const [audioMode, setAudioMode] = useState<'narration' | 'native'>('narration');
  const [voiceProfile, setVoiceProfile] = useState('neutral-global-female');
  const [revision, setRevision] = useState('');
  const [reply, setReply] = useState('');
  const [questionId, setQuestionId] = useState<string>();
  const [disabledReason, setDisabledReason] = useState<string>();
  const unavailableReason = disabledReason ?? producerFeatureDisabled(runState.error);
  const recentRuns = useQuery({ queryKey: ['producer', 'recent'], queryFn: listProducerRuns, enabled: !runId, staleTime: 0 });
  const capabilities = useQuery({ queryKey: ['producer', 'capabilities'], queryFn: getProducerCapabilities });
  const attachments = useQuery({ queryKey: ['producer', 'attachments', attachmentIds], queryFn: () => Promise.all(attachmentIds.map(getProducerAttachment)), enabled: attachmentIds.length > 0 && !runId,
    refetchInterval: (query) => query.state.data?.some((asset) => asset.status === 'queued' || asset.status === 'processing') ? 2000 : false });
  const uploadMutation = useMutation({ mutationFn: (file: File) => uploadProducerAttachment(file, { role: attachmentRole, label: attachmentLabel.trim() || file.name, description: attachmentDescription, scriptMode }),
    onSuccess: (asset) => { setAttachmentIds((previous) => [...previous, asset._id]); setAttachmentLabel(''); setAttachmentDescription(''); if (asset.role === 'script' && adaptation === 'faithful') setAudioMode('narration'); }, onError: (error) => toast.error(errorMessage(error, 'Upload failed.')) });
  const acceptExtraction = useMutation({ mutationFn: acceptProducerExtraction, onSuccess: () => void attachments.refetch(), onError: (error) => toast.error(errorMessage(error, 'Could not accept extraction.')) });

  const updateRun = (run: ProducerRun): void => {
    queryClient.setQueryData(producerQueryKeys.run(run.id), run);
  };

  const createMutation = useMutation({
    mutationFn: () => createProducerRun({
      intent: intent.trim(),
      allowWeb,
      mode,
      runtimeSeconds: runtime ? Number(runtime) : undefined,
      format: Number(runtime) >= 120 ? 'episode' : 'social',
      maxSceneRenders: renderLimit,
      attachmentIds, adaptation, audioMode, voiceProfile,
      idempotencyKey: crypto.randomUUID(),
    }),
    onSuccess: (run) => {
      if (run.feature?.enabled === false) {
        setDisabledReason(run.feature.reason || 'Producer is not enabled for this workspace yet.');
        return;
      }
      updateRun(run);
      const next = new URLSearchParams(searchParams);
      next.set('studioTab', 'producer');
      next.set('runId', run.id);
      setSearchParams(next);
    },
    onError: (error) => {
      const reason = producerFeatureDisabled(error);
      if (reason) setDisabledReason(reason);
      else toast.error(errorMessage(error, 'Could not start Producer.'));
    },
  });

  const messageMutation = useMutation({
    mutationFn: () => sendProducerMessage(runId as string, { message: reply.trim(), questionId }),
    onSuccess: (run) => {
      updateRun(run);
      setReply('');
      setQuestionId(undefined);
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not send your answer.')),
  });

  const confirmMutation = useMutation({
    mutationFn: (plan: ProducerPlan) => confirmProducerRun(runId as string, plan),
    onSuccess: updateRun,
    onError: (error) => toast.error(errorMessage(error, 'Could not confirm this plan.')),
  });

  const actionMutation = useMutation({
    mutationFn: ({ action, payload }: { action: ProducerActionName; payload?: Record<string, unknown> }) =>
      runProducerAction(runId as string, action, payload),
    onSuccess: (run) => {
      updateRun(run);
      if (run.id !== runId) {
        const next = new URLSearchParams(searchParams);
        next.set('runId', run.id);
        setSearchParams(next);
        setRevision('');
      }
    },
    onError: (error) => toast.error(errorMessage(error, 'Producer could not apply that action.')),
  });

  const canvasUrl = useMemo(() => {
    const refs = runState.run?.entityRefs;
    if (!refs?.moduleId) return null;
    const params = new URLSearchParams({ studioTab: 'episodes', moduleId: refs.moduleId });
    if (refs.episodeId) params.set('episodeId', refs.episodeId);
    return `/app?${params.toString()}`;
  }, [runState.run?.entityRefs]);

  if (unavailableReason || runState.run?.feature?.enabled === false) {
    return (
      <section className={`${surface} p-8 text-center`}>
        <CirclePause className="mx-auto text-white/35" size={28} />
        <h2 className="mt-3 text-base font-semibold">Producer is not available for this workspace</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/50">{unavailableReason || runState.run?.feature?.reason || 'This staged feature is currently outside your workspace cohort.'}</p>
        <p className="mt-4 text-xs text-white/35">Command and Creator’s Canvas remain available.</p>
      </section>
    );
  }

  if (!runId) {
    return (
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-950">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center gap-2"><Sparkles size={18} /><h2 className="font-semibold">Agentic Producer</h2></div>
          <p className="mt-1 text-xs text-white/50">Describe your story. Producer adapts your script, prepares narration, renders scenes, and assembles one video.</p>
        </div>
        <div className="p-5">
          <textarea autoFocus rows={8} value={intent} onChange={(event) => setIntent(event.target.value)} placeholder="Describe the video, episode, or world you want to produce…" className="w-full resize-y rounded-xl border border-white/15 bg-black px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/25 focus:border-white/40" />
          <section className={`${surface} mt-4 p-4`}>
            <h3 className="text-sm font-semibold">Script and visual references</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-white/55">File role<select value={attachmentRole} onChange={(event) => setAttachmentRole(event.target.value as ProducerAttachment['role'])} className="mt-1 w-full rounded-lg bg-black p-2">{['script', 'character', 'location', 'prop', 'wardrobe', 'style'].map((role) => <option key={role}>{role}</option>)}</select></label>
              <label className="text-xs text-white/55">{attachmentRole === 'character' ? 'Character name' : 'Reference label'}<input value={attachmentLabel} onChange={(event) => setAttachmentLabel(event.target.value)} className="mt-1 w-full rounded-lg bg-black p-2" /></label>
              {attachmentRole === 'script' ? <label className="text-xs text-white/55">Document content<select value={scriptMode} onChange={(event) => setScriptMode(event.target.value as 'screenplay' | 'narration')} className="mt-1 w-full rounded-lg bg-black p-2"><option value="screenplay">Screenplay with speaker names</option><option value="narration">Narration: read the document text</option></select></label> : <label className="text-xs text-white/55">Describe what to preserve<input value={attachmentDescription} onChange={(event) => setAttachmentDescription(event.target.value)} placeholder="Clothing, palette, location or other visible details" className="mt-1 w-full rounded-lg bg-black p-2" /></label>}
              <label className="text-xs text-white/55">Add file (up to 10 MB)<input type="file" accept={attachmentRole === 'script' ? '.pdf,.docx,.txt' : '.png,.jpg,.jpeg,.webp'} disabled={uploadMutation.isPending || attachmentIds.length >= 9 || (attachmentRole === 'character' && !attachmentLabel.trim())} onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadMutation.mutate(file); event.target.value = ''; }} className="mt-1 w-full text-xs" /></label>
            </div>
            {attachmentRole !== 'script' && !capabilities.data?.visionConfigured ? <p className="mt-2 text-xs text-white/45">Add a description of the details to preserve with each reference image.</p> : null}
            {uploadMutation.isPending ? <p className="mt-3 text-xs text-white/50">Uploading…</p> : null}
            {attachments.data?.map((asset) => <div key={asset._id} className="mt-3 rounded-lg bg-black/40 p-3 text-xs">
              <div className="flex items-center justify-between"><span>{asset.label} · {asset.role} · {asset.status.replaceAll('_', ' ')}</span><button type="button" onClick={() => setAttachmentIds((ids) => ids.filter((id) => id !== asset._id))}>Remove</button></div>
              {asset.error ? <p className="mt-2 text-red-300">{asset.error}</p> : null}
              {asset.extraction ? <details className="mt-2"><summary>Review extracted script</summary>{asset.extraction.warnings.map((warning) => <p key={warning} className="mt-2 text-amber-200">{warning}</p>)}<p className="mt-2 text-white/50">{asset.extraction.blocks.filter((block) => block.kind === 'dialogue').length} speech blocks detected. Check the document content mode if dialogue is missing.</p>{asset.extraction.pages.map((page) => <div key={page.page} className="mt-3"><p>Page / section {page.page} · {page.method}</p><pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap text-white/60">{page.text}</pre></div>)}</details> : null}
              {asset.status === 'needs_review' ? <button type="button" disabled={acceptExtraction.isPending} onClick={() => acceptExtraction.mutate(asset._id)} className="mt-3 rounded-lg border border-amber-300/30 px-3 py-2">I reviewed the extracted text</button> : null}
            </div>)}
            <label className="mt-3 block text-xs text-white/55">Script treatment<select value={adaptation} onChange={(event) => { setAdaptation(event.target.value as 'faithful' | 'creative'); if (event.target.value === 'faithful') setAudioMode('narration'); }} className="ml-2 rounded-lg bg-black p-2"><option value="faithful">Preserve the uploaded script</option><option value="creative">Allow creative rewriting</option></select></label>
          </section>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-white/55">Creative control
              <select value={mode} onChange={(event) => setMode(event.target.value as 'autonomous' | 'guided')} className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-white">
                <option value="autonomous">Handle it for me</option><option value="guided">Work with me</option>
              </select>
            </label>
            <label className="text-xs text-white/55">Duration in seconds (optional)
              <input type="number" min={5} max={capabilities.data?.maxRuntimeSeconds ?? 600} value={runtime} onChange={(event) => setRuntime(event.target.value)} placeholder="600 = ten minutes" className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-white" />
            </label>
            <label className="text-xs text-white/55">Maximum scene renders, including retries
              <input type="number" min={1} max={capabilities.data?.maxSceneRenders ?? 720} value={renderLimit} onChange={(event) => setRenderLimit(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-white" />
            </label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-white/55">Speech<select value={audioMode} onChange={(event) => setAudioMode(event.target.value as 'narration' | 'native')} className="mt-1 w-full rounded-lg bg-black p-2"><option value="narration">Consistent TTS narrator</option><option value="native" disabled={adaptation === 'faithful' && attachments.data?.some((asset) => asset.role === 'script')}>Audio generated with video</option></select></label>
            {audioMode === 'narration' ? <label className="text-xs text-white/55">Narrator voice<select value={voiceProfile} onChange={(event) => setVoiceProfile(event.target.value)} className="mt-1 w-full rounded-lg bg-black p-2"><option value="neutral-global-female">Neutral female</option><option value="lagos-calm-male">Calm male</option><option value="lagos-warm-female">Warm female</option><option value="west-african-documentary">Documentary</option><option value="youthful-storyteller">Storyteller</option></select></label> : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-white/55">
              <input type="checkbox" checked={allowWeb} onChange={(event) => setAllowWeb(event.target.checked)} className="accent-white" />
              <Globe2 size={14} /> Allow cited web research during research phases
            </label>
            <button type="button" disabled={intent.trim().length < 10 || createMutation.isPending || uploadMutation.isPending || (attachmentIds.length > 0 && (attachments.data?.length !== attachmentIds.length || attachments.data.some((asset) => asset.status !== 'ready')))} onClick={() => createMutation.mutate()} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-35">
              {createMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Start Producer
            </button>
          </div>
          <p className="mt-4 text-[11px] text-white/40">{mode === 'autonomous' ? 'Starting authorizes script, narration, video and character image generation within the production budgets. Production continues while you’re away.' : 'Review the plan and each rendered scene before continuing.'} Your draft stays private until you publish it.</p>
          {recentRuns.data?.length ? <div className="mt-6 border-t border-white/10 pt-4"><h3 className="text-xs font-semibold text-white/60">Recent productions</h3><div className="mt-3 space-y-2">{recentRuns.data.map((saved) => <button type="button" key={saved.id} onClick={() => { const next = new URLSearchParams(searchParams); next.set('runId', saved.id); setSearchParams(next); }} className="flex w-full items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 text-left text-xs"><span className="truncate text-white/75">{saved.plan?.title || saved.intent}</span><span className="shrink-0 text-white/40">{saved.status?.replaceAll('_', ' ')}</span></button>)}</div></div> : null}
        </div>
      </section>
    );
  }

  if (runState.isLoading || !runState.run) {
    return <section className={`${surface} flex min-h-52 items-center justify-center gap-2 text-sm text-white/45`}><Loader2 size={16} className="animate-spin" /> Restoring Producer run…</section>;
  }

  const run = runState.run;
  const busy = messageMutation.isPending || confirmMutation.isPending || actionMutation.isPending;
  const pendingCritics = run.critics.filter((critic) => critic.status === 'pending' || critic.requiresAction);

  return (
    <div className="space-y-4">
      <section className={`${surface} p-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><Bot size={17} /><h2 className="text-sm font-semibold">Producer run</h2></div>
            <p className="mt-1 max-w-3xl text-xs text-white/50">{run.intent}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canvasUrl ? <Link to={canvasUrl} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs text-white/70 hover:bg-white/5"><ExternalLink size={13} /> Edit in Canvas</Link> : null}
            <button type="button" disabled={busy || run.status === 'completed' || run.status === 'cancelled'} onClick={() => actionMutation.mutate({ action: run.takeover ? 'resume' : 'takeover' })} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs text-white/70 hover:bg-white/5 disabled:opacity-40">
              {run.takeover ? <Play size={13} /> : <Pause size={13} />} {run.takeover ? 'Resume workers' : 'Take over'}
            </button>
            {run.status !== 'completed' && run.status !== 'cancelled' ? <button type="button" disabled={busy} onClick={() => actionMutation.mutate({ action: 'cancel' })} className="rounded-full border border-white/15 px-3 py-2 text-xs text-white/60">Cancel production</button> : null}
            <button type="button" onClick={() => { const next = new URLSearchParams(searchParams); next.delete('runId'); setSearchParams(next); }} className="rounded-full border border-white/15 px-3 py-2 text-xs text-white/60">New production</button>
          </div>
        </div>
        <div className="mt-3"><RunIndicators run={run} connection={runState.connection} /></div>
        {run.phase === 'audio' ? <p className="mt-3 text-xs text-white/55">Preparing narration: {run.mediaProgress?.narrationPrepared ?? 0} of {run.plan?.sceneCount ?? 0} scenes.</p> : null}
        {run.phase === 'stitch' ? <p className="mt-3 text-xs text-white/55">Assembling final video: {run.mediaProgress?.completedChapters ?? 0} of {run.mediaProgress?.totalChapters || Math.ceil((run.plan?.sceneCount ?? 0) / 6)} chapters saved.</p> : null}
      </section>

      {run.messages.length || run.questions.length ? (
        <section className={`${surface} overflow-hidden`}>
          <div className="max-h-80 space-y-3 overflow-y-auto p-4">
            {run.messages.map((message, index) => (
              <div key={message.id ?? `${message.role}-${index}`} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role !== 'user' ? <Bot size={16} className="mt-2 shrink-0 text-white/35" /> : null}
                <p className={`max-w-2xl rounded-xl px-3 py-2 text-xs leading-relaxed ${message.role === 'user' ? 'bg-white text-black' : 'bg-white/5 text-white/65'}`}>{message.text}</p>
                {message.role === 'user' ? <UserRound size={16} className="mt-2 shrink-0 text-white/35" /> : null}
              </div>
            ))}
            {run.questions.slice(0, 3).map((question) => (
              <div key={question.id} className="rounded-xl border border-sky-400/15 bg-sky-400/5 p-3">
                <p className="text-xs font-medium text-white/80">{question.prompt}</p>
                {question.options?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {question.options.map((option) => <button key={option} type="button" onClick={() => { setReply(option); setQuestionId(question.id); }} className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/60 hover:bg-white/10">{option}</button>)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          {run.questions.length ? (
            <div className="flex gap-2 border-t border-white/10 p-4">
              <input value={reply} onChange={(event) => setReply(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && reply.trim()) messageMutation.mutate(); }} placeholder="Answer the clarification…" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-white/35" />
              <button type="button" disabled={!reply.trim() || messageMutation.isPending} onClick={() => messageMutation.mutate()} className="rounded-lg bg-white p-2.5 text-black disabled:opacity-35" aria-label="Send clarification"><Send size={15} /></button>
            </div>
          ) : null}
        </section>
      ) : null}

      {run.plan && run.phase === 'plan_confirm' && run.status === 'waiting_user' ? (
        <RunPlanEditor
          key={`${run.id}-${run.plan.version ?? run.version ?? 0}`}
          plan={run.plan}
          busy={busy}
          onSave={(plan) => actionMutation.mutate({ action: 'update_plan', payload: { plan, expectedVersion: run.version } })}
          onConfirm={(plan) => confirmMutation.mutate(plan)}
        />
      ) : null}

      {(run.phase === 'generate' || run.phase === 'audio') && run.status === 'waiting_user' ? (
        <section className="rounded-xl border border-sky-400/25 bg-sky-400/[0.08] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-sky-100">Ready to render</h3>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/55">
                Script and scenes are prepared. Starting render will enqueue paid scene generation — confirm when you are ready.
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => actionMutation.mutate({ action: 'approve_critic' })}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-40"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Start render
            </button>
          </div>
        </section>
      ) : null}

      {run.phase === 'generate_watch' && run.status === 'running' ? (
        <section className={`${surface} p-4`}>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Loader2 size={15} className="animate-spin text-sky-300" />
            Rendering scenes — preview will appear when the first clip is ready.
          </div>
        </section>
      ) : null}

      {run.phase === 'done' && run.status === 'completed' ? (
        <section className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.08] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
            <CheckCircle2 size={16} /> Producer run complete
          </div>
          <p className="mt-1 text-xs text-white/55">Your assembled draft is ready below. Request another cut or open Canvas to refine and publish.</p>
          <textarea value={revision} onChange={(event) => setRevision(event.target.value)} rows={3} placeholder="Describe changes for the next cut…" className="mt-3 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white" />
          <button type="button" disabled={busy || !revision.trim()} onClick={() => actionMutation.mutate({ action: 'revise', payload: { note: revision.trim() } })} className="mt-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-40">Create revised draft</button>
        </section>
      ) : null}

      {run.failure ? (
        <section className="rounded-xl border border-red-400/20 bg-red-400/[0.06] p-4">
          <div className="flex gap-3"><AlertTriangle size={18} className="shrink-0 text-red-300" /><div><h3 className="text-sm font-semibold">Producer needs your help</h3><p className="mt-1 text-xs leading-relaxed text-white/55">{run.failure.message}</p></div></div>
          <div className="mt-3 flex flex-wrap gap-2">
            {run.failure.retryable !== false ? <button type="button" disabled={busy} onClick={() => actionMutation.mutate({ action: 'retry' })} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs"><RotateCcw size={12} /> Retry</button> : null}
            <button type="button" disabled={busy} onClick={() => actionMutation.mutate({ action: 'simplify' })} className="rounded-full border border-white/15 px-3 py-1.5 text-xs">Simplify</button>
            {run.failure.skippable !== false ? <button type="button" disabled={busy} onClick={() => actionMutation.mutate({ action: 'skip' })} className="rounded-full border border-white/15 px-3 py-1.5 text-xs">Skip</button> : null}
          </div>
        </section>
      ) : null}

      {pendingCritics.length ? (
        <section className={`${surface} p-4`}>
          <h3 className="text-sm font-semibold">Critic gates</h3>
          <div className="mt-3 space-y-2">
            {pendingCritics.map((critic) => {
              const band = critic.band ?? confidenceBand(critic.confidence);
              return (
                <div key={critic.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/5 p-3">
                  <div><div className="flex items-center gap-2"><p className="text-xs font-medium">{critic.label}</p><span className={`rounded-full border px-2 py-0.5 text-[10px] ${bandClass(band)}`}>{Math.round(critic.confidence * 100)}% {band}</span></div>{critic.message ? <p className="mt-1 text-[11px] text-white/45">{critic.message}</p> : null}</div>
                  <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => actionMutation.mutate({ action: 'reject_critic', payload: { criticId: critic.id } })} className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/50">Revise</button><button type="button" disabled={busy} onClick={() => actionMutation.mutate({ action: 'approve_critic', payload: { criticId: critic.id } })} className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-black">Approve</button></div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {run.checklist.length ? (
        <section className={`${surface} p-4`}>
          <h3 className="text-sm font-semibold">Live production checklist</h3>
          <div className="mt-3 space-y-2">
            {run.checklist.map((item) => (
              <div key={item.id} className="rounded-lg bg-white/5 p-3">
                <div className="flex items-center gap-2">{statusIcon(item)}<p className="min-w-0 flex-1 truncate text-xs font-medium text-white/75">{item.label}</p>{item.owner ? <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white/40">{item.owner}</span> : null}</div>
                {typeof item.progress === 'number' ? <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-white/70 transition-all" style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }} /></div> : null}
                {item.detail || item.error ? <p className={`mt-1.5 text-[11px] ${item.error ? 'text-red-300/80' : 'text-white/35'}`}>{item.error ?? item.detail}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <ProducerPreview url={run.previewUrl} />

      {run.contextStats ? (
        <section className={`${surface} p-4`}>
          <h3 className="text-sm font-semibold">Story memory</h3>
          <p className="mt-2 text-xs text-white/50">
            {run.contextStats.compacted ? `Using ${run.contextStats.checkpoints} verified memory summaries.` : 'Original story context fits this step.'}
            {' '}Your brief, world rules and character locks stay preserved. Full sources remain saved.
          </p>
          {run.contextStats.degraded ? <p className="mt-2 text-xs text-amber-200">Memory is using fallback verification or relevance selection.</p> : null}
        </section>
      ) : null}

      {(run.budgets.length || run.citations.length || run.feature?.researchEnabled !== false) ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className={`${surface} p-4`}>
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Globe2 size={15} /><h3 className="text-sm font-semibold">Web research</h3></div><label className="inline-flex items-center gap-2 text-[11px] text-white/50"><input type="checkbox" checked={run.allowWeb} disabled={busy || run.feature?.researchEnabled === false} onChange={(event) => actionMutation.mutate({ action: 'set_web', payload: { allowWeb: event.target.checked } })} className="accent-white" /> Allowed</label></div>
            {run.citations.length ? <ol className="mt-3 space-y-2">{run.citations.map((citation, index) => <li key={`${citation.url}-${index}`} className="text-xs"><a href={citation.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-200 hover:underline">{citation.title || new URL(citation.url).hostname}<ExternalLink size={10} /></a>{citation.excerpt ? <p className="mt-1 line-clamp-2 text-[11px] text-white/35">{citation.excerpt}</p> : null}</li>)}</ol> : <p className="mt-3 text-xs text-white/35">No sources cited for this run.</p>}
          </section>
          <section className={`${surface} p-4`}>
            <h3 className="text-sm font-semibold">Run budgets</h3>
            {run.budgets.length ? <div className="mt-3 space-y-3">{run.budgets.map((budget) => { const pct = budget.limit > 0 ? Math.min(100, (budget.used / budget.limit) * 100) : 0; return <div key={budget.label}><div className="flex justify-between text-[11px] text-white/45"><span>{budget.label}</span><span>{budget.used} / {budget.limit} {budget.unit}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-300' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} /></div></div>; })}</div> : <p className="mt-3 text-xs text-white/35">No metered work has been used.</p>}
          </section>
        </div>
      ) : null}
    </div>
  );
}
