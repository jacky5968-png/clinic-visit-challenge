import { describe, expect, it, vi } from 'vitest';
import { createArrivalInteraction } from '../src/engine/arrivalInteraction';
import { sevenStages } from '../src/data/sevenStages';
import { mainTarget } from '../src/data/sceneLocations';

describe('automatic arrival interaction', () => {
  it('does not open a dialogue at the initial entrance or while travelling/loading', () => {
    const arrive = createArrivalInteraction(), interact = vi.fn();
    expect(arrive('entrance', false, interact)).toBe(false);
    expect(arrive(null, false, interact)).toBe(false);
    expect(arrive('reception', true, interact)).toBe(false);
    expect(interact).not.toHaveBeenCalled();
    expect(arrive('reception', false, interact)).toBe(true);
    expect(interact).toHaveBeenCalledExactlyOnceWith('reception');
  });

  it('opens once, stays closed at the same spot, and rearms after leaving', () => {
    const arrive = createArrivalInteraction(), interact = vi.fn();
    expect(arrive('reception', false, interact)).toBe(true);
    for (let frame = 0; frame < 20; frame++) expect(arrive('reception', false, interact)).toBe(false);
    // Closing a bubble or returning from a consultation keeps the same location.
    expect(arrive('reception', true, interact)).toBe(false);
    expect(arrive('reception', false, interact)).toBe(false);
    expect(interact).toHaveBeenCalledTimes(1);
    arrive(null, false, interact);
    expect(arrive('reception', false, interact)).toBe(true);
    expect(interact).toHaveBeenCalledTimes(2);
    expect(arrive('waiting', false, interact)).toBe(true);
    expect(interact).toHaveBeenLastCalledWith('waiting');
  });

  it('ignores spots passed during a route and does not consume a failed proximity check', () => {
    const arrive = createArrivalInteraction(), interact = vi.fn();
    arrive('reception', true, interact);
    arrive('waiting', true, interact);
    expect(interact).not.toHaveBeenCalled();
    expect(arrive('doctor', false, () => false)).toBe(false);
    expect(arrive('doctor', false, interact)).toBe(true);
    expect(interact).toHaveBeenCalledExactlyOnceWith('doctor');
  });

  for (const stage of sevenStages) it(stage.clinic + ' opens its correct main NPC once after arrival', () => {
    const arrive = createArrivalInteraction(), interact = vi.fn();
    const target = mainTarget(stage);
    // A blocked main interaction must wait for the existing requirements.
    expect(arrive(target, true, interact)).toBe(false);
    expect(arrive(target, false, interact)).toBe(true);
    expect(arrive(target, false, interact)).toBe(false);
    expect(interact).toHaveBeenCalledExactlyOnceWith(target);
  });
});
