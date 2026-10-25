import {describe,it,expect} from 'vitest';
import {createPerson} from '../src/three/person';
import {createDoctorAnimator,doctorGesture} from '../src/three/doctorAnimation';
import {visitMissions} from '../src/data/visitMissions';

function seated(index=0) {
 const rig=createPerson(true,visitMissions[index].doctor);
 rig.root.position.set(3.4,-.21,-2.85);
 rig.leftLeg.rotation.x=rig.rightLeg.rotation.x=-Math.PI/2;
 rig.leftKnee.rotation.x=rig.rightKnee.rotation.x=Math.PI/2;
 return rig;
}
function setup(index=0){
 const rig=seated(index),update=createDoctorAnimator(rig);
 const base={dt:1/60,actor:{x:2.7,z:-.8},nearby:'doctor' as 'doctor'|null,talking:false,listening:false,sequence:0,reduced:false};
 function frames(start:number,duration:number,extra:Partial<typeof base>={}){
  let result=update({...base,...extra,now:start});
  for(let i=1;i<=Math.ceil(duration*60);i++)result=update({...base,...extra,now:start+i/60});
  return result;
 }
 return {rig,update,base,frames};
}
describe('seated doctor attention and conversation motion',()=>{
 for(let i=0;i<visitMissions.length;i++)it(visitMissions[i].doctor.name+' faces the visitor without moving the seat or legs',()=>{
  const {rig,frames,base}=setup(i),position=rig.root.position.clone(),actor={...base.actor};
  const result=frames(0,2);
  expect(result.yaw).toBeCloseTo(Math.atan2(actor.x-position.x,actor.z-position.z),2);
  expect(result.bodyYaw).toBeLessThan(0);expect(result.headYaw).toBeLessThan(0);
  expect(rig.root.position.equals(position)).toBe(true);expect(rig.root.rotation.y).toBe(0);
  expect(result.legs).toEqual([-Math.PI/2,-Math.PI/2,Math.PI/2,Math.PI/2]);
  expect(base.actor).toEqual(actor);expect(result.active).toBe(false);
 });
 it('uses short bounded gestures and settles after the envelope',()=>{
  for(const age of [-1,0,.2,.6,.9,1.4,100])for(const listening of [false,true]){
   const p=doctorGesture(age,listening);
   expect(Number.isFinite(p.nod+p.lean+p.hand)).toBe(true);
   expect(p.nod).toBeGreaterThanOrEqual(0);expect(p.nod).toBeLessThanOrEqual(.13);
   expect(p.lean).toBeLessThanOrEqual(.025);expect(p.hand).toBeLessThanOrEqual(.065);
   if(listening)expect(p.hand).toBe(0);
  }
  expect(doctorGesture(2,false)).toEqual({nod:0,lean:0,hand:0,active:false});
 });
 it('nods on each speaking or listening turn without replaying while idle',()=>{
  const {frames}=setup();frames(0,2);
  const speech=frames(3,.3,{talking:true});
  expect(speech.nod).toBeGreaterThan(.01);expect(speech.hand).toBeGreaterThan(.01);
  const idle=frames(3.3,3,{talking:true});
  expect(idle.active).toBe(false);expect(idle.nod).toBe(0);expect(idle.hand).toBe(0);
  const listening=frames(7,.3,{talking:true,listening:true,sequence:1});
  expect(listening.listening).toBe(true);expect(listening.nod).toBeGreaterThan(.01);
  expect(listening.hand).toBe(0);
  const next=frames(8,.3,{talking:true,sequence:2});
  expect(next.nod).toBeGreaterThan(.01);expect(next.hand).toBeGreaterThan(.01);
 });
 it('returns the upper body to its original pose after the visitor leaves',()=>{
  const {rig,frames}=setup(),position=rig.root.position.clone();
  frames(0,.4,{talking:true});
  const rest=frames(1,3,{nearby:null});
  expect(rest.active).toBe(false);expect(rest.attending).toBe(false);
  expect(rest.bodyYaw).toBe(0);expect(rest.headYaw).toBe(0);
  expect(rest.nod).toBe(0);expect(rest.lean).toBe(0);expect(rest.hand).toBe(0);
  expect(rig.root.position.equals(position)).toBe(true);
  expect(rest.legs).toEqual([-Math.PI/2,-Math.PI/2,Math.PI/2,Math.PI/2]);
 });
 it('honors reduced motion immediately even when changed during a nod',()=>{
  const {frames,update,base}=setup();
  expect(frames(0,.3,{talking:true}).nod).toBeGreaterThan(.01);
  const p=update({...base,now:.4,talking:true,reduced:true,actor:{x:4,z:-.8}});
  expect(p.active).toBe(false);expect(p.nod).toBe(0);expect(p.lean).toBe(0);expect(p.hand).toBe(0);
  expect(p.yaw).toBeCloseTo(Math.atan2(.6,2.05),5);
 });
 it('limits seated twisting and eventually stops rendering even for a visitor behind the seat',()=>{
  const {frames}=setup();
  const p=frames(0,4,{actor:{x:3.4,z:-5}});
  expect(Math.abs(p.bodyYaw)).toBeLessThanOrEqual(.45);
  expect(Math.abs(p.headYaw)).toBeLessThanOrEqual(.65);
  expect(p.active).toBe(false);expect(p.nod).toBe(0);
 });
});
