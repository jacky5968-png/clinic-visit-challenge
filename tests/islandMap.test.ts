import {it,expect,beforeEach,afterEach,vi} from 'vitest';
import {buildIslands} from '../src/three/buildIslands';
import {sevenStages} from '../src/data/sevenStages';
import {islandPositions,ISLAND_SCENE_SCALE} from '../src/data/islandStages';
import {placeIslandLabels} from '../src/engine/islandLabels';
beforeEach(()=>vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})}));
afterEach(()=>vi.unstubAllGlobals());
for(const portrait of [false,true])it('seven islands remain physically separated in '+(portrait?'portrait':'landscape'),()=>{
 const points=islandPositions(portrait);expect(points).toHaveLength(7);
 for(let i=0;i<7;i++)for(let j=i+1;j<7;j++)expect(Math.hypot(points[i][0]-points[j][0],points[i][1]-points[j][1])).toBeGreaterThan(7.3*ISLAND_SCENE_SCALE);
 const model=buildIslands();model.layout(portrait);
 expect(model.islands.map(g=>g.userData.stageId)).toEqual(sevenStages.map(s=>s.id));
 expect(model.bridges).toHaveLength(6);
 model.islands.forEach((g,i)=>{expect(g.position.x).toBe(points[i][0]);expect(g.position.z).toBe(points[i][1]);expect(g.getObjectByName('building-'+sevenStages[i].id)).toBeTruthy();});
 expect(model.bridges.every(b=>b.scale.z>0)).toBe(true);
});
for(const portrait of [false,true])it('short bridges avoid unrelated island platforms in '+(portrait?'portrait':'landscape'),()=>{
 const points=islandPositions(portrait),model=buildIslands();model.layout(portrait);
 const previous=portrait?[[-5.2,27],[5.2,27],[5.2,9],[-5.2,9],[-5.2,-9],[5.2,-9],[0,-33]]:[[-18,8],[0,8],[18,8],[18,-2],[0,-2],[-18,-2],[0,-25]];
 for(let i=0;i<6;i++){
  const a=points[i],b=points[i+1],dx=b[0]-a[0],dz=b[1]-a[1],squared=dx*dx+dz*dz;
  const previousDeck=Math.hypot(previous[i+1][0]-previous[i][0],previous[i+1][1]-previous[i][1])-5.4+.16;
  expect(model.bridges[i].scale.z).toBeLessThan(previousDeck);
  for(let j=0;j<7;j++)if(j!==i&&j!==i+1){
   const p=points[j],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/squared));
   expect(Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz)).toBeGreaterThan(3.65*ISLAND_SCENE_SCALE+.5);
  }
 }
});
it('selection halo follows selected stage; completion does not add or remove islands',()=>{
 const model=buildIslands();model.state('ent',['new-training','product-names']);
 expect(model.markers.filter(m=>m.visible)).toEqual([model.markers[2]]);
 expect(model.islands).toHaveLength(7);
});
for(const [width,height,labelWidth] of [[350,670,148],[736,650,172],[296,670,136]])it('labels stay inside '+width+'px viewport and separate overlapping pairs',()=>{
 const labels=Array.from({length:7},(_,i)=>({id:String(i),x:i%2===0?10:width-labelWidth-10,y:80+Math.floor(i/2)*145,width:labelWidth,height:66}));
 labels[0].y=labels[2].y-35;
 const placed=placeIslandLabels(labels,width,height);
 for(const p of placed){expect(p.x).toBeGreaterThanOrEqual(8);expect(p.y).toBeGreaterThanOrEqual(8);expect(p.x+p.width).toBeLessThanOrEqual(width-8);expect(p.y+p.height).toBeLessThanOrEqual(height-8);}
 for(let i=0;i<7;i++)for(let j=i+1;j<7;j++){const a=placed[i],b=placed[j];expect(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>1).toBe(false);}
});
