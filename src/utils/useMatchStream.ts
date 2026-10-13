import { useEffect, useRef, useState } from 'react';

export interface UseMatchStreamOptions {
  matchId: string;
  onMessage: (data: any) => void;
  enabled?: boolean;
}

export function useMatchStream({ matchId, onMessage, enabled = true }: UseMatchStreamOptions) {
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'OFFLINE'>('CONNECTING');
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const lastEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !matchId) return;

    let isMounted = true;
    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let retryCount = 0;
    const backoffDelays = [1000, 2000, 4000, 8000, 15000];

    const connectSSE = () => {
      if (!isMounted) return;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      setConnectionStatus(retryCount > 0 ? 'RECONNECTING' : 'CONNECTING');
      const sseUrl = `/api/matches/${matchId}/scoring/stream`;
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        if (!isMounted) return;
        setConnectionStatus('CONNECTED');
        setLastSyncTime(Date.now());
        retryCount = 0;
      };

      eventSource.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          setLastSyncTime(Date.now());
          setConnectionStatus('CONNECTED');
          retryCount = 0;

          // Heartbeat / ping ignore
          if (data && (data.type === 'HEARTBEAT' || data.type === 'PING')) {
            return;
          }

          // Match switch protection: ignore events that don't belong to current match
          if (data.matchId && data.matchId !== matchId) {
            return;
          }

          // Duplicate event protection: deduplicate if duplicate event ID or sequence arrives
          if (data.eventId && data.eventId === lastEventIdRef.current) {
            return;
          }
          if (data.eventId) {
            lastEventIdRef.current = data.eventId;
          }

          onMessageRef.current(data);
        } catch {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        if (!isMounted) return;
        setConnectionStatus(retryCount >= 4 ? 'OFFLINE' : 'RECONNECTING');
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        const delay = backoffDelays[Math.min(retryCount, backoffDelays.length - 1)];
        retryCount++;
        retryTimeout = setTimeout(() => {
          if (isMounted) connectSSE();
        }, delay);
      };
    };

    connectSSE();

    return () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, [matchId, enabled]);

  return { connectionStatus, lastSyncTime };
}
