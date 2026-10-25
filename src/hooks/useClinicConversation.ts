import { useCallback, useRef, useState } from 'react';
import type { LocationId } from '../engine/clinic';
export function useClinicConversation() {
  const [opened, setOpened] = useState<LocationId | null>(null);
  const [round, setRound] = useState(0);
  const [sequence, setSequence] = useState(0);
  const current = useRef<LocationId | null>(null);
  const counts = useRef<Partial<Record<LocationId,number>>>({});
  const open = useCallback((id: LocationId, repeat = true) => {
    if (!repeat && current.current === id) return;
    current.current = id;
    const count = counts.current[id] ?? 0;
    counts.current[id] = count + 1;
    setOpened(id); setRound(count); setSequence(n => n + 1);
  }, []);
  const close = useCallback(() => { current.current = null; setOpened(null); }, []);
  const keepOnly = useCallback((id: LocationId | null | undefined) => {
    if (current.current !== id) { current.current = null; setOpened(null); }
  }, []);
  return { opened, round, sequence, open, close, keepOnly };
}
