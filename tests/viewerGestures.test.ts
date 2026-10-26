import { afterEach, expect, it, vi } from 'vitest';
import { OrthographicCamera } from 'three';
import { createPointerTap } from '../src/engine/pointerTap';
import { lockModalScroll } from '../src/engine/modalScroll';
import { formulationControls } from '../src/three/formulationControls';

const point = (pointerId = 1, clientX = 100, clientY = 100, button = 0) => ({ pointerId, clientX, clientY, button });
afterEach(() => vi.unstubAllGlobals());
it('accepts a single small tap but rejects right clicks and ineligible targets', () => {
  const tap = createPointerTap();
  tap.down(point()); expect(tap.up(point(1, 103, 102))).toBe(true);
  tap.down(point(1, 100, 100, 2)); expect(tap.up(point(1, 100, 100, 2))).toBe(false);
  tap.down(point(), false); expect(tap.up(point())).toBe(false);
});
it('does not turn an out-and-back drag into a building, island or backdrop tap', () => {
  const tap = createPointerTap(); tap.down(point()); tap.move(point(1, 180));
  tap.move(point()); expect(tap.up(point())).toBe(false);
  tap.down(point()); expect(tap.up(point(1, 160))).toBe(false);
});
it('rejects every release of a two-finger gesture, including lifted and replaced fingers', () => {
  const tap = createPointerTap(); tap.down(point()); tap.down(point(2, 200));
  expect(tap.up(point(2, 240))).toBe(false);
  tap.down(point(3, 200)); expect(tap.up(point(3))).toBe(false); expect(tap.up(point())).toBe(false);
  tap.down(point(4)); expect(tap.up(point(4))).toBe(true);
});
it('cancellation cannot leave a stale tap or block a subsequent gesture', () => {
  const tap = createPointerTap(); tap.down(point()); tap.cancel(point());
  expect(tap.up(point())).toBe(false); tap.down(point(2)); expect(tap.up(point(2))).toBe(true);
});
it('fixes the background at its scroll position and restores pre-existing styles and position', () => {
  const root = { style: { overflow: 'clip', overscrollBehavior: 'auto' } };
  const body = { style: { position: 'relative', top: '2px', left: '', width: '90%', overflow: 'auto', overscrollBehavior: 'contain' } };
  const oldBody = { ...body.style }, oldRoot = { ...root.style }, scrollTo = vi.fn();
  vi.stubGlobal('document', { body, documentElement: root }); vi.stubGlobal('window', { scrollX: 3, scrollY: 420, scrollTo });
  const unlock = lockModalScroll();
  expect(body.style).toMatchObject({ position: 'fixed', top: '-420px', left: '-3px', width: '100%', overflow: 'hidden' });
  expect(root.style).toEqual({ overflow: 'hidden', overscrollBehavior: 'none' });
  unlock(); expect(body.style).toEqual(oldBody); expect(root.style).toEqual(oldRoot);
  expect(scrollTo).toHaveBeenCalledWith({ left: 3, top: 420, behavior: 'instant' });
});

// Exercise the actual Three.js touch listeners without a WebGL context or browser UI.
for (const [width, height] of [[390, 524], [768, 560], [1024, 468]]) it(`real OrbitControls rotate and pinch correctly at ${width}px`, () => {
  const doc = new EventTarget();
  const element = Object.assign(new EventTarget(), {
    style: { touchAction: '', cursor: '' }, ownerDocument: doc, clientWidth: width, clientHeight: height,
    getRootNode: () => doc, setPointerCapture: vi.fn(), releasePointerCapture: vi.fn(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
  });
  const camera = new OrthographicCamera(-16, 16, 10, -10, .1, 160); camera.position.set(18, 12, 28);
  const controls = formulationControls(camera, element as unknown as HTMLElement); controls.update();
  function touch(target: EventTarget, type: string, id: number, x: number, y = 100) {
    const event = Object.assign(new Event(type, { cancelable: true }), { pointerId: id, pointerType: 'touch', pageX: x, pageY: y, clientX: x, clientY: y, button: 0 });
    target.dispatchEvent(event);
  }
  const initial = controls.getAzimuthalAngle();
  touch(element, 'pointerdown', 1, 100); touch(doc, 'pointermove', 1, 150); touch(doc, 'pointerup', 1, 150);
  expect(controls.getAzimuthalAngle()).not.toBeCloseTo(initial); expect(camera.zoom).toBe(1);
  const angle = controls.getAzimuthalAngle(), target = controls.target.clone();
  touch(element, 'pointerdown', 2, 100); touch(element, 'pointerdown', 3, 200);
  touch(doc, 'pointermove', 2, 80); touch(doc, 'pointermove', 3, 220);
  expect(camera.zoom).toBeGreaterThan(1); expect(controls.getAzimuthalAngle()).toBeCloseTo(angle);
  expect(controls.target.equals(target)).toBe(true);
  touch(doc, 'pointermove', 2, 130); touch(doc, 'pointermove', 3, 170); expect(camera.zoom).toBeCloseTo(.7);
  touch(element, 'pointercancel', 3, 170); touch(doc, 'pointerup', 2, 130);
  touch(element, 'pointerdown', 4, 100); touch(doc, 'pointermove', 4, 140); touch(doc, 'pointerup', 4, 140);
  expect(controls.getAzimuthalAngle()).not.toBeCloseTo(angle);
  expect(element.style.touchAction).toBe('none'); expect(element.setPointerCapture).toHaveBeenCalled();
  controls.dispose(); expect(element.style.touchAction).toBe('');
});
