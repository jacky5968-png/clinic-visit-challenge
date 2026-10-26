type TapPointer = Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY' | 'button'>;

// Once a gesture has moved or gained another finger, returning to its start is not a tap.
export function createPointerTap(maxMovement = 6) {
  const active = new Set<number>();
  let candidate: TapPointer | null = null;
  function move(event: TapPointer) {
    if (candidate?.pointerId === event.pointerId && Math.hypot(event.clientX - candidate.clientX, event.clientY - candidate.clientY) > maxMovement) candidate = null;
  }
  return {
    down(event: TapPointer, eligible = true) {
      active.add(event.pointerId);
      candidate = active.size === 1 && event.button === 0 && eligible ? { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, button: event.button } : null;
    },
    move,
    up(event: TapPointer) {
      move(event);
      const tapped = active.size === 1 && candidate?.pointerId === event.pointerId && event.button === 0;
      active.delete(event.pointerId); candidate = null;
      return tapped;
    },
    cancel(event: Pick<PointerEvent, 'pointerId'>) { active.delete(event.pointerId); candidate = null; },
    reset() { active.clear(); candidate = null; },
  };
}
