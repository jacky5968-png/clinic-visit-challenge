import { describe, it, expect } from 'vitest';
import {
  nodes,
  planClinicRoute,
  routeMetrics,
  sceneTransform,
  type LocationId,
} from '../src/engine/clinic';

describe('V2診所路線', () => {
  const ids: LocationId[] = ['entrance', 'reception', 'waiting', 'doctor'];
  it('四個地點間的16種起終點都有連續且不重複的路線', () => {
    for (const from of ids)
      for (const to of ids) {
        const route = planClinicRoute(from, to);
        expect(route[0]).toEqual(nodes[from]);
        expect(route.at(-1)).toEqual(nodes[to]);
        expect(new Set(route.map((p) => `${p.x},${p.y}`)).size).toBe(route.length);
        expect(route.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
      }
  });
  it('相同地點無需走動，回傳獨立座標避免改寫導航資料', () => {
    const route = planClinicRoute('doctor', 'doctor');
    expect(route).toHaveLength(1);
    expect(routeMetrics(route).duration).toBe(0);
    route[0].x = 0;
    expect(nodes.doctor.x).toBe(620);
  });
  it('櫃檯到候診區經過共同走道，不從建築外側繞行或跳回入口', () => {
    const route = planClinicRoute('reception', 'waiting');
    expect(route).toEqual([nodes.reception, nodes.lobby, nodes.corridor, nodes.waiting]);
  });
  it('路段時間依距離分配，轉彎前後維持連續速度', () => {
    const p = [
      { x: 0, y: 0 },
      { x: 30, y: 40 },
      { x: 180, y: 40 },
    ];
    const m = routeMetrics(p);
    expect(m.distance).toBe(200);
    expect(m.offsets).toEqual([0, 0.25, 1]);
    expect(m.duration).toBe(1600);
  });
  it('移動時長有上下限，空路線明確拒絕', () => {
    expect(
      routeMetrics([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]).duration,
    ).toBe(700);
    expect(
      routeMetrics([
        { x: 0, y: 0 },
        { x: 2000, y: 2000 },
      ]).duration,
    ).toBe(4200);
    expect(() => routeMetrics([])).toThrow('路線不能為空');
  });
  it('百分比定位使用一致畫布，可隨視窗尺寸縮放', () => {
    expect(sceneTransform({ x: 450, y: 325 })).toBe('translate(50%, 50%)');
    const m = routeMetrics(planClinicRoute('entrance', 'doctor'));
    expect(m.offsets[0]).toBe(0);
    expect(m.offsets.at(-1)).toBe(1);
    expect(m.offsets.every((offset, i) => !i || offset > m.offsets[i - 1])).toBe(true);
  });
});
