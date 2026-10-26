import { Box3, MathUtils, OrthographicCamera, Vector3 } from 'three';

function viewBounds(box: Box3, camera: OrthographicCamera) {
  const result = new Box3();
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    result.expandByPoint(new Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
  }
  return result;
}

// Keep the whole building at 100%, then retain the complete roof motto when zooming.
export function fitFormulationView(camera: OrthographicCamera, building: Box3, motto: Box3, width: number, height: number) {
  camera.updateMatrixWorld(true);
  const model = viewBounds(building, camera), roof = viewBounds(motto, camera), aspect = width / height;
  const halfX = Math.max(Math.abs(model.min.x), Math.abs(model.max.x));
  const halfY = Math.max(Math.abs(model.min.y), Math.abs(model.max.y));
  const halfHeight = Math.max(halfY, halfX / aspect) * (width <= 1068 ? 1.06 : 1.13), halfWidth = halfHeight * aspect;
  const safe = .92;
  const maxZoom = Math.min(3, 2 * halfWidth * safe / Math.max(roof.max.x - roof.min.x, 1e-6), 2 * halfHeight * safe / Math.max(roof.max.y - roof.min.y, 1e-6));
  camera.zoom = MathUtils.clamp(camera.zoom, .7, maxZoom);
  const visibleX = halfWidth * safe / camera.zoom, visibleY = halfHeight * safe / camera.zoom;
  const centerX = MathUtils.clamp(0, roof.max.x - visibleX, roof.min.x + visibleX);
  const centerY = MathUtils.clamp(0, roof.max.y - visibleY, roof.min.y + visibleY);
  camera.left = centerX - halfWidth; camera.right = centerX + halfWidth;
  camera.bottom = centerY - halfHeight; camera.top = centerY + halfHeight;
  camera.updateProjectionMatrix();
  return maxZoom;
}
