import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProducerRun,
  producerQueryKeys,
  streamProducerEvents,
  syncProducerGeneration,
  type ProducerRun,
} from '@/api/producer';

export type ProducerConnectionState = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'offline';

const TERMINAL_PHASES = new Set(['done', 'blocked', 'cancelled', 'takeover']);
const TERMINAL_STATUSES = new Set(['completed', 'cancelled']);

export function useProducerRun(runId: string | null): {
  run: ProducerRun | undefined;
  isLoading: boolean;
  error: unknown;
  connection: ProducerConnectionState;
} {
  const queryClient = useQueryClient();
  const [connection, setConnection] = useState<ProducerConnectionState>(runId ? 'connecting' : 'idle');
  const cursorRef = useRef<string | undefined>(undefined);
  const query = useQuery({
    queryKey: producerQueryKeys.run(runId ?? ''),
    queryFn: () => getProducerRun(runId as string),
    enabled: Boolean(runId),
    retry: 1,
    refetchInterval: (query) => query.state.data?.status === 'running' ? 3000 : false,
  });
  const streamInactive = !runId
    || query.data?.feature?.enabled === false
    || TERMINAL_PHASES.has(query.data?.phase ?? '')
    || TERMINAL_STATUSES.has(query.data?.status ?? '');

  useEffect(() => {
    if (streamInactive || !runId) return;

    let stopped = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let controller: AbortController | undefined;
    cursorRef.current = query.data?.lastEventId;

    const connect = async (): Promise<void> => {
      controller = new AbortController();
      setConnection(attempt === 0 ? 'connecting' : 'reconnecting');
      try {
        await streamProducerEvents({
          runId,
          cursor: cursorRef.current,
          signal: controller.signal,
          onEvent: (event) => {
            attempt = 0;
            setConnection('live');
            if (event.id) cursorRef.current = event.id;
            void queryClient.invalidateQueries({ queryKey: producerQueryKeys.run(runId) });
          },
        });
        if (stopped || controller.signal.aborted) return;
      } catch {
        if (stopped || controller.signal.aborted) return;
      }
      attempt += 1;
      setConnection(attempt > 5 ? 'offline' : 'reconnecting');
      const delay = Math.min(15_000, 750 * (2 ** Math.min(attempt, 4)));
      retryTimer = setTimeout(() => void connect(), delay);
    };

    void connect();
    return () => {
      stopped = true;
      controller?.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [queryClient, runId, streamInactive]);

  useEffect(() => {
    if (!runId || query.data?.phase !== 'generate_watch') return;
    if (query.data.status !== 'running') return;

    const poll = (): void => {
      void syncProducerGeneration(runId)
        .then((run) => {
          queryClient.setQueryData(producerQueryKeys.run(runId), run);
        })
        .catch(() => undefined);
    };

    poll();
    const timer = setInterval(poll, 4000);
    return () => clearInterval(timer);
  }, [queryClient, runId, query.data?.phase, query.data?.status]);

  return {
    run: query.data,
    isLoading: query.isLoading,
    error: query.error,
    connection: streamInactive ? 'idle' : connection,
  };
}
