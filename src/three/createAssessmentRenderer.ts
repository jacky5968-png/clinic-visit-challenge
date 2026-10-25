import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { VisitMission } from '../data/visitMissions';
import { buildAssessmentScene } from './buildAssessmentScene';

export interface AssessmentState { question:number; selected:number|null; submitted:boolean; correct:boolean; reduced:boolean; }
export function createAssessmentRenderer(host:HTMLElement,mission:VisitMission,state:{current:AssessmentState}) {
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  const canvas=renderer.domElement;canvas.dataset.testid='assessment-3d-canvas';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','外勤與'+mission.doctor.name+'面對面交流的3D考核場景');host.appendChild(canvas);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xeaf2ef);
  const model=buildAssessmentScene(mission);scene.add(model.root);
  scene.add(new THREE.HemisphereLight(0xffffff,0xa5bdb2,2));
  const key=new THREE.DirectionalLight(0xfff5de,3.1);key.position.set(3,7,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;key.shadow.bias=-.001;scene.add(key);
  const fill=new THREE.DirectionalLight(0xe4f4ff,1.2);fill.position.set(-4,3,1);scene.add(fill);
  const camera=new THREE.OrthographicCamera(-4,4,3,-3,.1,60);
  const controls=new OrbitControls(camera,canvas);controls.target.set(0,1.18,0);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.12;controls.minPolarAngle=.62;controls.maxPolarAngle=1.3;controls.minZoom=.8;controls.maxZoom=1.65;
  const reset=()=>{camera.position.set(6.5,5.0,8.1);camera.zoom=host.clientWidth<480?1.14:1;camera.updateProjectionMatrix();controls.target.set(0,host.clientHeight<=280?1.35:1.18,0);controls.update();};reset();
  const resize=()=>{const {width,height}=host.getBoundingClientRect();const w=Math.max(1,width),h=Math.max(1,height),span=Math.max(h<=280?3.7:4.4,6.3/(w/h));camera.left=-span*w/h/2;camera.right=span*w/h/2;camera.top=span/2;camera.bottom=-span/2;controls.target.y=h<=280?1.35:1.18;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  canvas.dataset.renderer='webgl';canvas.dataset.examiner=mission.doctor.name;canvas.dataset.outfit=model.role;canvas.dataset.people='2';canvas.dataset.stage=mission.id;
  let frame=0,disposed=false,lastSignal='',gestureAt=0,visible=true;
  const visibility=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;},{rootMargin:'80px'});visibility.observe(host);
  const render=(now:number)=>{
    if(disposed)return;frame=requestAnimationFrame(render);const s=state.current;
    canvas.dataset.feedback=s.submitted?(s.correct?'correct':'review'):s.selected!==null?'selected':'listening';
    if(!visible||document.hidden)return;
    controls.enableDamping=!s.reduced;controls.update();
    const signal=s.question+':'+s.selected+':'+s.submitted;
    if(signal!==lastSignal){lastSignal=signal;gestureAt=now;}
    const elapsed=(now-gestureAt)/1000,active=elapsed<1.25&&!s.reduced;
    const envelope=active?Math.sin(Math.PI*elapsed/1.25):0;
    model.examiner.head.rotation.x=s.submitted&&s.correct?Math.sin(elapsed*9)*.12*envelope:0;
    model.examiner.head.rotation.y=.2+(s.submitted&&!s.correct?Math.sin(elapsed*9)*.13*envelope:0);
    model.examiner.rightArm.rotation.x=-.65+(!s.submitted?-.13*envelope:0);
    model.representative.leftArm.rotation.x=-.65+(s.selected!==null?-.18*envelope:0);
    model.representative.head.rotation.x=s.submitted?.06*envelope:0;
    model.examiner.body.position.y=s.reduced?0:Math.sin(now*.0015)*.006;
    model.representative.body.position.y=s.reduced?0:Math.sin(now*.0015+.7)*.006;
    canvas.dataset.feedback=s.submitted?(s.correct?'correct':'review'):s.selected!==null?'selected':'listening';
    renderer.render(scene,camera);
  };frame=requestAnimationFrame(render);
  return {reset,rotate:(direction:number)=>{const angle=direction*Math.PI/9;const offset=camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0,1,0),angle);camera.position.copy(controls.target).add(offset);controls.update();},dispose:()=>{
      disposed=true;cancelAnimationFrame(frame);observer.disconnect();visibility.disconnect();controls.dispose();
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
    scene.traverse(object=>{if(object instanceof THREE.Mesh){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material]){materials.add(material);if('map'in material&&material.map instanceof THREE.Texture)textures.add(material.map);}}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();
  }};
}
