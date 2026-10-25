import { describe,it,expect } from 'vitest';
import {createPerson} from '../src/three/person';
import {createStaffAnimator,shortestAngle,staffGestureFrame} from '../src/three/staffAnimation';
import {staffSmallTalk} from '../src/data/staffSmallTalk';
describe('staff welcome and conversation',()=>{
 it('cycles both staff greetings and keeps them distinct',()=>{
  for(const id of ['reception','waiting'] as const){
   expect(staffSmallTalk(id,0).greeting).toContain('早安');
   expect(staffSmallTalk(id,1)).not.toEqual(staffSmallTalk(id,0));
   expect(staffSmallTalk(id,3)).toEqual(staffSmallTalk(id,0));
   expect(staffSmallTalk(id,-1)).toEqual(staffSmallTalk(id,2));
   expect(staffSmallTalk(id,0).reply).toContain('早安');
  }
 });
 it('uses shortest rotation across the angle boundary',()=>{
  expect(shortestAngle(Math.PI-.1,-Math.PI+.1)).toBeCloseTo(.2);
 });
 it('has bounded gestures, finite idle values and reduced motion',()=>{
  for(const w of [null,-1,0,.4,1.8,10])for(const t of [null,-1,0,.3,1.6,10]){
   const pose=staffGestureFrame(w,t,false);
   expect(Number.isFinite(pose.wave+pose.nod+pose.hand)).toBe(true);
   expect(Math.abs(pose.nod)).toBeLessThanOrEqual(.14);
  }
  expect(staffGestureFrame(.4,.3,true)).toEqual({wave:0,nod:0,hand:0,active:false});
  expect(staffGestureFrame(3,3,false).active).toBe(false);
 });
 it('faces visitor, waves once, nods on repeated speech and returns to rest without moving',()=>{
  const rig=createPerson(true,{hair:0,coat:0xffffff,glasses:true,stethoscope:false});
  rig.root.position.set(2,.14,-2);rig.root.rotation.y=.7;
  const original=rig.root.position.clone();
  const update=createStaffAnimator([{id:'pharmacist',location:'reception',rig}]);
  const base={dt:.1,actor:{x:0,z:0},nearby:'reception' as const,conversation:null,sequence:0,reduced:false};
  update({...base,now:0});
  const wave=update({...base,now:.4});
  expect(wave.frames[0].wave).toBeGreaterThan(.5);
  expect(Math.abs(shortestAngle(rig.root.rotation.y,-Math.PI/4))).toBeLessThan(1);
  expect(update({...base,now:3}).frames[0].wave).toBeCloseTo(0);
  update({...base,now:4,conversation:'reception',sequence:1});
  expect(Math.abs(update({...base,now:4.3,conversation:'reception',sequence:1}).frames[0].nod)).toBeGreaterThan(.01);
  expect(update({...base,now:6,conversation:'reception',sequence:1}).frames[0].nod).toBeCloseTo(0);
  update({...base,now:7,conversation:'reception',sequence:2});
  expect(Math.abs(update({...base,now:7.3,conversation:'reception',sequence:2}).frames[0].nod)).toBeGreaterThan(.01);
  for(let i=0;i<100;i++)update({...base,nearby:null,now:8+i*.1});
  expect(rig.root.rotation.y).toBeCloseTo(.7);
  expect(rig.head.rotation.x).toBeCloseTo(0);
  expect(rig.rightArm.rotation.z).toBeCloseTo(0);
  expect(rig.root.position.equals(original)).toBe(true);
  expect(rig.leftLeg.rotation.x).toBeCloseTo(0);
 });
 it('snaps facing with no gestures when reduced motion is requested',()=>{
  const rig=createPerson(true);
  const update=createStaffAnimator([{id:'registration',location:'waiting',rig}]);
  const result=update({now:0,dt:.01,actor:{x:2,z:0},nearby:'waiting',conversation:'waiting',sequence:1,reduced:true});
  expect(rig.root.rotation.y).toBeCloseTo(Math.PI/2);
  expect(result.active).toBe(false);
  expect(result.frames[0].wave).toBeCloseTo(0);
  expect(result.frames[0].nod).toBeCloseTo(0);
 });
});
