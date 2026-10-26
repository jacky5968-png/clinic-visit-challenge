import { expect, it } from 'vitest';
import { Box3, OrthographicCamera, Spherical, Vector3 } from 'three';
import { fitFormulationView } from '../src/three/fitFormulationView';

const building = new Box3(new Vector3(-12, -3.5, -6), new Vector3(12, 3.5, 6));
const roof = new Box3(new Vector3(-6.65, 3.3, -3.65), new Vector3(6.65, 3.3, -1.45));
function assertInside(box: Box3, camera: OrthographicCamera, limit: number) {
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const point = new Vector3(x, y, z).project(camera);
    expect(Math.abs(point.x)).toBeLessThanOrEqual(limit + 1e-8);
    expect(Math.abs(point.y)).toBeLessThanOrEqual(limit + 1e-8);
  }
}
for (const [width, height] of [[320, 180], [390, 211], [768, 415], [1024, 518], [844, 155], [414, 224], [1280, 420]]) {
  it(`keeps every roof corner visible through rotation, tilt and zoom at ${width}x${height}`, () => {
    for (let step = -8; step <= 8; step++) for (const polar of [.45, .8, 1.3]) for (const zoom of [.7, 1, 1.2, 2, 3]) {
      const camera = new OrthographicCamera(-16, 16, 10, -10, .1, 160);
      camera.position.setFromSpherical(new Spherical(45, polar, step * Math.PI / 8)); camera.lookAt(0, 0, 0); camera.zoom = zoom;
      const maxZoom = fitFormulationView(camera, building, roof, width, height);
      expect(maxZoom).toBeGreaterThan(1); expect(maxZoom).toBeLessThanOrEqual(3);
      expect(camera.zoom).toBeLessThanOrEqual(maxZoom); assertInside(roof, camera, .92);
      if (zoom === 1) { assertInside(building, camera, 1); expect(camera.left + camera.right).toBeCloseTo(0); expect(camera.top + camera.bottom).toBeCloseTo(0); }
    }
  });
}
it('returns to the same panorama after zooming and remains stable across repeated fits and resizing', () => {
  const camera = new OrthographicCamera(-16, 16, 10, -10, .1, 160); camera.position.set(18, 12, 28); camera.lookAt(0, 0, 0);
  fitFormulationView(camera, building, roof, 390, 211); const initial = camera.projectionMatrix.clone();
  camera.zoom = 3; fitFormulationView(camera, building, roof, 390, 211);
  expect(camera.zoom).toBeLessThan(3); const enlarged = camera.projectionMatrix.clone();
  for (let i = 0; i < 10; i++) fitFormulationView(camera, building, roof, 390, 211);
  camera.projectionMatrix.elements.forEach((value, index) => expect(value).toBeCloseTo(enlarged.elements[index], 10));
  fitFormulationView(camera, building, roof, 1024, 518); assertInside(roof, camera, .92);
  camera.zoom = 1; fitFormulationView(camera, building, roof, 390, 211);
  camera.projectionMatrix.elements.forEach((value, index) => expect(value).toBeCloseTo(initial.elements[index], 10));
});
