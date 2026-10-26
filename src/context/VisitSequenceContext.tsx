import { createContext, useContext, useState, type ReactNode } from 'react';
import type { LocationId } from '../engine/clinic';
import { canInteractAt, completePreparation, nextVisitPoint, visitPointStatus } from '../engine/visitSequence';

function useSequence() {
  const [completed, setCompleted] = useState<readonly LocationId[]>([]);
  return {
    completed,
    next: nextVisitPoint(completed),
    canInteract: (id: LocationId) => canInteractAt(id, completed),
    status: (id: LocationId) => visitPointStatus(id, completed),
    complete: (id: LocationId) => setCompleted(previous => completePreparation(previous, id)),
  };
}
const VisitSequenceContext = createContext<ReturnType<typeof useSequence> | null>(null);
export function VisitSequenceProvider({ children }: { children: ReactNode }) {
  const sequence = useSequence();
  return <VisitSequenceContext.Provider value={sequence}>{children}</VisitSequenceContext.Provider>;
}
export function useVisitSequence() {
  const sequence = useContext(VisitSequenceContext);
  if (!sequence) throw new Error('拜訪順序必須在場景內使用');
  return sequence;
}
