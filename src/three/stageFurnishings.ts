import * as THREE from 'three';
import type {VisitMission} from '../data/visitMissions';

type Sign=(parent:THREE.Object3D,value:string,w:number,h:number,x:number,y:number,z:number,bg?:string,color?:string)=>THREE.Mesh;
interface Rooms {root:THREE.Group;reception:THREE.Group;waiting:THREE.Group;office:THREE.Group;shelf:THREE.Group;text:Sign}
// All solid furniture stays inside the existing counter/shelf collision footprints.
// People, interaction targets and the central walking corridor keep their original positions.
export function furnishStage(m:VisitMission,r:Rooms){
 if(!m.stageNumber)return;
 const color=[0,0x087e78,0x285bd5,0x007cad,0x008c69,0xc06a21,0x6550bd,0x258560][m.stageNumber]??0x087e78;
 const white=new THREE.MeshStandardMaterial({color:0xf7fafc,roughness:.8});
 const accent=new THREE.MeshStandardMaterial({color,roughness:.75});
 const metal=new THREE.MeshStandardMaterial({color:0x7b909f,metalness:.35,roughness:.5});
 const dark=new THREE.MeshStandardMaterial({color:0x17344a});
 const cushion=new THREE.MeshStandardMaterial({color:m.stageNumber===5?0xeab36e:0x52b9c2});
 const blue=new THREE.MeshStandardMaterial({color:0x427fe3});
 const amber=new THREE.MeshStandardMaterial({color:0xf0b335});
 function zone(parent:THREE.Object3D,name:string){const g=new THREE.Group();g.name=name;parent.add(g);return g;}
 function box(p:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material=white){
  const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;
 }
 function rod(p:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,radius=.035,mat:THREE.Material=metal){
  const delta=b.clone().sub(a);const o=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),12),mat);
  o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());o.castShadow=true;p.add(o);return o;
 }
 function ball(p:THREE.Object3D,x:number,y:number,z:number,radius:number,mat:THREE.Material=white){
  const o=new THREE.Mesh(new THREE.SphereGeometry(radius,12,10),mat);o.position.set(x,y,z);o.castShadow=true;p.add(o);return o;
 }
 function sign(p:THREE.Object3D,s:string,x:number,y:number,z:number,w=2.6){r.text(p,s,w,.36,x,y,z,'#ffffff','#17344a');}
 function stand(p:THREE.Object3D,x:number,z:number){box(p,.55,.09,.5,x,.22,z,metal);rod(p,new THREE.Vector3(x,.24,z),new THREE.Vector3(x,1.45,z));}
 function display(p:THREE.Object3D,x:number,y:number,z:number,w=1){box(p,w,.68,.08,x,y,z,dark);box(p,w-.1,.55,.025,x,y,z+.055,blue);}
 function table(p:THREE.Object3D,x:number,z:number,compressed=false){
  const desk=zone(p,'student-desk');desk.position.set(x,0,z);if(compressed)desk.scale.z=.8;p=desk;x=0;z=0;
  box(p,.96,.09,.52,x,.94,z,accent);
  for(const dx of [-.36,.36])box(p,.045,.74,.36,x+dx,.53,z,metal);
  box(p,.44,.08,.38,x,.56,z-.48,cushion);box(p,.44,.4,.07,x,.8,z-.65,cushion);
  for(const dx of [-.16,.16])box(p,.035,.38,.3,x+dx,.32,z-.48,metal);
  box(p,.34,.025,.24,x,.999,z,white);box(p,.03,.026,.2,x+.23,1,z,amber);
 }
 function shelf(p:THREE.Object3D,x:number,z:number,w:number,h:number){
  box(p,w,h,.08,x,h/2+.2,z-.23,accent);
  for(const dx of [-w/2,w/2])box(p,.07,h,.55,x+dx,h/2+.2,z,white);
  for(let i=0;i<4;i++)box(p,w,.065,.55,x,.23+i*(h-.08)/3,z,white);
 }
 function books(p:THREE.Object3D,x:number,y:number,z:number,n=7){
  for(let i=0;i<n;i++)box(p,.105,.31+(i%2)*.04,.25,x+i*.14,y,z,[accent,amber,blue][i%3]);
 }
 if(m.kind==='training'){
  for(const p of [r.reception,r.waiting])for(const o of p.children)o.visible=false;
  const desks=zone(r.reception,'classroom-student-desks');
  for(const x of [-4.35,-3.15,-1.95])table(desks,x,-.62);
  const row=zone(r.waiting,'classroom-workshop-desks');
  for(const x of [1.95,2.95,3.95])table(row,x,1.77,true);
  const teaching=zone(r.reception,m.stageNumber===1?'induction-whiteboard':'product-learning-display');
  if(m.stageNumber===1){
   box(teaching,2.96,1.55,.09,-3.6,1.85,-3.91,accent);
   box(teaching,2.8,1.39,.04,-3.6,1.85,-3.84,white);
   sign(teaching,'新人必修 · 新訓教室',-3.6,2.31,-3.8);
   for(let i=0;i<3;i++){box(teaching,1.7-i*.22,.045,.025,-3.72,1.97-i*.21,-3.8,accent);box(teaching,.12,.12,.03,-4.75,1.97-i*.21,-3.8,amber);}
   box(teaching,2.94,.07,.34,-3.6,1.08,-3.75,metal);
   books(teaching,-4.65,.47,-3.77,6);
  }else{
   shelf(teaching,-3.6,-3.78,2.94,2.2);
   sign(teaching,'商品名測驗 · 產品教室',-3.6,2.74,-3.62);
   for(let row=0;row<3;row++)for(let i=0;i<5;i++){
    const x=-4.65+i*.51,y=.51+row*.7;
    box(teaching,.33,.43,.25,x,y,-3.75,[blue,accent,amber][(i+row)%3]);
    r.text(teaching,String.fromCharCode(65+i+row*5),.24,.22,x,y,-3.614,'#ffffff','#17344a');
   }
   const screen=zone(r.office,'product-training-screen');
   display(screen,3.62,2.25,-3.67,2.55);sign(screen,'辨識商品 · 主題練習',3.62,2.25,-3.605,2.25);
  }
  r.root.userData.sceneIdentity=m.stageNumber===1?'新訓教室':'產品教室';
 }else if(m.stageNumber===4){
  const g=zone(r.office,'pharmacy-retail-shelving');
  shelf(g,3.62,-3.88,2.68,2.1);
  sign(g,m.clinic,3.62,2.68,-3.53,2.6);
  for(let row=0;row<3;row++)for(let i=0;i<6;i++){
   const x=2.5+i*.44,y=.49+row*.66;
   box(g,.27,.34,.29,x,y,-3.77,[white,blue,amber][(i+row)%3]);
   box(g,.22,.065,.02,x,y+.04,-3.61,accent);
  }
  const checkout=zone(r.reception,'pharmacy-dispensing-tray');
  box(checkout,.55,.035,.38,-4.2,1.185,-.8,blue);
  for(let i=0;i<3;i++)box(checkout,.09,.045,.09,-4.35+i*.14,1.23,-.8,white);
  box(checkout,.35,.42,.18,-1.8,1.4,-.85,amber);
  r.text(checkout,'藥',.24,.24,-1.8,1.43,-.75,'#f0b335','#17344a');
  r.root.userData.sceneIdentity='藥局門市';
 }else{
  r.shelf.visible=false;
  const label=r.reception.getObjectByName('shelf-label');if(label)label.visible=false;
  const g=zone(r.reception,'specialty-equipment');
  const z=-3.76;
  if(m.stageNumber===3){
   const chair=zone(g,'ent-treatment-chair');
   box(chair,.72,.14,.56,-4.5,.85,z,cushion);
   box(chair,.72,.9,.13,-4.5,1.35,z-.16,cushion);
   rod(chair,new THREE.Vector3(-4.5,.2,z),new THREE.Vector3(-4.5,.78,z),.1);
   box(chair,.66,.08,.49,-4.5,.23,z,metal);
   for(const x of [-4.91,-4.09]){rod(chair,new THREE.Vector3(x,.7,z),new THREE.Vector3(x,1.05,z));box(chair,.12,.07,.45,x,1.06,z,white);}
   const lamp=zone(g,'ent-examination-lamp');
   rod(lamp,new THREE.Vector3(-3.87,.2,z),new THREE.Vector3(-3.87,2.25,z));
   rod(lamp,new THREE.Vector3(-3.87,2.25,z),new THREE.Vector3(-4.45,2.25,z));
   ball(lamp,-4.45,2.18,z,.17,amber);
   const cart=zone(g,'ent-instrument-cart');
   for(const y of [.38,.86,1.34])box(cart,.9,.07,.5,-2.75,y,z,white);
   for(const x of [-3.12,-2.38])rod(cart,new THREE.Vector3(x,.2,z),new THREE.Vector3(x,1.36,z));
   display(cart,-2.75,1.73,z,.75);
   for(let i=0;i<3;i++)box(cart,.09,.2,.1,-3+i*.22,1.47,z,metal);
   sign(g,'耳鼻喉科 · 診療設備',-3.6,2.76,-3.48);
   r.root.userData.sceneIdentity='耳鼻喉科診療室';
  }else if(m.stageNumber===5){
   const bed=zone(g,'gastro-examination-bed');
   box(bed,1.85,.23,.59,-4.12,.87,z,cushion);
   box(bed,.4,.12,.5,-4.76,1.04,z,white);
   for(const x of [-4.85,-3.4])box(bed,.07,.56,.43,x,.47,z,metal);
   const cart=zone(g,'gastro-endoscopy-cart');
   box(cart,.6,.72,.5,-2.48,.62,z,white);
   box(cart,.62,.06,.51,-2.48,1.02,z,accent);display(cart,-2.48,1.63,z,.72);
   for(const y of [.56,.81])box(cart,.5,.04,.025,-2.48,y,z+.26,dark);
   const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-2.3,1.12,z),new THREE.Vector3(-2.19,.8,z+.1),new THREE.Vector3(-2.45,.43,z+.12),new THREE.Vector3(-2.7,.73,z+.1)]);
   cart.add(new THREE.Mesh(new THREE.TubeGeometry(curve,18,.025,6,false),dark));
   sign(g,'胃腸科 · 檢查準備區',-3.6,2.76,-3.48);
   r.root.userData.sceneIdentity='胃腸科檢查室';
  }else if(m.stageNumber===6){
   const skeleton=zone(g,'orthopedic-skeleton');
   stand(skeleton,-4.75,z);ball(skeleton,-4.75,1.98,z,.15);
   rod(skeleton,new THREE.Vector3(-4.75,1.05,z),new THREE.Vector3(-4.75,1.82,z),.045,white);
   for(let i=0;i<5;i++)box(skeleton,.39-i*.035,.035,.16,-4.75,1.65-i*.09,z,white);
   for(const dx of [-.16,.16]){
    rod(skeleton,new THREE.Vector3(-4.75+dx,.98,z),new THREE.Vector3(-4.75+dx,.4,z),.045,white);
    rod(skeleton,new THREE.Vector3(-4.75+dx,1.73,z),new THREE.Vector3(-4.75+dx*1.8,1.08,z),.04,white);
   }
   box(skeleton,.36,.15,.17,-4.75,1.02,z,white);
   const lightbox=zone(g,'orthopedic-xray-lightbox');
   box(lightbox,1.22,1.18,.09,-3.43,1.88,z-.15,dark);
   box(lightbox,1.1,1.06,.025,-3.43,1.88,z-.09,white);
   for(const dx of [-.18,.18]){rod(lightbox,new THREE.Vector3(-3.43+dx,1.48,z-.06),new THREE.Vector3(-3.43+dx,2.27,z-.06),.045,blue);ball(lightbox,-3.43+dx,1.87,z-.06,.08,blue);}
   const crutches=zone(g,'orthopedic-crutch-stand');
   for(const x of [-2.6,-2.24]){rod(crutches,new THREE.Vector3(x,.2,z),new THREE.Vector3(x,1.8,z));box(crutches,.25,.07,.12,x,1.8,z,amber);box(crutches,.21,.06,.12,x,1.18,z,amber);}
   sign(g,'骨科 · 骨骼與復健區',-3.6,2.76,-3.48);
   r.root.userData.sceneIdentity='骨科診療室';
  }else{
   const scale=zone(g,'family-height-weight-station');
   box(scale,.66,.1,.5,-4.65,.24,z,metal);
   rod(scale,new THREE.Vector3(-4.65,.25,z-.19),new THREE.Vector3(-4.65,2.25,z-.19));
   box(scale,.55,.06,.3,-4.65,2.23,z-.1,accent);
   for(let i=0;i<8;i++)box(scale,.12,.025,.025,-4.55,.8+i*.15,z-.14,dark);
   const bp=zone(g,'family-blood-pressure-station');
   box(bp,1.32,.1,.57,-3.35,.95,z,white);
   for(const x of [-3.87,-2.83])box(bp,.07,.75,.4,x,.55,z,metal);
   box(bp,.43,.25,.34,-3.5,1.12,z,blue);box(bp,.27,.13,.025,-3.5,1.18,z+.18,white);
   const cuff=new THREE.Mesh(new THREE.TorusGeometry(.14,.055,8,18),dark);cuff.position.set(-2.95,1.12,z);cuff.rotation.x=Math.PI/2;bp.add(cuff);
   const glucose=zone(g,'family-glucose-kit');box(glucose,.16,.06,.28,-3.06,1.04,z+.08,amber);
   const cabinet=zone(g,'family-health-education');
   box(cabinet,.47,1.25,.5,-2.34,.82,z,accent);books(cabinet,-2.5,1.65,z,3);
   sign(g,'家醫科 · 健康量測區',-3.6,2.76,-3.48);
   r.root.userData.sceneIdentity='家醫科診療室';
  }
 }
}
