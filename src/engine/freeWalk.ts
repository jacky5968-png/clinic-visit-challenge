import { staffFootprints } from '../data/clinicStaff';
import type { LocationId } from './clinic';
import { worldLocations, type WorldPoint } from './clinic3d';

export type WalkDirection = 'up' | 'down' | 'left' | 'right';
export const WALK_SPEED = 2.35;
export const ACTOR_RADIUS = 0.24;
export interface Obstacle {
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
// Ground footprints of the furniture and partitions in buildClinic.ts, in meters.
export const obstacles: Obstacle[] = [
  ...staffFootprints,
  { name: '藥局領藥檯', minX: -4.95, maxX: -1.35, minZ: -1.38, maxZ: -0.32 },
  { name: '藥局藥櫃', minX: -5.11, maxX: -2.09, minZ: -4.15, maxZ: -3.42 },
  { name: '診間玻璃隔間', minX: 0.67, maxX: 0.79, minZ: -4.32, maxZ: -0.32 },
  { name: '診間左矮牆', minX: 0.73, maxX: 2.21, minZ: -0.455, maxZ: -0.305 },
  { name: '診間右矮牆', minX: 4.58, maxX: 5.66, minZ: -0.455, maxZ: -0.305 },
  { name: '醫師診桌', minX: 1.83, maxX: 4.87, minZ: -2.5, maxZ: -1.42 },
  { name: '醫師與座椅', minX: 3.05, maxX: 3.75, minZ: -3.2, maxZ: -2.52 },
  { name: '診間後櫃', minX: 2.17, maxX: 5.07, minZ: -4.27, maxZ: -3.51 },
  { name: '掛號櫃台', minX: 1.39, maxX: 4.51, minZ: 1.2, maxZ: 2.04 },
  { name: '飲水機', minX: 4.85, maxX: 5.31, minZ: 3.38, maxZ: 3.82 },
  { name: '入口右矮牆', minX: -1.5, maxX: 1.3, minZ: 4.32, maxZ: 4.46 },
  { name: '入口左矮牆', minX: -5.15, maxX: -3.95, minZ: 4.32, maxZ: 4.46 },
  { name: '入口左門片', minX: -3.6, maxX: -3.2, minZ: 4.3, maxZ: 4.46 },
  { name: '入口右門片', minX: -2, maxX: -1.6, minZ: 4.3, maxZ: 4.46 },
  { name: '入口盆栽', minX: -5.24, maxX: -4.8, minZ: 3.08, maxZ: 3.52 },
  { name: '掛號區盆栽', minX: 4.84, maxX: 5.26, minZ: 0.79, maxZ: 1.21 },
];
export function isWalkable(point: WorldPoint, radius = ACTOR_RADIUS): boolean {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) return false;
  const main =
    point.x >= -5.74 + radius &&
    point.x <= 5.74 - radius &&
    point.z >= -4.33 + radius &&
    point.z <= 4.34 - radius;
  const porch =
    point.x >= -3.48 + radius &&
    point.x <= -1.72 - radius &&
    point.z >= 3.8 &&
    point.z <= 5.35 - radius;
  // Preserve the V3 starting point on the entrance mat.
  const entryMat =
    point.x >= -3.48 + radius && point.x <= -1.65 && point.z >= 4.7 && point.z <= 5.35 - radius;
  if (!main && !porch && !entryMat) return false;
  return !obstacles.some(
    (o) =>
      point.x > o.minX - radius &&
      point.x < o.maxX + radius &&
      point.z > o.minZ - radius &&
      point.z < o.maxZ + radius,
  );
}
export function clearSegment(a: WorldPoint, b: WorldPoint): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.07));
  for (let i = 0; i <= steps; i++) {
    if (!isWalkable({ x: a.x + ((b.x - a.x) * i) / steps, z: a.z + ((b.z - a.z) * i) / steps }))
      return false;
  }
  return true;
}
export function moveWithCollision(from: WorldPoint, delta: WorldPoint): WorldPoint {
  if (![delta.x, delta.z].every(Number.isFinite)) return { ...from };
  let p = { ...from };
  // Substeps prevent tunneling through thin partitions even after a delayed frame.
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / 0.055));
  for (let i = 0; i < steps; i++) {
    const nextX = { x: p.x + delta.x / steps, z: p.z };
    if (isWalkable(nextX)) p = nextX;
    const nextZ = { x: p.x, z: p.z + delta.z / steps };
    if (isWalkable(nextZ)) p = nextZ;
  }
  return p;
}
export function cameraRelativeInput(
  horizontal: number,
  vertical: number,
  azimuth: number,
): WorldPoint {
  const length = Math.max(1, Math.hypot(horizontal, vertical));
  const x = horizontal / length,
    z = vertical / length;
  return {
    x: x * Math.cos(azimuth) + z * Math.sin(azimuth),
    z: -x * Math.sin(azimuth) + z * Math.cos(azimuth),
  };
}
export function nearbyLocation(point: WorldPoint): LocationId | null {
  const ranges: Record<LocationId, number> = {
    entrance: 0.9,
    reception: 1.15,
    waiting: 0.85,
    doctor: 0.95,
  };
  let closest: LocationId | null = null,
    distance = Infinity;
  for (const id of Object.keys(ranges) as LocationId[]) {
    const p = worldLocations[id],
      d = Math.hypot(p.x - point.x, p.z - point.z);
    // Check the line to the interaction spot too: no talking through a partition.
    if (d <= ranges[id] && d < distance && clearSegment(point, p)) {
      closest = id;
      distance = d;
    }
  }
  return closest;
}

