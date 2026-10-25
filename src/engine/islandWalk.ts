import {sevenStages,type StageId} from '../data/sevenStages';
import {islandPositions,ISLAND_SCENE_SCALE} from '../data/islandStages';
import {stageUnlocked} from './stageProgress';
export const ISLAND_WALK_RADIUS=2.7*ISLAND_SCENE_SCALE;
export const ISLAND_GATE_Z=1.75*ISLAND_SCENE_SCALE;
export interface IslandWalkPoint {x:number;z:number;surface:'island'|'bridge';island:StageId;bridge?:[StageId,StageId];}
export interface IslandWalkRoute {points:IslandWalkPoint[];length:number;from:StageId;to:StageId;}
const distance=(a:IslandWalkPoint,b:IslandWalkPoint)=>Math.hypot(b.x-a.x,b.z-a.z);
export function islandStandingPoint(id:StageId,portrait:boolean,atGate=true):IslandWalkPoint{
 const index=sevenStages.findIndex(s=>s.id===id);if(index<0)throw Error('Unknown island');
 const [x,z]=islandPositions(portrait)[index];return {x,z:z+(atGate?ISLAND_GATE_Z:ISLAND_WALK_RADIUS),surface:'island',island:id};
}
export function planIslandWalk(from:StageId,to:StageId,completed:StageId[],portrait:boolean,fromGate=true):IslandWalkRoute|null{
 if(!stageUnlocked(from,completed)||!stageUnlocked(to,completed))return null;
 const positions=islandPositions(portrait),start=sevenStages.findIndex(s=>s.id===from),end=sevenStages.findIndex(s=>s.id===to);
 if(start<0||end<0)return null;
 const points:IslandWalkPoint[]=[islandStandingPoint(from,portrait,fromGate)];
 const push=(i:number,angle:number,surface:IslandWalkPoint['surface']='island',bridge?:[StageId,StageId])=>{
  points.push({x:positions[i][0]+Math.sin(angle)*ISLAND_WALK_RADIUS,z:positions[i][1]+Math.cos(angle)*ISLAND_WALK_RADIUS,surface,island:sevenStages[i].id,bridge});
 };
 const direction=(a:number,b:number)=>Math.atan2(positions[b][0]-positions[a][0],positions[b][1]-positions[a][1]);
 function arc(i:number,a:number,b:number){
  const turn=Math.atan2(Math.sin(b-a),Math.cos(b-a)),steps=Math.max(1,Math.ceil(Math.abs(turn)/.12));
  for(let k=1;k<=steps;k++)push(i,a+turn*k/steps);
 }
 if(start!==end){
  if(fromGate)push(start,0);
  const step=end>start?1:-1;let angle=0;
  for(let i=start;i!==end;i+=step){
   const next=i+step,exit=direction(i,next);arc(i,angle,exit);
   // Only neighboring islands have bridges. Never cut diagonally across water.
   angle=direction(next,i);push(next,angle,'bridge',[sevenStages[i].id,sevenStages[next].id]);
  }
  arc(end,angle,0);
 }
 points.push(islandStandingPoint(to,portrait,true));
 return {from,to,points,length:points.slice(1).reduce((n,p,i)=>n+distance(points[i],p),0)};
}
export function sampleIslandWalk(route:IslandWalkRoute,progress:number){
 const t=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0)),target=t*route.length;
 let passed=0;
 for(let i=1;i<route.points.length;i++){
  const a=route.points[i-1],b=route.points[i],length=distance(a,b);
  if(length>1e-8&&(passed+length>=target||i===route.points.length-1)){
   const u=Math.max(0,Math.min(1,(target-passed)/length));
   return {x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u,yaw:Math.atan2(b.x-a.x,b.z-a.z),surface:b.surface,bridge:b.bridge};
  }
  passed+=length;
 }
 const p=route.points.at(-1)!;return {x:p.x,z:p.z,yaw:Math.PI,surface:p.surface,bridge:p.bridge};
}
