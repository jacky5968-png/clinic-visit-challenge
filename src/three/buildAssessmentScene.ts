import * as THREE from 'three';
import type { VisitMission } from '../data/visitMissions';
import { examinerAppearance, examinerRole } from '../data/characterRoles';
import { createPerson, type PersonRig } from './person';

export function buildAssessmentScene(mission: VisitMission) {
  const root = new THREE.Group();
  const role = examinerRole(mission);
  root.userData.stage = mission.id;
  root.userData.examinerRole = role;
  const material = (color: number) => new THREE.MeshStandardMaterial({color,roughness:.8});
  const ivory=material(0xf6f4ec), wood=material(0xb99972), ink=material(0x243e51);
  const accent=material(new THREE.Color(mission.theme.accent).getHex());
  function box(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material,name='') {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=name;root.add(mesh);return mesh;
  }
  function cylinder(radius:number,height:number,x:number,y:number,z:number,mat:THREE.Material) {
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,24),mat);
    mesh.position.set(x,y,z);mesh.castShadow=true;root.add(mesh);return mesh;
  }
  box(5.3,.2,4.4,0,-.13,0,material(0xd5e3de),'assessment-platform');
  box(5.12,.04,4.22,0,-.01,0,ivory);
  for(let i=-2;i<=2;i++)box(.012,.006,4.2,i,.017,0,material(0xe4e8e1));
  box(5.3,2.7,.13,0,1.31,-2.13,material(mission.kind==='training'?0x77c9be:0x91cbbf));
  box(.13,2.7,4.15,-2.58,1.31,-.02,material(0xd5eee1));
  box(5.25,.065,.18,0,2.69,-2.12,ivory);
  box(.18,.065,4.3,-2.58,2.69,0,ivory);
  box(2.95,.13,1.18,.03,.77,.08,wood,'assessment-desk');
  box(2.88,.045,1.12,.03,.86,.08,ivory);
  for(const x of [-1.2,1.2])for(const z of [-.34,.5])box(.075,.75,.075,x,.37,z,ink);
  // Laptop, notebook and a pair of water glasses support a real visit setting.
  box(.64,.03,.42,-.02,.9,-.12,ink,'assessment-laptop');
  box(.64,.43,.035,-.02,1.12,-.3,ink).rotation.x=-.12;
  box(.55,.32,.015,-.02,1.13,-.272,material(0xb8d5d4)).rotation.x=-.12;
  box(.49,.025,.36,-.8,.9,.14,material(0xfefcf4),'assessment-notes');
  box(.32,.006,.012,-.8,.917,.13,accent);
  cylinder(.08,.13,-.6,.97,-.18,material(0xa4caca));
  cylinder(.08,.13,1.13,.97,.27,material(0xa4caca));

  function seated(person:PersonRig,x:number,z:number,yaw:number,color:number) {
    person.root.position.set(x,-.22,z);person.root.rotation.y=yaw;
    person.leftLeg.rotation.x=person.rightLeg.rotation.x=-Math.PI/2;
    person.leftKnee.rotation.x=person.rightKnee.rotation.x=Math.PI/2;
    const chair=new THREE.Group();chair.position.set(x,0,z);chair.rotation.y=yaw;
    const seat=new THREE.Mesh(new THREE.BoxGeometry(.64,.11,.61),material(color));seat.position.y=.52;chair.add(seat);
    const back=new THREE.Mesh(new THREE.BoxGeometry(.64,.74,.1),material(color));back.position.set(0,.94,-.28);chair.add(back);
    for(const px of [-.23,.23])for(const pz of [-.22,.22]){
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.5,10),ink);leg.position.set(px,.25,pz);chair.add(leg);
    }
    root.add(chair,person.root);
  }
  const examiner=createPerson(true,examinerAppearance(mission));
  const representative=createPerson(false,{hair:0x25373e,coat:0x286a65,glasses:false,outfit:'representative',tie:0xd6b778,briefcase:false});
  examiner.root.name='assessment-examiner';representative.root.name='assessment-representative';
  seated(examiner,1.0,-.77,-.88,0x2b4c61);
  seated(representative,-1.1,1.03,2.1,0x287d74);
  examiner.leftArm.rotation.x=examiner.rightArm.rotation.x=-.65;
  representative.leftArm.rotation.x=representative.rightArm.rotation.x=-.65;
  // A modest turn toward the viewer keeps both faces recognisable in the opening view.
  representative.head.rotation.y=-.27;examiner.head.rotation.y=.2;

  const board=new THREE.Group();board.name=mission.kind==='training'?'training-assessment-board':mission.kind==='pharmacy'?'pharmacy-counselling-board':'specialty-assessment-board';root.add(board);
  box(2.1,1.08,.08,-.74,1.94,-2.0,ink);
  box(1.99,.97,.03,-.74,1.94,-1.944,material(0xf9fbf4));
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;
    const context=canvas.getContext('2d');
    if(context){
      context.fillStyle='#f9fbf4';context.fillRect(0,0,768,384);
      context.fillStyle=mission.theme.accent;context.fillRect(0,0,16,384);
      context.font='bold 72px "Microsoft JhengHei", "微軟正黑體", sans-serif';context.fillText(mission.kind==='training'?'營一部':mission.clinic,48,105);
      context.fillStyle='#26445a';context.font='48px "Microsoft JhengHei", "微軟正黑體", sans-serif';context.fillText(mission.doctor.specialty,48,190);
      context.font='42px "Microsoft JhengHei", "微軟正黑體", sans-serif';context.fillText('專業  ×  交流',48,275);
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.95,.94),new THREE.MeshBasicMaterial({map:texture}));panel.position.set(-.74,1.94,-1.922);root.add(panel);
    }
  }
  // Display shelves differ by client type; product photographs are not used.
  for(let row=0;row<3;row++){
    box(1.09,.05,.4,1.64,.72+row*.47,-1.82,ivory);
    for(let col=0;col<4;col++){
      const colors=mission.kind==='pharmacy'?[0x4dbca3,0xecbb69,0x93b9d7,0xf0eee2]:[0x294c68,0xc0a271,0x4e9e96,0xdedbc7];
      box(.15,.28,.2,1.25+col*.24,.88+row*.47,-1.81,material(colors[col]),mission.kind==='pharmacy'?'pharmacy-display-box':'training-reference-book');
      box(.1,.03,.008,1.25+col*.24,.91+row*.47,-1.705,ivory);
    }
  }
  if(mission.id==='orthopedics'){
    box(.72,.93,.055,-2.48,1.72,-.65,ink,'orthopedic-display').rotation.y=Math.PI/2;
    for(const y of [1.48,1.72,1.96])box(.08,.19,.045,-2.43,y,-.65,ivory).rotation.z=.12;
  }
  if(mission.id==='family')box(.35,.19,.3,-1.02,.97,-.22,material(0x8bbec1),'blood-pressure-monitor');
  cylinder(.22,.4,-2.03,.2,1.51,wood);
  for(const [x,y,z] of [[-2.03,.78,1.51],[-2.21,.67,1.53],[-1.88,.67,1.52]]){
    const leaf=new THREE.Mesh(new THREE.IcosahedronGeometry(.29,1),material(0x518a69));leaf.scale.set(.65,1.6,.65);leaf.position.set(x,y,z);root.add(leaf);
  }
  return {root,examiner,representative,role};
}
