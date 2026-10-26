import {it,expect} from 'vitest';
import {sevenStages} from '../src/data/sevenStages';
import {islandPositions} from '../src/data/islandStages';
import {planIslandWalk,sampleIslandWalk,ISLAND_WALK_RADIUS,ISLAND_GATE_Z,islandStandingPoint} from '../src/engine/islandWalk';
import {placeIslandLabels} from '../src/engine/islandLabels';
const all=sevenStages.map(s=>s.id);
it('any valid destination is reachable without previous completions; unknown islands are rejected',()=>{
 expect(planIslandWalk('new-training','product-names',[],false)).not.toBeNull();
 expect(planIslandWalk('new-training','family',[],false)).not.toBeNull();
 expect(planIslandWalk('new-training','unknown' as never,[],false)).toBeNull();
});
for(const portrait of [false,true])it('every unlocked replay route uses only neighboring bridges in '+(portrait?'portrait':'desktop'),()=>{
 const positions=islandPositions(portrait);
 for(const from of all)for(const to of all){
  const route=planIslandWalk(from,to,[],portrait)!;expect(route).not.toBeNull();
  const destination=islandStandingPoint(to,portrait,true),end=sampleIslandWalk(route,1);
  expect(end.x).toBeCloseTo(destination.x,8);expect(end.z).toBeCloseTo(destination.z,8);
  for(const p of route.points.filter(p=>p.surface==='bridge')){
   const [a,b]=p.bridge!;expect(Math.abs(all.indexOf(a)-all.indexOf(b))).toBe(1);
  }
  for(let i=0;i<=100;i++){
   const p=sampleIslandWalk(route,i/100);
   if(p.surface==='bridge'&&p.bridge){
    const a=positions[all.indexOf(p.bridge[0])],b=positions[all.indexOf(p.bridge[1])],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    const u=((p.x-a[0])*dx+(p.z-a[1])*dz)/(length*length);
    expect(u).toBeGreaterThanOrEqual(ISLAND_WALK_RADIUS/length-1e-8);
    expect(u).toBeLessThanOrEqual(1-ISLAND_WALK_RADIUS/length+1e-8);
    expect(Math.abs((p.x-a[0])*dz-(p.z-a[1])*dx)/length).toBeLessThan(1e-7);
   }else{
    expect(Math.min(...positions.map(([x,z])=>Math.hypot(p.x-x,p.z-z)))).toBeLessThanOrEqual(ISLAND_WALK_RADIUS+1e-7);
   }
  }
 }
});
it('first island still has a visible approach before entering, but an arrived visit need not replay it',()=>{
 const approach=planIslandWalk('new-training','new-training',[],false,false)!;
 expect(approach.length).toBeCloseTo(ISLAND_WALK_RADIUS-ISLAND_GATE_Z);
 expect(planIslandWalk('new-training','new-training',[],false,true)!.length).toBe(0);
 expect(sampleIslandWalk(approach,-1).z).toBeCloseTo(islandStandingPoint('new-training',false,false).z);
});
it('route order reverses safely when revisiting an earlier island',()=>{
 const route=planIslandWalk('family','new-training',all,false)!;
 expect(route.points.filter(p=>p.surface==='bridge').map(p=>p.bridge)).toEqual(all.slice(1).reverse().map((id,i)=>[id,all[all.length-2-i]]));
});
it('island labels avoid the field representative without leaving the viewport',()=>{
 const avoid=[{id:'person',x:130,y:190,width:42,height:84}];
 const labels=[{id:'one',x:110,y:205,width:148,height:66},{id:'two',x:10,y:370,width:148,height:66}];
 const result=placeIslandLabels(labels,350,670,avoid);
 for(const a of result)for(const b of avoid)expect(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>0&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>0).toBe(false);
 expect(result.every(p=>p.x>=8&&p.y>=8&&p.x+p.width<=342&&p.y+p.height<=662)).toBe(true);
});
