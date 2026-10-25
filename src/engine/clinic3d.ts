import { nodes, type LocationId, type Point } from './clinic';
export interface WorldPoint {
  x: number;
  z: number;
}
export const CAMERA_LIMITS = { minZoom: 0.65, maxZoom: 2.25, minPolar: 0.28, maxPolar: 1.22 };

// Invert the V2 isometric drawing into the same clinic floor plan, in meters.
export function clinicToWorld(point: Point): WorldPoint {
  const sum = (point.y - 160) / 0.46,
    difference = (point.x - 450) / 0.86;
  return { x: ((sum + difference) / 2 - 210) * 0.027, z: ((sum - difference) / 2 - 160) * 0.027 };
}
export function worldToClinic(point: WorldPoint): Point {
  const x = point.x / 0.027 + 210,
    z = point.z / 0.027 + 160;
  return { x: 450 + 0.86 * (x - z), y: 160 + 0.46 * (x + z) };
}
export const worldLocations = Object.fromEntries(
  Object.entries(nodes).map(([id, point]) => [id, clinicToWorld(point)]),
) as Record<keyof typeof nodes, WorldPoint>;
export function worldRouteMetrics(points: Point[]) {
  if (!points.length) throw new Error('路線不能為空');
  const world = points.map(clinicToWorld);
  const lengths = world.map((p, i) =>
    i ? Math.hypot(p.x - world[i - 1].x, p.z - world[i - 1].z) : 0,
  );
  const distance = lengths.reduce((sum, n) => sum + n, 0);
  return {
    world,
    lengths,
    distance,
    duration: distance ? Math.min(6000, Math.max(600, (distance / 2.35) * 1000)) : 0,
  };
}
export function sampleWorldRoute(points: Point[], progress: number) {
  const { world, lengths, distance } = worldRouteMetrics(points);
  const fraction = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  let remaining = distance * fraction;
  for (let i = 1; i < world.length; i++) {
    if (remaining <= lengths[i] || i === world.length - 1) {
      const t = lengths[i] ? Math.min(1, remaining / lengths[i]) : 0,
        a = world[i - 1],
        b = world[i];
      return {
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        yaw: Math.atan2(b.x - a.x, b.z - a.z),
      };
    }
    remaining -= lengths[i];
  }
  return { ...world[0], yaw: 0 };
}
export function clampZoom(zoom: number) {
  return Math.max(
    CAMERA_LIMITS.minZoom,
    Math.min(CAMERA_LIMITS.maxZoom, Number.isFinite(zoom) ? zoom : 1),
  );
}
export const labelAnchors: Record<LocationId, { x: number; y: number; z: number }> = {
  entrance: { ...worldLocations.entrance, y: 0.95 },
  reception: { x: -3.05, y: 1.9, z: -0.3 },
  waiting: { x: 3, y: 2.3, z: 1.62 },
  doctor: { x: 3.4, y: 2.2, z: -2.4 },
};
