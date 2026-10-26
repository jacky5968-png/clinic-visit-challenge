export type LocationId = 'entrance' | 'reception' | 'waiting' | 'doctor';
export type NodeId = LocationId | 'threshold' | 'lobby' | 'corridor';
export interface Point {
  x: number;
  y: number;
}
export interface ClinicProgress {
  location: LocationId;
  destination: LocationId | null;
  moving: boolean;
  visited: LocationId[];
  freeRoam?: boolean;
  manualMoving?: boolean;
  nearby?: LocationId | null;
}

// Coordinates belong to the original 900×650 illustration, not viewport pixels.
export const nodes: Record<NodeId, Point> = {
  entrance: { x: 270, y: 382 },
  threshold: { x: 280, y: 350 },
  lobby: { x: 415, y: 350 },
  reception: { x: 390, y: 300 },
  corridor: { x: 510, y: 370 },
  waiting: { x: 520, y: 425 },
  doctor: { x: 620, y: 370 },
};
const edges: [NodeId, NodeId][] = [
  ['entrance', 'threshold'],
  ['threshold', 'lobby'],
  ['lobby', 'reception'],
  ['lobby', 'corridor'],
  ['corridor', 'waiting'],
  ['corridor', 'doctor'],
];

export const locations: Record<
  LocationId,
  {
    name: string;
    marker: string;
    label: Point;
    speaker: string;
    message: string;
  }
> = {
  entrance: {
    name: '診所入口',
    marker: '00',
    label: { x: 170, y: 425 },
    speaker: '拜訪準備',
    message: '產品資料已備妥。可以先到藥局打招呼，也可以直接前往醫師診間。',
  },
  reception: {
    name: '藥局',
    marker: '01',
    label: { x: 275, y: 260 },
    speaker: '藥師',
    message: '您好，歡迎來到藥局。我是這裡的藥師，產品資料已確認，請帶著準備好的資料前往醫師診間。',
  },
  waiting: {
    name: '掛號櫃台',
    marker: '02',
    label: { x: 650, y: 475 },
    speaker: '護理師',
    message: '您好，拜訪報到已完成。陳醫師已知道您的來意，請帶著產品資料前往醫師診間。',
  },
  doctor: {
    name: '醫師診間',
    marker: '03',
    label: { x: 635, y: 250 },
    speaker: '診間已抵達',
    message: '已抵達醫師診間。點擊「進入診間」，展開產品介紹與10題挑戰。',
  },
};

export function planClinicRoute(from: LocationId, to: LocationId): Point[] {
  if (from === to) return [{ ...nodes[from] }];
  const queue: NodeId[] = [from];
  const previous = new Map<NodeId, NodeId | null>([[from, null]]);
  while (queue.length) {
    const current = queue.shift()!;
    if (current === to) break;
    for (const edge of edges) {
      const next = edge[0] === current ? edge[1] : edge[1] === current ? edge[0] : null;
      if (next && !previous.has(next)) {
        previous.set(next, current);
        queue.push(next);
      }
    }
  }
  if (!previous.has(to)) throw new Error('找不到診所路線');
  const path: Point[] = [];
  for (let current: NodeId | null = to; current; current = previous.get(current) ?? null)
    path.unshift({ ...nodes[current] });
  return path;
}

export function routeMetrics(points: Point[]) {
  if (!points.length) throw new Error('路線不能為空');
  const lengths = points.map((p, i) =>
    i ? Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) : 0,
  );
  const distance = lengths.reduce((sum, n) => sum + n, 0);
  let traveled = 0;
  const offsets = lengths.map((n) => {
    traveled += n;
    return distance ? traveled / distance : 0;
  });
  return {
    distance,
    offsets,
    duration: distance ? Math.min(4200, Math.max(700, distance * 8)) : 0,
  };
}

export const sceneTransform = (point: Point) =>
  `translate(${((point.x + 100) / 1100) * 100}%, ${(point.y / 650) * 100}%)`;
export const initialClinicProgress: ClinicProgress = {
  location: 'entrance',
  destination: null,
  moving: false,
  visited: [],
};
