import axios from 'axios';
import apiClient from '@/lib/axios';
import { config } from '@/config';
import { useAuthStore } from '@/store/authStore';
import { parseProducerSseBlock, type ProducerEvent } from './producerEvents';

export type { ProducerEvent } from './producerEvents';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type ProducerPhase =
  | 'clarify'
  | 'plan_confirm'
  | 'research'
  | 'world'
  | 'script'
  | 'script_gate'
  | 'scenes'
  | 'scene_gates'
  | 'generate'
  | 'generate_watch'
  | 'stitch'
  | 'done'
  | 'blocked'
  | 'cancelled'
  | 'takeover';

export type ProducerTaskStatus = 'pending' | 'queued' | 'running' | 'blocked' | 'completed' | 'failed' | 'skipped';
export type ProducerActionName =
  | 'retry'
  | 'simplify'
  | 'skip'
  | 'takeover'
  | 'resume'
  | 'cancel'
  | 'approve_critic'
  | 'reject_critic'
  | 'update_plan'
  | 'set_web';

export interface ProducerMessage {
  id?: string;
  role: 'assistant' | 'user' | 'system';
  text: string;
  createdAt?: string;
}

export interface ProducerQuestion {
  id: string;
  prompt: string;
  options?: string[];
  required?: boolean;
}

export interface ProducerPlan {
  title: string;
  summary: string;
  format: 'social' | 'episode';
  runtimeSeconds: number;
  sceneCount: number;
  themeAction: 'sandbox' | 'select' | 'create';
  moduleAction: 'sandbox' | 'select' | 'create';
  themeId?: string;
  moduleId?: string;
  needsWorld: boolean;
  webEnabled: boolean;
  [key: string]: unknown;
}

export interface ProducerChecklistItem {
  id: string;
  label: string;
  detail?: string;
  owner?: string;
  status: ProducerTaskStatus;
  progress?: number;
  error?: string;
}

export interface ProducerCritic {
  id: string;
  label: string;
  message?: string;
  confidence: number;
  band?: 'high' | 'medium' | 'low';
  status?: 'pending' | 'approved' | 'rejected';
  requiresAction?: boolean;
}

export interface ProducerCitation {
  url: string;
  title?: string;
  accessedAt?: string;
  excerpt?: string;
}

export interface ProducerBudget {
  label: string;
  used: number;
  limit: number;
  unit?: string;
}

export interface ProducerEntityRefs {
  themeId?: string;
  moduleId?: string;
  episodeId?: string;
}

export interface ProducerFeatureState {
  enabled: boolean;
  reason?: string;
  cohort?: string;
  researchEnabled?: boolean;
}

export interface ProducerRun {
  id: string;
  intent: string;
  phase: ProducerPhase;
  status?: string;
  version?: number;
  messages: ProducerMessage[];
  questions: ProducerQuestion[];
  plan?: ProducerPlan;
  checklist: ProducerChecklistItem[];
  critics: ProducerCritic[];
  citations: ProducerCitation[];
  budgets: ProducerBudget[];
  entityRefs: ProducerEntityRefs;
  previewUrl?: string;
  allowWeb: boolean;
  degradedCritic: boolean;
  takeover: boolean;
  failure?: { message: string; retryable?: boolean; skippable?: boolean };
  feature?: ProducerFeatureState;
  lastEventId?: string;
  updatedAt?: string;
}

type RunEnvelope = ProducerRun | { run: ProducerRun };

