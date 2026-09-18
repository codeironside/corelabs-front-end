import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProducerRun,
  producerQueryKeys,
  streamProducerEvents,
  type ProducerRun,
} from '@/api/producer';

export type ProducerConnectionState = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'offline';

const TERMINAL_PHASES = new Set(['completed', 'cancelled', 'failed']);

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
  });
  const streamInactive = !runId
    || query.data?.feature?.enabled === false
    || TERMINAL_PHASES.has(query.data?.phase ?? '');

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

  return {
    run: query.data,
    isLoading: query.isLoading,
    error: query.error,
    connection: streamInactive ? 'idle' : connection,
  };
}
