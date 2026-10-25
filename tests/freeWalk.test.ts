import { describe, it, expect } from 'vitest';
import {
  ACTOR_RADIUS,
  cameraRelativeInput,
  clearSegment,
  isWalkable,
  moveWithCollision,
  nearbyLocation,
  obstacles,
  planWalkingRoute,
} from '../src/engine/freeWalk';
import { worldLocations } from '../src/engine/clinic3d';

describe('V4自由行走、碰撞與互動', () => {
  it('所有互動落點與入口可站立，家具中心及診所外不可通行', () => {
    for (const point of Object.values(worldLocations)) expect(isWalkable(point)).toBe(true);
    for (const obstacle of obstacles)
      expect(
        isWalkable({
          x: (obstacle.minX + obstacle.maxX) / 2,
          z: (obstacle.minZ + obstacle.maxZ) / 2,
        }),
      ).toBe(false);
    expect(isWalkable({ x: 9, z: 0 })).toBe(false);
    expect(isWalkable({ x: NaN, z: 0 })).toBe(false);
  });
  it('各互動地點之間與自由走道能找到不穿牆的連續路線', () => {
    for (const from of [...Object.values(worldLocations), { x: -0.5, z: 1.1 }]) {
      for (const to of Object.values(worldLocations)) {
        const route = planWalkingRoute(from, to);
        expect(route[0]).toEqual(from);
        expect(route.at(-1)).toEqual(to);
        for (let i = 1; i < route.length; i++)
          expect(clearSegment(route[i - 1], route[i])).toBe(true);
      }
    }
  });
  it('延遲幀的大位移也不能穿過薄玻璃隔間', () => {
    const start = { x: 0, z: -2 };
    const end = moveWithCollision(start, { x: 4, z: 0 });
    expect(end.x).toBeLessThanOrEqual(0.67 - ACTOR_RADIUS);
    expect(end.z).toBe(start.z);
    expect(isWalkable(end)).toBe(true);
  });
  it('碰到櫃檯後沿邊緣滑行，不能走出地板', () => {
    const end = moveWithCollision({ x: -3, z: 0.6 }, { x: 0.8, z: -2 });
    expect(end.z).toBeGreaterThanOrEqual(-0.32 + ACTOR_RADIUS);
    expect(end.x).toBeCloseTo(-2.2);
    expect(moveWithCollision({ x: -5, z: 0 }, { x: -20, z: 0 }).x).toBeGreaterThanOrEqual(
      -5.74 + ACTOR_RADIUS,
    );
  });
  it('相反鍵互抵、斜走速度一致，旋轉鏡頭後方向仍對應畫面', () => {
    expect(cameraRelativeInput(0, 0, 1)).toEqual({ x: 0, z: 0 });
    const straight = cameraRelativeInput(0, -1, 0),
      diagonal = cameraRelativeInput(1, -1, 0);
    expect(Math.hypot(straight.x, straight.z)).toBeCloseTo(Math.hypot(diagonal.x, diagonal.z));
    expect(cameraRelativeInput(0, -1, Math.PI / 2).x).toBeCloseTo(-1);
    expect(cameraRelativeInput(1, 0, Math.PI / 2).z).toBeCloseTo(-1);
  });
  it('互動需靠近且不能隔牆觸發，離開範圍會清除', () => {
    expect(nearbyLocation(worldLocations.reception)).toBe('reception');
    expect(nearbyLocation(worldLocations.doctor)).toBe('doctor');
    expect(nearbyLocation({ x: 0, z: 1 })).toBeNull();
    expect(nearbyLocation({ x: 1.9, z: -0.8 })).toBeNull();
    expect(nearbyLocation({ x: -2.5, z: -0.6 })).toBeNull();
  });
  it('無效位移不污染位置，不能對不可通行處建立路線', () => {
    const p = { x: 0, z: 1 };
    expect(moveWithCollision(p, { x: Infinity, z: 0 })).toEqual(p);
    expect(() => planWalkingRoute(p, { x: 10, z: 10 })).toThrow();
  });
});