function normalizeRun(value: RunEnvelope): ProducerRun {
  const candidate = 'run' in value ? value.run : value;
  const raw = candidate as ProducerRun & {
    _id?: string;
    goal?: string;
    clarificationCount?: number;
    messages?: Array<ProducerMessage & { content?: string }>;
    themeId?: string;
    moduleId?: string;
    episodeId?: string;
    flags?: Record<string, unknown>;
    critic?: { degraded?: boolean };
    openIssues?: Array<{ message?: string; retryable?: boolean; skippable?: boolean }>;
    research?: ProducerCitation[];
    budgets?: ProducerBudget[] | {
      maxJevCalls?: number; jevCalls?: number;
      maxWebFetches?: number; webFetches?: number;
      maxSceneRenders?: number; sceneRenders?: number;
    };
  };
  const flags = raw.flags ?? {};
  const budgetRecord = (!Array.isArray(raw.budgets) && raw.budgets && typeof raw.budgets === 'object')
    ? raw.budgets as {
      maxJevCalls?: number; jevCalls?: number;
      maxWebFetches?: number; webFetches?: number;
      maxSceneRenders?: number; sceneRenders?: number;
    }
    : null;
  const budgets = Array.isArray(raw.budgets) ? raw.budgets : [
    { label: 'Critic calls', used: budgetRecord?.jevCalls ?? 0, limit: budgetRecord?.maxJevCalls ?? 0 },
    { label: 'Web fetches', used: budgetRecord?.webFetches ?? 0, limit: budgetRecord?.maxWebFetches ?? 0 },
    { label: 'Scene renders', used: budgetRecord?.sceneRenders ?? 0, limit: budgetRecord?.maxSceneRenders ?? 0 },
  ];
  const clarificationCount = raw.clarificationCount ?? 0;
  const questions = raw.questions?.length
    ? raw.questions.slice(0, 3)
    : raw.phase === 'plan_confirm' && clarificationCount < 3
      ? [{ id: `clarification-${clarificationCount + 1}`, prompt: 'Anything Producer should clarify before you confirm this plan?' }]
      : [];
  const lastIssue = raw.openIssues?.at(-1);
  return {
    ...raw,
    id: raw.id || raw._id || '',
    intent: raw.intent || raw.goal || '',
    messages: (raw.messages ?? []).map((message) => {
      const withContent = message as ProducerMessage & { content?: string };
      return {
        ...message,
        text: withContent.text || withContent.content || '',
      };
    }),
    questions,
    checklist: (raw.checklist ?? []).map((item) => ({
      ...item,
      status: (item.status as string) === 'waiting' ? 'blocked' : item.status,
    })),
    critics: raw.critics ?? [],
    citations: raw.citations ?? raw.research ?? [],
    budgets,
    entityRefs: raw.entityRefs ?? {
      themeId: raw.themeId ? String(raw.themeId) : undefined,
      moduleId: raw.moduleId ? String(raw.moduleId) : undefined,
      episodeId: raw.episodeId ? String(raw.episodeId) : undefined,
    },
    previewUrl: raw.previewUrl ?? (typeof flags.previewUrl === 'string' ? flags.previewUrl : undefined),
    allowWeb: raw.allowWeb ?? flags.allowWebDuringGenerate === true,
    degradedCritic: raw.degradedCritic ?? raw.critic?.degraded === true,
    takeover: raw.takeover ?? (raw.phase === 'takeover' || raw.status === 'takeover'),
    failure: raw.failure ?? (lastIssue?.message ? {
      message: lastIssue.message,
      retryable: lastIssue.retryable,
      skippable: lastIssue.skippable,
    } : undefined),
    feature: raw.feature ?? {
      enabled: flags.enabled !== false,
      reason: flags.enabled === false ? lastIssue?.message : undefined,
      cohort: typeof flags.cohort === 'string' ? flags.cohort : undefined,
      researchEnabled: flags.researchMode !== 'disabled',
    },
  };
}

export const producerQueryKeys = {
  all: ['producer'] as const,
  run: (runId: string) => ['producer', 'run', runId] as const,
};

export async function createProducerRun(input: {
  intent: string;
  allowWeb: boolean;
  idempotencyKey: string;
  format?: 'social' | 'episode';
  runtimeSeconds?: number;
}): Promise<ProducerRun> {
  const { data } = await apiClient.post<ApiResponse<RunEnvelope>>(
    '/producer/runs',
    {
      prompt: input.intent,
      intent: input.intent,
      allowWeb: input.allowWeb,
      allowWebDuringGenerate: input.allowWeb,
      format: input.format ?? (input.intent.toLowerCase().includes('episode') ? 'episode' : 'social'),
      runtimeSeconds: input.runtimeSeconds ?? 20,
      idempotencyKey: input.idempotencyKey,
      dryRun: false,
    },
    {
      headers: { 'Idempotency-Key': input.idempotencyKey },
    },
  );
  return normalizeRun(data.data);
}

