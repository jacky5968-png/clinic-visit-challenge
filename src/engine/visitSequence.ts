import type { LocationId } from './clinic';

export const visitOrder = ['reception', 'waiting', 'doctor'] as const;
export type PreparationPoint = 'reception' | 'waiting';

// Completion is earned by finishing a dialogue, independently of walking history.
export function nextVisitPoint(completed: readonly LocationId[]): LocationId {
  return !completed.includes('reception') ? 'reception'
    : !completed.includes('waiting') ? 'waiting' : 'doctor';
}
export function canInteractAt(id: LocationId, completed: readonly LocationId[]): boolean {
  return id === 'entrance' || id === 'reception'
    || (completed.includes('reception') && (id === 'waiting' || completed.includes('waiting')));
}
export function completePreparation(completed: readonly LocationId[], id: LocationId): readonly LocationId[] {
  if ((id !== 'reception' && id !== 'waiting') || !canInteractAt(id, completed) || completed.includes(id)) return completed;
  return [...completed, id];
}
export function visitPointStatus(id: LocationId, completed: readonly LocationId[]) {
  return id === 'entrance' ? 'entrance' : completed.includes(id) ? 'complete'
    : canInteractAt(id, completed) ? 'next' : 'locked';
}
export const visitMarkerColors = { entrance: 0x596979, next: 0x005cc8, complete: 0x007f52, locked: 0x596979 };
