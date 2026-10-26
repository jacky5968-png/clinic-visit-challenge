import { describe, expect, it, vi } from 'vitest';
import { canInteractAt, completePreparation, nextCounterAfterDialogue, nextVisitPoint, visitPointStatus } from '../src/engine/visitSequence';
import { createArrivalInteraction } from '../src/engine/arrivalInteraction';
import { sevenStages } from '../src/data/sevenStages';
import { mainTarget, sceneLocations } from '../src/data/sceneLocations';
import { stageStaffConversation } from '../src/data/stageConversations';
import type { LocationId } from '../src/engine/clinic';
import { planWalkingRoute, clearSegment } from '../src/engine/freeWalk';
import { worldLocations } from '../src/engine/clinic3d';

describe('ordered conversation prerequisites', () => {
  it('chains completed staff conversations to accessible routes, then opens each dialogue once on arrival', () => {
    const arrive = createArrivalInteraction(), interact = vi.fn();
    let completed: readonly LocationId[] = [];
    for (const from of ['reception', 'waiting'] as const) {
      const destination = nextCounterAfterDialogue(from, completed)!;
      expect(destination).toBe(from === 'reception' ? 'waiting' : 'doctor');
      completed = completePreparation(completed, from);
      expect(canInteractAt(destination, completed)).toBe(true);
      const route = planWalkingRoute(worldLocations[from], worldLocations[destination]);
      expect(route[0]).toEqual(worldLocations[from]);
      expect(route.at(-1)).toEqual(worldLocations[destination]);
      for (let i = 1; i < route.length; i++) expect(clearSegment(route[i - 1], route[i])).toBe(true);
      // Crossing a different interaction point while walking cannot open a premature bubble.
      arrive('reception', true, interact);
      expect(arrive(destination, true, interact)).toBe(false);
      expect(arrive(destination, false, interact)).toBe(true);
      expect(arrive(destination, false, interact)).toBe(false);
    }
    expect(interact.mock.calls.map(call => call[0])).toEqual(['waiting', 'doctor']);
    expect(completed).toEqual(['reception', 'waiting']);
  });

  it('does not auto-route an entrance, unfinished prerequisite or examiner, and keeps repeat visits in physical order', () => {
    expect(nextCounterAfterDialogue('entrance', [])).toBeNull();
    expect(nextCounterAfterDialogue('waiting', [])).toBeNull();
    expect(nextCounterAfterDialogue('doctor', ['reception', 'waiting'])).toBeNull();
    expect(nextCounterAfterDialogue('reception', ['reception', 'waiting'])).toBe('waiting');
    expect(nextCounterAfterDialogue('waiting', ['reception', 'waiting'])).toBe('doctor');
  });

  for (const stage of sevenStages) it(stage.clinic + ' requires 01 and 02 before its 03 examiner', () => {
    expect(mainTarget(stage)).toBe('doctor');
    expect(stage.required).toEqual(['reception', 'waiting']);
    expect(sceneLocations(stage).doctor.speaker).toBe(stage.doctor.name);
    expect(stageStaffConversation(stage, 'reception')?.lines.length).toBeGreaterThan(0);
    expect(stageStaffConversation(stage, 'waiting')?.lines.length).toBeGreaterThan(0);
    let completed: readonly LocationId[] = [];
    expect(canInteractAt('entrance', completed)).toBe(true);
    expect(nextVisitPoint(completed)).toBe('reception');
    expect(canInteractAt('waiting', completed)).toBe(false);
    expect(canInteractAt('doctor', completed)).toBe(false);
    // An out-of-order callback cannot award credit.
    expect(completePreparation(completed, 'waiting')).toBe(completed);
    expect(completePreparation(completed, 'doctor')).toBe(completed);
    completed = completePreparation(completed, 'reception');
    expect(nextVisitPoint(completed)).toBe('waiting');
    expect(canInteractAt('waiting', completed)).toBe(true);
    expect(canInteractAt('doctor', completed)).toBe(false);
    expect(visitPointStatus('reception', completed)).toBe('complete');
    expect(visitPointStatus('waiting', completed)).toBe('next');
    expect(visitPointStatus('doctor', completed)).toBe('locked');
    completed = completePreparation(completed, 'waiting');
    expect(nextVisitPoint(completed)).toBe('doctor');
    expect(canInteractAt('doctor', completed)).toBe(true);
    // Revisiting 01 never removes or duplicates previous dialogue credit.
    expect(completePreparation(completed, 'reception')).toBe(completed);
    expect(completePreparation(completed, 'waiting')).toBe(completed);
    expect(completed).toEqual(['reception', 'waiting']);
  });

  it('walking to a locked point, leaving, or closing early never unlocks an examiner', () => {
    const arrive = createArrivalInteraction();
    const interact = vi.fn();
    let completed: readonly LocationId[] = [];
    for (const id of ['doctor', 'waiting'] as const) {
      expect(arrive(id, !canInteractAt(id, completed), interact)).toBe(false);
    }
    expect(arrive('reception', false, interact)).toBe(true);
    // Opening, replying or closing a bubble is not completion.
    arrive(null, false, interact);
    expect(canInteractAt('waiting', completed)).toBe(false);
    expect(arrive('reception', false, interact)).toBe(true);
    completed = completePreparation(completed, 'reception');
    expect(arrive('doctor', !canInteractAt('doctor', completed), interact)).toBe(false);
    expect(arrive('waiting', false, interact)).toBe(true);
    completed = completePreparation(completed, 'waiting');
    expect(arrive('doctor', !canInteractAt('doctor', completed), interact)).toBe(true);
    expect(arrive('doctor', false, interact)).toBe(false);
    expect(interact.mock.calls.map(call => call[0])).toEqual(['reception', 'reception', 'waiting', 'doctor']);
    // A new product visit starts with fresh in-memory dialogue requirements.
    expect(canInteractAt('doctor', [])).toBe(false);
  });
});