const STEP = 0.25;
const grid = new Map<string, WorldPoint>();
for (let ix = 0; ix <= 44; ix++)
  for (let iz = 0; iz <= 37; iz++) {
    const point = { x: -5.5 + ix * STEP, z: -4 + iz * STEP };
    if (isWalkable(point)) grid.set(`${ix},${iz}`, point);
  }
const distance = (a: WorldPoint, b: WorldPoint) => Math.hypot(a.x - b.x, a.z - b.z);
// A* gives the optional click-to-go controls a safe route from ANY free-walk position.
export function planWalkingRoute(from: WorldPoint, to: WorldPoint): WorldPoint[] {
  if (!isWalkable(from) || !isWalkable(to)) throw new Error('目前位置無法建立安全路線');
  if (clearSegment(from, to)) return [{ ...from }, { ...to }];
  function connect(point: WorldPoint) {
    return [...grid]
      .sort((a, b) => distance(a[1], point) - distance(b[1], point))
      .find(([, node]) => clearSegment(point, node))?.[0];
  }
  const start = connect(from),
    end = connect(to);
  if (!start || !end) throw new Error('找不到可通行的走道');
  const open = new Set([start]),
    previous = new Map<string, string>(),
    costs = new Map([[start, 0]]);
  while (open.size) {
    const current = [...open].reduce((a, b) =>
      costs.get(a)! + distance(grid.get(a)!, to) <= costs.get(b)! + distance(grid.get(b)!, to)
        ? a
        : b,
    );
    if (current === end) {
      const path = [to, grid.get(end)!];
      let key = end;
      while (previous.has(key)) {
        key = previous.get(key)!;
        path.push(grid.get(key)!);
      }
      path.push(from);
      path.reverse();
      const smooth = [path[0]];
      let i = 0;
      while (i < path.length - 1) {
        let j = path.length - 1;
        while (j > i + 1 && !clearSegment(path[i], path[j])) j--;
        smooth.push(path[j]);
        i = j;
      }
      return smooth.map((p) => ({ ...p }));
    }
    open.delete(current);
    const [ix, iz] = current.split(',').map(Number);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]) {
      const next = `${ix + dx},${iz + dz}`,
        point = grid.get(next);
      if (!point || !clearSegment(grid.get(current)!, point)) continue;
      const cost = costs.get(current)! + distance(grid.get(current)!, point);
      if (cost >= (costs.get(next) ?? Infinity)) continue;
      costs.set(next, cost);
      previous.set(next, current);
      open.add(next);
    }
  }
  throw new Error('找不到可通行的走道');
}