export async function getProducerRun(runId: string): Promise<ProducerRun> {
  const { data } = await apiClient.get<ApiResponse<RunEnvelope>>(`/producer/runs/${encodeURIComponent(runId)}`);
  return normalizeRun(data.data);
}

export async function sendProducerMessage(
  runId: string,
  input: { message: string; questionId?: string },
): Promise<ProducerRun> {
  const idempotencyKey = crypto.randomUUID();
  const { data } = await apiClient.post<ApiResponse<RunEnvelope>>(
    `/producer/runs/${encodeURIComponent(runId)}/message`,
    { message: input.message, idempotencyKey },
  );
  return normalizeRun(data.data);
}

export async function confirmProducerRun(runId: string, plan: ProducerPlan): Promise<ProducerRun> {
  const { data } = await apiClient.post<ApiResponse<RunEnvelope>>(
    `/producer/runs/${encodeURIComponent(runId)}/confirm-plan`,
    { plan, idempotencyKey: crypto.randomUUID() },
  );
  return normalizeRun(data.data);
}

export async function runProducerAction(
  runId: string,
  action: ProducerActionName,
  payload?: Record<string, unknown>,
): Promise<ProducerRun> {
  const actionMap: Record<ProducerActionName, string> = {
    retry: 'retry_step',
    simplify: 'simplify',
    skip: 'skip_scene',
    takeover: 'takeover',
    resume: 'resume',
    cancel: 'cancel',
    approve_critic: 'accept_critic',
    reject_critic: 'simplify',
    update_plan: 'update_plan',
    set_web: 'allow_web',
  };
  const body: Record<string, unknown> = { idempotencyKey: crypto.randomUUID() };
  if (typeof payload?.step === 'string') body.step = payload.step;
  if (typeof payload?.sceneId === 'string') body.sceneId = payload.sceneId;
  if (typeof payload?.allowWeb === 'boolean') body.enabled = payload.allowWeb;
  if (typeof payload?.note === 'string') body.note = payload.note;
  if (typeof payload?.criticId === 'string') body.criticId = payload.criticId;
  if (payload?.plan && typeof payload.plan === 'object') body.plan = payload.plan;
  if (typeof payload?.expectedVersion === 'number') body.expectedVersion = payload.expectedVersion;
  const { data } = await apiClient.post<ApiResponse<RunEnvelope>>(
    `/producer/runs/${encodeURIComponent(runId)}/actions/${actionMap[action]}`,
    body,
  );
  return normalizeRun(data.data);
}

export function producerFeatureDisabled(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;
  const status = error.response?.status;
  const body = error.response?.data as { code?: string; message?: string; data?: { enabled?: boolean; reason?: string } } | undefined;
  if (body?.data?.enabled === false || body?.code === 'PRODUCER_DISABLED' || status === 404 || status === 403) {
    return body?.data?.reason || body?.message || 'Producer is not enabled for this workspace yet.';
  }
  return null;
}

export async function streamProducerEvents(options: {
  runId: string;
  cursor?: string;
  signal: AbortSignal;
  onEvent: (event: ProducerEvent) => void;
}): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  const url = new URL(`${config.studioApiUrl}/producer/runs/${encodeURIComponent(options.runId)}/events`);
  if (options.cursor) url.searchParams.set('cursor', options.cursor);
  const response = await fetch(url, {
    headers: {
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.cursor ? { 'Last-Event-ID': options.cursor } : {}),
    },
    signal: options.signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`Producer event stream failed (${response.status})`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (!options.signal.aborted) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let boundary = buffer.indexOf('\n\n');
    while (boundary >= 0) {
      const event = parseProducerSseBlock(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      if (event) options.onEvent(event);
      boundary = buffer.indexOf('\n\n');
    }
  }
}
