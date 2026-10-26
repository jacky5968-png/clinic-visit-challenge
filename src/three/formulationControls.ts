import { TOUCH, type OrthographicCamera } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function formulationControls(camera: OrthographicCamera, canvas: HTMLElement) {
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false; controls.enableDamping = false;
  controls.touches.ONE = TOUCH.ROTATE; controls.touches.TWO = TOUCH.DOLLY_PAN;
  controls.minPolarAngle = .45; controls.maxPolarAngle = 1.3;
  controls.minZoom = .7; controls.maxZoom = 3;
  return controls;
}
