import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import * as THREE from 'three';
import {buildClinic} from '../src/three/buildClinic';
import {sevenStages} from '../src/data/sevenStages';
import {sceneLocations} from '../src/data/sceneLocations';
import {examinerRole} from '../src/data/characterRoles';
import {obstacles,planWalkingRoute,clearSegment} from '../src/engine/freeWalk';
import {worldLocations} from '../src/engine/clinic3d';
beforeEach(()=>vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})}));
afterEach(()=>vi.unstubAllGlobals());
describe('eight scene furniture preserves usable space',()=>{
 for(const stage of sevenStages)it(stage.clinic+' keeps furnishings behind existing collision boundaries and NPCs accessible',()=>{
  const model=buildClinic(stage);
  expect(model.doctor.root.userData.outfit).toBe(examinerRole(stage));
  for(const staff of model.staff) {
   expect(staff.name).toBe(sceneLocations(stage)[staff.location].speaker);
   expect(staff.rig.root.userData.staffName).toBe(staff.name);
  }
  expect(model.root.userData.sceneIdentity).toBeTruthy();
  const regions:Record<string,string>={
   'classroom-student-desks':'藥局領藥檯','classroom-workshop-desks':'掛號櫃台',
   'induction-whiteboard':'藥局藥櫃','product-learning-display':'藥局藥櫃',
   'product-training-screen':'診間後櫃','specialty-equipment':'藥局藥櫃',
   'pharmacy-retail-shelving':'診間後櫃','pharmacy-dispensing-tray':'藥局領藥檯'
  };
  let additions=0;
  for(const [name,region] of Object.entries(regions)){
   const object=model.root.getObjectByName(name);if(!object)continue;additions++;
   const bounds=new THREE.Box3().setFromObject(object),safe=obstacles.find(o=>o.name===region)!;
   expect(bounds.min.x,name+' left').toBeGreaterThanOrEqual(safe.minX-.001);
   expect(bounds.max.x,name+' right').toBeLessThanOrEqual(safe.maxX+.001);
   expect(bounds.min.z,name+' rear').toBeGreaterThanOrEqual(safe.minZ-.001);
   expect(bounds.max.z,name+' front').toBeLessThanOrEqual(safe.maxZ+.001);
  }
  expect(additions).toBeGreaterThan(0);
  if(stage.kind==='training'){
   let visibleMedicines=0;
   model.root.traverseVisible(o=>{if(o.name==='medicine-carton'||o.name==='medicine-bottle')visibleMedicines++;});
   expect(visibleMedicines).toBe(0);
  }
  const destination=worldLocations[stage.target];
  const route=planWalkingRoute(worldLocations.entrance,destination);
  for(let i=1;i<route.length;i++)expect(clearSegment(route[i-1],route[i])).toBe(true);
  expect(model.doctor.root.userData.doctorName).toBe(stage.doctor.name);
  expect(model.markers.size).toBe(4);
 });
 it('all eight have different visual identities',()=>{
  expect(new Set(sevenStages.map(s=>buildClinic(s).root.userData.sceneIdentity)).size).toBe(8);
 });
});
