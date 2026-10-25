import { clinicStaff, staffFootprints } from '../src/data/clinicStaff';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { buildClinic } from '../src/three/buildClinic';
import { visitMissions } from '../src/data/visitMissions';
import { obstacles, isWalkable, nearbyLocation } from '../src/engine/freeWalk';
import { worldLocations } from '../src/engine/clinic3d';
beforeEach(() => {
  vi.stubGlobal('document', { createElement: () => ({
    width: 0, height: 0,
    getContext: () => ({ fillRect() {}, fillText() {} }),
  }) });
});
afterEach(() => vi.unstubAllGlobals());
describe('pharmacy and registration furnishing geometry', () => {
  for (const mission of visitMissions) {
    it(`${mission.clinic} has pharmacy stock, registration equipment and matching collisions`, () => {
      const model = buildClinic(mission);
      const pharmacy = model.root.getObjectByName('pharmacy')!;
      const registration = model.root.getObjectByName('registration')!;
      expect(pharmacy.userData.location).toBe('reception');
      expect(registration.userData.location).toBe('waiting');
      const cartons: THREE.Object3D[] = [], bottles: THREE.Object3D[] = [];
      pharmacy.traverse(o => {
        if (o.name === 'medicine-carton') cartons.push(o);
        if (o.name === 'medicine-bottle') bottles.push(o);
      });
      expect(cartons).toHaveLength(21);
      expect(bottles).toHaveLength(5);
      for(const name of ['registration-computer','health-card-reader','receipt-printer','queue-display']){
        const fixture=registration.getObjectByName(name)!;
        expect(fixture).toBeInstanceOf(THREE.Mesh);
        expect(new THREE.Box3().setFromObject(fixture).isEmpty()).toBe(false);
      }
      for(const [objectName,obstacleName] of [
        ['pharmacy-shelving','藥局藥櫃'],
        ['pharmacy-counter','藥局領藥檯'],
        ['registration-worktop','掛號櫃台']
      ]){
        const b=new THREE.Box3().setFromObject(model.root.getObjectByName(objectName)!);
        const o=obstacles.find(o=>o.name===obstacleName)!;
        expect(b.min.x).toBeGreaterThanOrEqual(o.minX-0.001);
        expect(b.max.x).toBeLessThanOrEqual(o.maxX+0.001);
        expect(b.min.z).toBeGreaterThanOrEqual(o.minZ-0.001);
        expect(b.max.z).toBeLessThanOrEqual(o.maxZ+0.001);
      }
      let seats=0;
      registration.traverse(o=>{
        const p=(o as THREE.Mesh<THREE.BoxGeometry>).geometry?.parameters;
        if(p && 'width' in p && p.width===0.62 && p.height===0.15)seats++;
      });
      expect(seats).toBe(0);
      expect(model.staff).toHaveLength(2);
      for(const profile of clinicStaff) {
        const person = model.root.getObjectByName('staff-' + profile.id)!;
        expect(person.userData.location).toBe(profile.location);
        expect(person.userData.staffName).toBe(profile.name);
        const bounds = new THREE.Box3().setFromObject(person);
        const footprint = staffFootprints.find(o=>o.name===profile.name)!;
        expect(bounds.min.y).toBeGreaterThanOrEqual(0.14);
        expect(bounds.max.y).toBeGreaterThan(1.8);
        expect(bounds.min.x).toBeGreaterThanOrEqual(footprint.minX);
        expect(bounds.max.x).toBeLessThanOrEqual(footprint.maxX);
        expect(bounds.min.z).toBeGreaterThanOrEqual(footprint.minZ);
        expect(bounds.max.z).toBeLessThanOrEqual(footprint.maxZ);
        let uniformParts=0;
        person.traverse(o=>{
          const material=(o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if(material?.color?.getHex()===profile.appearance.coat)uniformParts++;
        });
        expect(uniformParts).toBeGreaterThanOrEqual(3);
      }
      expect(isWalkable(worldLocations.waiting)).toBe(true);
      expect(nearbyLocation(worldLocations.waiting)).toBe('waiting');
    });
  }
});
