'use client';

import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PublicDoctorAvailability, DoctorSummary } from '@/lib/types';

export function useDoctorAvailabilityStream() {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastEvent, setLastEvent] = useState<PublicDoctorAvailability | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    function connect() {
      setConnectionStatus('connecting');
      es = new EventSource('/api/availability/stream');
      eventSourceRef.current = es;

      es.addEventListener('connected', () => {
        setConnectionStatus('connected');
        // Refresh doctors cache when re-establishing connection to guarantee latest state
        queryClient.invalidateQueries({ queryKey: ['doctors'] });
      });

      es.addEventListener('availability_update', (event) => {
        try {
          const payload: PublicDoctorAvailability = JSON.parse(event.data);
          setLastEvent(payload);

          // Update TanStack Query doctors cache optimistically
          queryClient.setQueryData<{ doctors: DoctorSummary[]; count: number }>(
            ['doctors'],
            (old) => {
              if (!old || !old.doctors) return old;
              return {
                ...old,
                doctors: old.doctors.map((doc) => {
                  if (doc.id === payload.doctorId) {
                    return {
                      ...doc,
                      availabilityStatus: payload.availabilityStatus,
                      statusNote: payload.statusNote,
                      statusUpdatedAt: payload.statusUpdatedAt,
                    };
                  }
                  return doc;
                }),
              };
            }
          );
        } catch (e) {
          console.error('Failed to parse availability_update SSE payload:', e);
        }
      });

      es.onerror = () => {
        setConnectionStatus('disconnected');
        if (es) {
          es.close();
        }
        // Auto reconnect after 3 seconds
        reconnectTimeout = setTimeout(() => {
          connect();
        }, 3000);
      };
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [queryClient]);

  return { connectionStatus, lastEvent };
}
