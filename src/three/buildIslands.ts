import {ISLAND_WALK_RADIUS} from '../engine/islandWalk';
import {buildFormulationBuilding} from './buildFormulationBuilding';
import * as THREE from 'three';
import {sevenStages,type StageId} from '../data/sevenStages';
import {islandPositions,islandThemes,ISLAND_SCENE_SCALE} from '../data/islandStages';
export function buildIslands(){
 const root=new THREE.Group(),islands:THREE.Group[]=[],bridges:THREE.Group[]=[],markers:THREE.Mesh[]=[],flags:THREE.Mesh[]=[];
 const materials=new Map<number,THREE.MeshStandardMaterial>();
 const material=(color:number)=>{let m=materials.get(color);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.88,flatShading:true});materials.set(color,m);}return m;};
 const cream=material(0xffedc3),white=material(0xfffdf4),dark=material(0x183e58),wood=material(0xb87838),grass=material(0x58b969),trunk=material(0x83532e);
 function box(p:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material){
  const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;
 }
 function cyl(p:THREE.Object3D,r:number,h:number,x:number,y:number,z:number,m:THREE.Material,segments=10,bottom=r){
  const o=new THREE.Mesh(new THREE.CylinderGeometry(r,bottom,h,segments),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;
 }
 function sphere(p:THREE.Object3D,r:number,x:number,y:number,z:number,m:THREE.Material){
  const o=new THREE.Mesh(new THREE.IcosahedronGeometry(r,0),m);o.position.set(x,y,z);o.castShadow=true;p.add(o);return o;
 }
 function sign(p:THREE.Object3D,value:string,x:number,y:number,z:number,width=2){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff9eb';ctx.fillRect(0,0,768,160);ctx.fillStyle='#173747';
  ctx.font='700 82px "Microsoft JhengHei","微軟正黑體",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(value,384,84,730);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const o=new THREE.Mesh(new THREE.PlaneGeometry(width,.4),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false}));o.position.set(x,y,z);p.add(o);
 }
 function tree(p:THREE.Object3D,x:number,z:number,s=1,autumn=false){
  cyl(p,.07*s,.65*s,x,1.35+.3*s,z,trunk,5);
  const leaf=new THREE.Mesh(new THREE.ConeGeometry(.42*s,1.05*s,6),material(autumn?0xffb72e:0x288e49));leaf.position.set(x,1.35+1.02*s,z);leaf.castShadow=true;p.add(leaf);
 }
 function desk(p:THREE.Object3D,x:number,z:number,c:THREE.Material){
  box(p,.58,.08,.4,x,.47,z,c);box(p,.08,.36,.28,x,.25,z,wood);box(p,.28,.23,.13,x,.26,z+.35,white);box(p,.24,.025,.2,x,.525,z,white);
 }
 function monitor(p:THREE.Object3D,x:number,y:number,z:number){
  box(p,.52,.4,.06,x,y,z,dark);box(p,.43,.3,.02,x,y,z+.035,material(0x7cc5d5));box(p,.07,.18,.07,x,y-.27,z,dark);
 }
 function bed(p:THREE.Object3D,x:number,z:number,c:THREE.Material){
  box(p,1.4,.2,.58,x,.53,z,c);box(p,.3,.1,.48,x-.48,.68,z,white);for(const dx of [-.52,.52])box(p,.07,.36,.42,x+dx,.28,z,dark);
 }
 const sea=new THREE.Mesh(new THREE.PlaneGeometry(170,170),new THREE.MeshBasicMaterial({color:0x40bfdf,toneMapped:false}));sea.rotation.x=-Math.PI/2;sea.position.y=-.13;sea.receiveShadow=true;root.add(sea);
 const foam=material(0xb9f2ec),sand=material(0xf1d08a),cliff=material(0xfff0cd),blueCliff=material(0x3098b1);
 sevenStages.forEach((stage,index)=>{
  const g=new THREE.Group();g.name='island-'+stage.id;g.userData.stageId=stage.id;g.scale.setScalar(ISLAND_SCENE_SCALE);root.add(g);islands.push(g);
  const color=material(islandThemes[stage.id].color);
  cyl(g,3.45,.07,0,.02,0,foam,8,3.65);cyl(g,3.17,.48,0,.32,0,blueCliff,8,3.35);
  cyl(g,3.14,.46,0,.77,0,cliff,8,3.17);cyl(g,3.12,.1,0,1.045,0,sand,8);
  cyl(g,2.72,.025,0,1.11,0,grass,8);
  const pathRadius=ISLAND_WALK_RADIUS/ISLAND_SCENE_SCALE;
  const footpath=new THREE.Mesh(new THREE.RingGeometry(pathRadius-.13,pathRadius+.13,72),cream);
  footpath.rotation.x=-Math.PI/2;footpath.position.y=1.161;footpath.name='island-perimeter-path';g.add(footpath);
  box(g,.85,.035,3.2,0,1.14,.65,cream);box(g,3.6,.035,.6,0,1.145,.6,cream);
  const building=new THREE.Group();building.name='building-'+stage.id;building.position.set(0,1.15,-.35);building.rotation.y=.22;g.add(building);
  box(building,3.05,.14,2.2,0,.07,0,cream);
  box(building,2.75,1.35,.12,0,.8,-.85,white);
  for(const x of [-1.32,1.32])box(building,.12,1.35,1.7,x,.8,-.05,white);
  box(building,3.05,.15,.9,0,1.53,-.56,color);
  box(building,2.95,.14,.45,0,1.4,.87,color);
  for(const x of [-1.25,1.25])box(building,.08,1.25,.08,x,.73,.9,color);
  for(const x of [-.8,0,.8]){box(building,.5,.46,.025,x,1.02,-.772,material(0x8ac0cf));box(building,.025,.45,.03,x,1.02,-.75,cream);}
  sign(building,stage.clinic,0,1.65,.9,2.75);
  if(index<2){
   for(const x of [-.72,.25])for(const z of [-.12,.5])desk(building,x,z,color);
   box(building,1.9,.65,.035,0,1.03,-.72,dark);
   if(index===0){sign(building,'新人必修',0,1.03,-.69,1.7);box(building,.35,.65,.35,1,.48,.1,wood);}
   else{
    sign(building,'商品名測驗',0,1.03,-.69,1.7);
    const tower=new THREE.Group();tower.position.set(1.95,0,-.35);building.add(tower);
    box(tower,.5,1.8,.6,0,.9,0,color);
    for(let n=0;n<5;n++)box(tower,.3,.2,.025,0,.35+n*.3,.315,n%2?cream:material(0xf3bd54));
   }
  }else if(index===3){
   box(building,2.45,.65,.45,0,.46,.45,color);box(building,2.6,.08,.56,0,.82,.45,cream);
   for(let n=0;n<4;n++)for(let row=0;row<2;row++)box(building,.28,.22,.24,-.8+n*.5,.58+row*.38,-.5,n%2?color:material(0xefb851));
   box(building,2.5,.07,.37,0,.42,-.5,cream);box(building,2.5,.07,.37,0,.8,-.5,cream);
   box(building,.2,.75,.13,1.75,1.05,.1,color);box(building,.65,.2,.13,1.75,1.05,.1,color);
   for(let n=0;n<6;n++)box(building,.45,.07,.47,-1.24+n*.5,1.49,.88,n%2?cream:color);
  }else{
   desk(building,-.75,.48,color);monitor(building,-.75,.88,.4);
   if(index===2){
    box(building,.55,.12,.48,.58,.55,.1,color);box(building,.55,.65,.1,.58,.9,-.12,color);
    cyl(building,.035,1.4,1.04,.82,-.3,dark,6);box(building,.65,.045,.06,.8,1.5,-.3,dark);sphere(building,.13,.5,1.42,-.3,cream);
   }else if(index===4){
    bed(building,.35,-.2,material(0xe7a669));monitor(building,1,.99,.45);box(building,.4,.6,.4,1,.4,.5,white);
   }else if(index===5){
    const bone=material(0xfff5d8);sphere(building,.13,.7,1.2,.1,bone);cyl(building,.045,.6,.7,.8,.1,bone,6);
    for(let n=0;n<4;n++)box(building,.36-n*.04,.04,.13,.7,1-n*.1,.1,bone);
    for(const dx of [-.1,.1])cyl(building,.032,.45,.7+dx,.31,.1,bone,6);
    box(building,.6,.66,.07,-.8,1.05,-.69,dark);
    for(const x of [-.92,-.69])box(building,.055,.47,.025,x,1.05,-.64,white);
    for(const x of [1.72,2.03]){cyl(building,.025,.95,x,.6,.55,dark,6);box(building,.22,.05,.13,x,1.1,.55,color);}
   }else if(stage.id==='internal-medicine'){
    bed(building,.55,-.18,material(0xecc7df));
    monitor(building,.85,1.1,.35);box(building,.45,.6,.4,1.75,.45,-.2,white);
    box(building,.07,.7,.06,1.75,1.1,-.2,color);sign(building,'內科',0,1.05,-.69,1.4);
   }else{
    box(building,.6,.52,.5,.65,.4,.4,white);box(building,.27,.18,.23,.65,.76,.4,color);
    box(building,.45,.07,.45,1.75,.2,-.1,dark);cyl(building,.025,1.6,1.75,.9,-.25,dark,6);box(building,.35,.06,.25,1.75,1.7,-.2,color);
    box(building,1,.8,.65,-1.85,.55,-.3,color);sign(building,'健康',-1.85,1.1,.04,.8);
   }
  }
  tree(g,-2.15,-1.2,.85,index%3===0);tree(g,2.18,-1.35,.7);tree(g,-2.1,1.35,.6,index%2===0);
  // A small quay and flag distinguish each island even when its label is hidden.
  box(g,1,.1,.85,.45,1,2.8,wood);cyl(g,.035,1.25,1.9,1.7,1.5,dark,6);
  const flag=box(g,.55,.34,.025,2.16,2.15,1.5,color);flags.push(flag);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(3.28,.055,5,64),new THREE.MeshBasicMaterial({color:0xffc744}));ring.rotation.x=-Math.PI/2;ring.position.y=1.12;g.add(ring);markers.push(ring);
  g.traverse(o=>{o.userData.stageId=stage.id;});
 });
 for(let i=0;i<sevenStages.length-1;i++){
  const g=new THREE.Group();g.name='bridge-'+(i+1);root.add(g);bridges.push(g);
  for(let n=0;n<10;n++)box(g,.75,.07,.085,0,0,-.45+n*.1,wood);
  for(const x of [-.42,.42]){box(g,.035,.035,1,x,.32,0,wood);for(let n=0;n<4;n++)box(g,.045,.35,.025,x,.15,-.45+n*.3,wood);}
 }
 // Forested shoreline behind the bay, with deliberately sparse low-poly scenery.
 const shoreline=new THREE.Group();shoreline.name='island-bay-shoreline';root.add(shoreline);
 for(let i=0;i<12;i++){
  const x=-32+i*6;const mountain=new THREE.Mesh(new THREE.ConeGeometry(6.5,3+(i%3),5),material(i%2?0xa9b896:0xb5bf9d));
  mountain.position.set(x,1.5,(x>-12&&x<18?-36:-26)-(i%2)*3);shoreline.add(mountain);
 }
 const shore=cyl(shoreline,36,.35,0,.12,-32,material(0xc8d0a6),18);shore.scale.z=.42;
 for(let i=0;i<48;i++){
  const x=-31+(i*7.19)%62,z=-18-(i%4)*2;
  if(x>-6&&x<12&&z>-28)continue;
  const grove=new THREE.Group();shoreline.add(grove);tree(grove,x,z,.6+(i%3)*.16);
 }
 const formulationBuilding=buildFormulationBuilding();
 formulationBuilding.scale.setScalar(.68);formulationBuilding.position.set(3,.3,-28.5);formulationBuilding.rotation.y=-.18;
 shoreline.add(formulationBuilding);
 // Small sailboat, modeled geometry rather than a photo.
 const boat=new THREE.Group();boat.position.set(-14,.05,3);root.add(boat);
 const hull=cyl(boat,.5,.18,0,.1,0,wood,5,.65);hull.scale.z=2;
 cyl(boat,.025,1.7,0,1,0,dark,6);
 const sail=new THREE.Mesh(new THREE.ConeGeometry(.65,1.25,3),cream);sail.scale.z=.045;sail.position.set(.28,1.13,0);boat.add(sail);
 function layout(portrait:boolean){
  const points=islandPositions(portrait);
  shoreline.position.z=Math.min(...points.map(p=>p[1]))+10;
  formulationBuilding.scale.setScalar(portrait?.6:.68);
  formulationBuilding.position.set(portrait?0:3,.3,portrait?-32:-28.5);
  islands.forEach((g,i)=>g.position.set(points[i][0],0,points[i][1]));
  bridges.forEach((g,i)=>{
   const a=islands[i].position,b=islands[i+1].position,delta=b.clone().sub(a),length=delta.length();
   g.position.copy(a).add(b).multiplyScalar(.5);g.position.y=1.12*ISLAND_SCENE_SCALE;
   g.rotation.y=Math.atan2(delta.x,delta.z);g.scale.set(ISLAND_SCENE_SCALE,ISLAND_SCENE_SCALE,Math.max(.2,length-ISLAND_WALK_RADIUS*2+0.16*ISLAND_SCENE_SCALE));
  });
  boat.position.x=portrait?-8.1:-18;boat.position.z=portrait?-.5:2;
 }
 function state(selected:StageId,completed:StageId[]){
  islands.forEach((g,i)=>{
   markers[i].visible=sevenStages[i].id===selected;
   flags[i].material=material(completed.includes(sevenStages[i].id)?0x157c56:islandThemes[sevenStages[i].id].color);
  });
 }
 layout(false);
 const landmarkBackdrop=shoreline.children.filter(object=>object!==shore&&object!==formulationBuilding);
 return {root,islands,bridges,boat,flags,markers,formulationBuilding,landmarkBackdrop,layout,state};
}
