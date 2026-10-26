import { describe, expect, it, vi } from 'vitest';
import { canInteractAt, completePreparation, nextVisitPoint, visitPointStatus } from '../src/engine/visitSequence';
import { createArrivalInteraction } from '../src/engine/arrivalInteraction';
import { sevenStages } from '../src/data/sevenStages';
import { mainTarget, sceneLocations } from '../src/data/sceneLocations';
import { stageStaffConversation } from '../src/data/stageConversations';
import type { LocationId } from '../src/engine/clinic';

describe('ordered conversation prerequisites', () => {
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
