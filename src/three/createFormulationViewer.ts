import * as THREE from 'three';
import { formulationControls } from './formulationControls';
import { buildFormulationBuilding } from './buildFormulationBuilding';
import { fitFormulationView } from './fitFormulationView';

function addRoofMotto(building: THREE.Group, renderer: THREE.WebGLRenderer) {
  const text = '誠正精新、造福人群';
  const surface = document.createElement('canvas');
  surface.width = Math.min(4096, renderer.capabilities.maxTextureSize); surface.height = surface.width / 8;
  const context = surface.getContext('2d')!;
  context.font = `700 ${surface.height * .875}px "Microsoft JhengHei","微軟正黑體","Noto Sans CJK TC","Noto Sans TC","Noto Sans CJK JP",sans-serif`;
  context.textAlign = 'center'; context.textBaseline = 'alphabetic';
  const ink = context.measureText(text), y = (surface.height + ink.actualBoundingBoxAscent - ink.actualBoundingBoxDescent) / 2;
  const x = surface.width / 2, maxWidth = surface.width * .947;
  context.lineJoin = 'round'; context.lineWidth = surface.width * .0034; context.strokeStyle = '#603a2d';
  context.strokeText(text, x, y, maxWidth);
  context.fillStyle = '#ffffff'; context.fillText(text, x, y, maxWidth);
  const texture = new THREE.CanvasTexture(surface); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.max(1, Math.min(16, renderer.capabilities.getMaxAnisotropy()));
  const motto = new THREE.Mesh(new THREE.PlaneGeometry(13.3, 2.2), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
  motto.name = 'formulation-roof-motto'; motto.rotation.x = -Math.PI / 2;
  // The roof spans z=-3.375..2.675, so its front/back midpoint is z=-.35.
  motto.position.set(0, 6.31, -.35); building.add(motto);
  return motto;
}

export function createFormulationViewer(host: HTMLElement, onZoom: (zoom: number) => void, onFailure: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.dataset.testid = 'formulation-viewer-canvas'; canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', '生達製劑大樓放大3D模型，屋頂由左至右為「誠正精新、造福人群」；可拖曳旋轉與雙指縮放');
  canvas.dataset.roofMotto = '誠正精新、造福人群';
  host.append(canvas);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe6f4ef);
  scene.add(new THREE.HemisphereLight(0xf9fcff, 0x71968a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff4df, 2.8);
  sun.position.set(-15, 35, 25); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 100 });
  sun.shadow.camera.updateProjectionMatrix(); sun.shadow.normalBias = .03; scene.add(sun);
  let building: THREE.Group;
  let motto: THREE.Mesh;
  try { building = buildFormulationBuilding(); motto = addRoofMotto(building, renderer); }
  catch (error) { renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); throw error; }
  const sign = building.getObjectByName('formulation-building-name');
  sign?.scale.set(1.18, 1.22, 1);
  const initialBounds = new THREE.Box3().setFromObject(building), center = initialBounds.getCenter(new THREE.Vector3());
  building.position.sub(center); scene.add(building); building.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(building);
  const signBounds = sign ? new THREE.Box3().setFromObject(sign) : null;
  const mottoBounds = new THREE.Box3().setFromObject(motto);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0xd7e8d9, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = bounds.min.y - .035; floor.receiveShadow = true; scene.add(floor);
  const camera = new THREE.OrthographicCamera(-16, 16, 10, -10, .1, 160);
  const controls = formulationControls(camera, canvas);
  let width = 1, height = 1, frame = 0, disposed = false;
  function fit() {
    controls.maxZoom = fitFormulationView(camera, bounds, mottoBounds, width, height);
  }
  function render() {
    frame = 0; if (disposed) return;
    renderer.render(scene, camera);
    canvas.dataset.renderer = 'webgl'; canvas.dataset.zoom = camera.zoom.toFixed(3);
    canvas.dataset.maxZoom = controls.maxZoom.toFixed(3);
    canvas.dataset.azimuth = controls.getAzimuthalAngle().toFixed(3);
    for (const [key, box] of [['modelArea', bounds], ['signArea', signBounds], ['roofMottoArea', mottoBounds]] as const) {
      if (!box) continue;
      const projected: THREE.Vector3[] = [];
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) projected.push(new THREE.Vector3(x, y, z).project(camera));
      const xs = projected.map(p => (p.x + 1) * width / 2), ys = projected.map(p => (1 - p.y) * height / 2);
      canvas.dataset[key] = JSON.stringify({ x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) });
    }
    onZoom(camera.zoom);
  }
  function invalidate() { if (!disposed && !frame) frame = requestAnimationFrame(render); }
  function change() { fit(); invalidate(); }
  controls.addEventListener('change', change);
  function reset() { camera.position.set(18, 12, 28).normalize().multiplyScalar(45); camera.zoom = 1; controls.target.set(0, 0, 0); controls.update(); fit(); invalidate(); }
  function resize() {
    const rect = host.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    renderer.setSize(width, height, false); fit(); invalidate();
  }
  function zoom(factor: number) { camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, .7, controls.maxZoom); fit(); controls.update(); invalidate(); }
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
