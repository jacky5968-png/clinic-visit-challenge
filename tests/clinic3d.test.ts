import { describe, it, expect } from 'vitest';
import { nodes, planClinicRoute } from '../src/engine/clinic';
import {
  clinicToWorld,
  worldToClinic,
  sampleWorldRoute,
  worldRouteMetrics,
  worldLocations,
  clampZoom,
  CAMERA_LIMITS,
} from '../src/engine/clinic3d';
import { createPerson } from '../src/three/person';

describe('V3世界座標與路線', () => {
  it('全部V2導航點可往返3D地面座標，保留既有診所拓樸', () => {
    for (const point of Object.values(nodes)) {
      const restored = worldToClinic(clinicToWorld(point));
      expect(restored.x).toBeCloseTo(point.x, 8);
      expect(restored.y).toBeCloseTo(point.y, 8);
    }
  });
  it('入口在建築前方、醫師在診間，無NaN或無限座標', () => {
    expect(worldLocations.entrance.z).toBeGreaterThan(4.3);
    expect(worldLocations.doctor.x).toBeGreaterThan(0.7);
    expect(worldLocations.doctor.z).toBeLessThan(0);
    expect(
      Object.values(worldLocations).every((p) => Number.isFinite(p.x) && Number.isFinite(p.z)),
    ).toBe(true);
  });
  it('3D路線起點終點與原導航位置一致', () => {
    const route = planClinicRoute('entrance', 'doctor');
    const a = sampleWorldRoute(route, 0),
      b = sampleWorldRoute(route, 1);
    expect(a.x).toBeCloseTo(worldLocations.entrance.x);
    expect(a.z).toBeCloseTo(worldLocations.entrance.z);
    expect(b.x).toBeCloseTo(worldLocations.doctor.x);
    expect(b.z).toBeCloseTo(worldLocations.doctor.z);
  });
  it('沿實際世界距離分配速度，取樣落於連續路段內', () => {
    const points = [
      worldToClinic({ x: 0, z: 0 }),
      worldToClinic({ x: 3, z: 0 }),
      worldToClinic({ x: 3, z: 1 }),
    ];
    const m = worldRouteMetrics(points);
    expect(m.distance).toBeCloseTo(4);
    expect(sampleWorldRoute(points, 0.5).x).toBeCloseTo(2);
    expect(sampleWorldRoute(points, 0.5).z).toBeCloseTo(0);
    expect(sampleWorldRoute(points, 0.875).x).toBeCloseTo(3);
    expect(sampleWorldRoute(points, 0.875).z).toBeCloseTo(0.5);
  });
  it('同地點與邊界進度安全處理，空路線拒絕', () => {
    const route = planClinicRoute('waiting', 'waiting');
    expect(worldRouteMetrics(route).duration).toBe(0);
    for (const value of [-10, 2, NaN]) {
      const sample = sampleWorldRoute(route, value);
      expect(sample.x).toBeCloseTo(worldLocations.waiting.x);
    }
    expect(() => worldRouteMetrics([])).toThrow('路線不能為空');
  });
  it('縮放不能穿越上下限，無效輸入回到預設', () => {
    expect(clampZoom(99)).toBe(CAMERA_LIMITS.maxZoom);
    expect(clampZoom(-1)).toBe(CAMERA_LIMITS.minZoom);
    expect(clampZoom(NaN)).toBe(1);
  });
  it('3D人物雙腿與手臂有交替步態，停止時回到站姿', () => {
    const person = createPerson();
    person.pose(Math.PI / 2, true);
    expect(person.leftLeg.rotation.x).toBeGreaterThan(0);
    expect(person.rightLeg.rotation.x).toBeLessThan(0);
    expect(person.rightKnee.rotation.x).toBeGreaterThan(0);
    expect(person.leftArm.rotation.x * person.rightArm.rotation.x).toBeLessThan(0);
    person.pose(0, false);
    expect(person.leftLeg.rotation.x).toBe(0);
    expect(person.rightLeg.rotation.x).toBeCloseTo(0);
    expect(person.body.position.y).toBe(0);
  });
});
