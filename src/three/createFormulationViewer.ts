import * as THREE from 'three';
import { formulationControls } from './formulationControls';
import { buildFormulationBuilding } from './buildFormulationBuilding';

export function createFormulationViewer(host: HTMLElement, onZoom: (zoom: number) => void, onFailure: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.dataset.testid = 'formulation-viewer-canvas'; canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', '生達製劑大樓放大3D模型，可拖曳旋轉與雙指縮放');
  host.append(canvas);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe6f4ef);
  scene.add(new THREE.HemisphereLight(0xf9fcff, 0x71968a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff4df, 2.8);
  sun.position.set(-15, 35, 25); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 100 });
  sun.shadow.camera.updateProjectionMatrix(); sun.shadow.normalBias = .03; scene.add(sun);
  let building: THREE.Group;
  try { building = buildFormulationBuilding(); }
  catch (error) { renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); throw error; }
  const sign = building.getObjectByName('formulation-building-name');
  sign?.scale.set(1.18, 1.22, 1);
  const initialBounds = new THREE.Box3().setFromObject(building), center = initialBounds.getCenter(new THREE.Vector3());
  building.position.sub(center); scene.add(building); building.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(building);
  const signBounds = sign ? new THREE.Box3().setFromObject(sign) : null;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0xd7e8d9, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = bounds.min.y - .035; floor.receiveShadow = true; scene.add(floor);
  const camera = new THREE.OrthographicCamera(-16, 16, 10, -10, .1, 160);
  const controls = formulationControls(camera, canvas);
  let width = 1, height = 1, frame = 0, disposed = false;
  function fit() {
    camera.updateMatrixWorld(true);
    let halfX = 0, halfY = 0;
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      const point = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
      halfX = Math.max(halfX, Math.abs(point.x)); halfY = Math.max(halfY, Math.abs(point.y));
    }
    const halfHeight = Math.max(halfY, halfX / (width / height)) * (width <= 1068 ? 1.06 : 1.13);
    camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.right = halfHeight * width / height; camera.left = -camera.right; camera.updateProjectionMatrix();
  }
  function render() {
    frame = 0; if (disposed) return;
    renderer.render(scene, camera);
    canvas.dataset.renderer = 'webgl'; canvas.dataset.zoom = camera.zoom.toFixed(3);
    canvas.dataset.azimuth = controls.getAzimuthalAngle().toFixed(3);
    for (const [key, box] of [['modelArea', bounds], ['signArea', signBounds]] as const) {
      if (!box) continue;
      const projected: THREE.Vector3[] = [];
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) projected.push(new THREE.Vector3(x, y, z).project(camera));
      const xs = projected.map(p => (p.x + 1) * width / 2), ys = projected.map(p => (1 - p.y) * height / 2);
      canvas.dataset[key] = JSON.stringify({ x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) });
    }
    onZoom(camera.zoom);
  }
  function invalidate() { if (!disposed && !frame) frame = requestAnimationFrame(render); }
  function change() { if (camera.zoom <= 1) fit(); invalidate(); }
  controls.addEventListener('change', change);
  function reset() { camera.position.set(18, 12, 28).normalize().multiplyScalar(45); camera.zoom = 1; controls.target.set(0, 0, 0); controls.update(); fit(); invalidate(); }
  function resize() {
    const rect = host.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    renderer.setSize(width, height, false); fit(); invalidate();
  }
  function zoom(factor: number) { camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, .7, 3); camera.updateProjectionMatrix(); controls.update(); invalidate(); }
  function rotate(angle: number) { camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle); controls.update(); change(); }
  function key(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); rotate(event.key === 'ArrowLeft' ? -.2 : .2); }
    else if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(1.2); }
    else if (event.key === '-') { event.preventDefault(); zoom(1 / 1.2); }
    else if (event.key === 'Home') { event.preventDefault(); reset(); }
  }
  function lost(event: Event) { event.preventDefault(); onFailure(); }
  canvas.addEventListener('keydown', key); canvas.addEventListener('webglcontextlost', lost);
  const observer = new ResizeObserver(resize); observer.observe(host); reset(); resize();
  return { reset, rotate, zoom, dispose() {
    disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
    canvas.removeEventListener('keydown', key); canvas.removeEventListener('webglcontextlost', lost);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    scene.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { materials.add(material); const map = (material as THREE.MeshBasicMaterial).map; if (map) textures.add(map); } });
    geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose());
    renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  } };
}
