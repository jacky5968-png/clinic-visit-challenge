import {createPerson} from './person';
import {planIslandWalk,sampleIslandWalk,islandStandingPoint,type IslandWalkRoute} from '../engine/islandWalk';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {buildIslands} from './buildIslands';
import {sevenStages,type StageId} from '../data/sevenStages';
import {ISLAND_SCENE_SCALE} from '../data/islandStages';
import {stageUnlocked} from '../engine/stageProgress';
import {placeIslandCallouts,islandLabelsFit,type IslandCallout} from '../engine/islandLabels';
let islandSession:{id:StageId;atGate:boolean}|null=null;
export interface IslandState {selected:StageId;completed:StageId[];}
export function createIslandRenderer(host:HTMLElement,initial:IslandState,onSelect:(id:StageId)=>void,onLocked:(message:string)=>void,onLandmark?:()=>void){
 const canvas=document.createElement('canvas');
 canvas.dataset.testid='island-map-canvas';canvas.setAttribute('aria-label','七座島嶼3D地圖，可拖曳旋轉，以島名按鈕選關；點選生達製劑大樓可放大查看');canvas.tabIndex=0;
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x40bfdf);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 host.prepend(canvas);
 const leaderLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');
 leaderLayer.setAttribute('aria-hidden','true');Object.assign(leaderLayer.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'1'});
 const leaders=sevenStages.map(()=>{const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('fill','none');p.setAttribute('stroke','#38646a');p.setAttribute('stroke-width','1.4');p.setAttribute('opacity','.6');leaderLayer.append(p);return p;});host.append(leaderLayer);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x40bfdf);
 scene.add(new THREE.HemisphereLight(0xf5fcff,0x5b8d91,1.35));
 const light=new THREE.DirectionalLight(0xfff5df,2.8);light.position.set(-20,55,30);light.castShadow=true;
 light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:160});light.shadow.camera.updateProjectionMatrix();light.shadow.normalBias=.035;light.shadow.bias=-.0002;scene.add(light);
 const camera=new THREE.OrthographicCamera(-15,15,12,-12,.1,160);
 const model=buildIslands();scene.add(model.root);
 const actor=createPerson();actor.root.name='island-field-representative';actor.root.scale.setScalar(.85*ISLAND_SCENE_SCALE);model.root.add(actor.root);
 const controls=new OrbitControls(camera,canvas);controls.enablePan=false;controls.enableZoom=false;controls.enableDamping=false;
 controls.minPolarAngle=.55;controls.maxPolarAngle=1.05;controls.minAzimuthAngle=-.42;controls.maxAzimuthAngle=.42;
 controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.ROTATE;
 let state=initial,raf=0,disposed=false,width=1,height=1,portrait=false,zoom=1,baseHeight=24;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let moving=!reduced.matches,inView=true,lastTime=0,phase=0;
 let currentIsland:StageId=islandSession&&stageUnlocked(islandSession.id,initial.completed)?islandSession.id:(initial.completed.at(-1)??sevenStages[0].id);
 let atGate=islandSession?.id===currentIsland?islandSession.atGate:false;
 let travel:{from:StageId;to:StageId;fromGate:boolean;progress:number;duration:number;arrive:()=>void;cancel?:()=>void}|null=null;
 function route():IslandWalkRoute|null{return travel?planIslandWalk(travel.from,travel.to,state.completed,portrait,travel.fromGate):null;}
 function positionActor(){
  const path=route(),p=path?sampleIslandWalk(path,travel!.progress):islandStandingPoint(currentIsland,portrait,atGate);
  actor.root.position.set(p.x,1.16*ISLAND_SCENE_SCALE,p.z);
 }
 function finish(){
  if(!travel)return;const pending=travel;
  if(!stageUnlocked(pending.to,state.completed)){cancel();onLocked('關卡尚未解鎖，請先完成前一關。');return;}
  travel=null;currentIsland=pending.to;atGate=true;islandSession={id:currentIsland,atGate};controls.enableRotate=true;actor.pose(0,false);actor.root.rotation.y=Math.PI;positionActor();draw();pending.arrive();
 }
 function cancel(){
  const pending=travel;travel=null;controls.enableRotate=true;
  if(pending){currentIsland=pending.from;atGate=pending.fromGate;}islandSession={id:currentIsland,atGate};actor.pose(0,false);positionActor();draw();pending?.cancel?.();
 }
 let previousCallouts:IslandCallout[]|null=null,previousCameraKey='';
 function projectArea(object:THREE.Object3D,id:string){
  const box=new THREE.Box3().setFromObject(object),points:THREE.Vector3[]=[];
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));
  const xs=points.map(p=>(p.x+1)*width/2),ys=points.map(p=>(1-p.y)*height/2);
  return {id,x:Math.min(...xs)-3,y:Math.min(...ys)-3,width:Math.max(...xs)-Math.min(...xs)+6,height:Math.max(...ys)-Math.min(...ys)+6};
 }
 function frameLandmark(){
  // Frame only the distant backdrop; island positions, camera scale and walking routes stay unchanged.
  const building=model.formulationBuilding,baseScale=portrait?.6:.68;
  building.scale.setScalar(baseScale);building.position.set(portrait?0:3,.3,portrait?-32:-28.5);
  model.root.updateMatrixWorld(true);
  let area=projectArea(building,'landmark');
  const factor=Math.min(1,(portrait?150:160)/area.height,(width-32)/area.width);
  building.scale.setScalar(baseScale*factor);model.root.updateMatrixWorld(true);area=projectArea(building,'landmark');
  const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.3);
  function groundAt(x:number,y:number){ray.setFromCamera(new THREE.Vector2(x/width*2-1,1-y/height*2),camera);return ray.ray.intersectPlane(plane,new THREE.Vector3());}
  const from=groundAt(area.x+area.width/2,area.y+area.height/2),to=groundAt(width*.5,130);
  if(from&&to)building.position.add(to.sub(from));
  model.root.updateMatrixWorld(true);
 }
 function frameCallouts(){
  camera.left=-baseHeight*width/height/2;camera.right=-camera.left;
  camera.top=baseHeight/2;camera.bottom=-baseHeight/2;camera.zoom=zoom;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);model.root.updateMatrixWorld(true);
  const upper=Math.max(...sevenStages.slice(3).map(s=>host.querySelector<HTMLElement>('[data-testid="stage-'+s.id+'"]')?.offsetHeight||70))+20+(portrait?(host.querySelector<HTMLElement>('.island-map-caption')?.offsetHeight||40)+20:0)+(portrait?120:180);
  const lower=Math.max(...sevenStages.slice(0,3).map(s=>host.querySelector<HTMLElement>('[data-testid="stage-'+s.id+'"]')?.offsetHeight||70))+(portrait?20:40);
  let areas=sevenStages.map((s,i)=>projectArea(model.islands[i].getObjectByName('building-'+s.id)!,s.id));
  let min=Math.min(...areas.map(a=>a.y)),max=Math.max(...areas.map(a=>a.y+a.height));
  if(max-min>height-upper-lower){camera.zoom*=Math.max(.3,(height-upper-lower)/(max-min));camera.updateProjectionMatrix();areas=sevenStages.map((s,i)=>projectArea(model.islands[i].getObjectByName('building-'+s.id)!,s.id));min=Math.min(...areas.map(a=>a.y));max=Math.max(...areas.map(a=>a.y+a.height));}
  const islandAreas=model.islands.map((island,i)=>projectArea(island,sevenStages[i].id));
  const horizontalSpan=Math.max(...islandAreas.map(a=>a.x+a.width))-Math.min(...islandAreas.map(a=>a.x));
  if(horizontalSpan>width-20){
   camera.zoom*=(width-20)/horizontalSpan;camera.updateProjectionMatrix();
   areas=sevenStages.map((s,i)=>projectArea(model.islands[i].getObjectByName('building-'+s.id)!,s.id));min=Math.min(...areas.map(a=>a.y));max=Math.max(...areas.map(a=>a.y+a.height));
  }
  const shift=((upper+height-lower)/2-(min+max)/2)*baseHeight/height/camera.zoom;
  camera.top+=shift;camera.bottom+=shift;camera.updateProjectionMatrix();
  const fittedIslands=model.islands.map((island,i)=>projectArea(island,sevenStages[i].id));
  const centerX=(Math.min(...fittedIslands.map(a=>a.x))+Math.max(...fittedIslands.map(a=>a.x+a.width)))/2;
  const shiftX=(width/2-centerX)*baseHeight/height/camera.zoom;
  camera.left-=shiftX;camera.right-=shiftX;camera.updateProjectionMatrix();
  frameLandmark();
 }
 function labels(){
  const landmark=projectArea(model.formulationBuilding,'shengda-formulation-building');
  const landmarkLabel=host.querySelector<HTMLElement>('.island-landmark-label');
  if(landmarkLabel){
   landmarkLabel.style.left=(portrait?width-landmarkLabel.offsetWidth-10:Math.max(8,Math.min(width-landmarkLabel.offsetWidth-8,landmark.x+landmark.width/2-landmarkLabel.offsetWidth/2)))+'px';
   landmarkLabel.style.top=(portrait?10:Math.max(8,landmark.y-landmarkLabel.offsetHeight-8))+'px';landmarkLabel.style.visibility='visible';
  }
  const buildings=sevenStages.map((s,i)=>projectArea(model.islands[i].getObjectByName('building-'+s.id)!,'building-'+s.id));
  const candidates=sevenStages.map((s,i)=>{
   const element=host.querySelector<HTMLButtonElement>('[data-testid="stage-'+s.id+'"]')!;
   const above=s.stageNumber>=4;
   const v=model.islands[i].position.clone().add((above?new THREE.Vector3(0,3.6,-1.2):new THREE.Vector3(0,1.05,2.9)).multiplyScalar(ISLAND_SCENE_SCALE)).project(camera);
   const w=element?.offsetWidth||148,h=element?.offsetHeight||66;
   const building=buildings[i];
   const x=above?building.x+building.width/2-w/2:(v.x+1)*width/2-w/2,nearX=Math.max(8,Math.min(width-w-8,x));
   // Keep 05 and 06 beside their own roofs during placement and cached frames.
   const nearbyLimit=s.id==='gastro'?{horizontal:portrait?40:24,vertical:26}:s.id==='orthopedics'?{horizontal:48,vertical:32}:null;
   const nearby=nearbyLimit?{minX:Math.max(8,nearX-nearbyLimit.horizontal),maxX:Math.min(width-w-8,nearX+nearbyLimit.horizontal),minY:Math.max(8,building.y-h-nearbyLimit.vertical)}:{};
   return {id:s.id,x,y:above?building.y-h-10:(1-v.y)*height/2+5,width:w,height:h,minY:above?8:building.y+building.height+8,maxY:above?building.y-h-8:height-h-8,...nearby};
  });
  const bounds=new THREE.Box3().setFromObject(actor.root),corners:THREE.Vector3[]=[];
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(new THREE.Vector3(x,y,z).project(camera));
  const xs=corners.map(p=>(p.x+1)*width/2),ys=corners.map(p=>(1-p.y)*height/2);
  const person={id:'actor',x:Math.min(...xs)-4,y:Math.min(...ys)-28,width:Math.max(...xs)-Math.min(...xs)+8,height:Math.max(...ys)-Math.min(...ys)+34};
  const badge=host.querySelector<HTMLElement>('[data-testid="island-actor-label"]');
  if(badge){badge.style.transform='translate('+((person.x+person.width/2)-22).toFixed(1)+'px,'+person.y.toFixed(1)+'px)';badge.style.visibility='visible';}
  canvas.dataset.actorArea=JSON.stringify(person);
  const hint=host.querySelector<HTMLElement>('.island-map-caption'),hostBox=host.getBoundingClientRect(),hintBox=hint?.getBoundingClientRect();
  const obstacles=[...buildings,landmark,person,...(hintBox?[{id:'map-hint',x:hintBox.x-hostBox.x,y:hintBox.y-hostBox.y,width:hintBox.width,height:hintBox.height}]:[])];
  const cameraKey=[width,height,camera.zoom,camera.position.x,camera.position.y,camera.position.z,camera.top,camera.bottom,...candidates.flatMap(p=>[p.width,p.height])].join(',');
  if(cameraKey!==previousCameraKey||!previousCallouts||!islandLabelsFit(previousCallouts,width,height,obstacles)){
   previousCallouts=placeIslandCallouts(candidates,width,height,obstacles);previousCameraKey=cameraKey;
  }
  canvas.dataset.buildingAreas=JSON.stringify(buildings);
  canvas.dataset.landmarkArea=JSON.stringify(projectArea(model.formulationBuilding,'shengda-formulation-building'));
  canvas.dataset.islandAreas=JSON.stringify(model.islands.map((island,i)=>projectArea(island,sevenStages[i].id)));
  canvas.dataset.calloutSides=JSON.stringify(candidates.map(c=>({id:c.id,minY:c.minY,maxY:c.maxY})));
  for(const [i,candidate] of candidates.entries()){
   const p=previousCallouts.find(p=>p.id===candidate.id)!,building=buildings[i],x=p.x+p.width/2,targetX=building.x+building.width/2,targetY=building.y-5;
   const show=i>=3&&Math.abs(x-targetX)>24;
   leaders[i].setAttribute('d',show?'M'+x+','+(p.y+p.height)+'V'+targetY+'H'+targetX+'V'+building.y:'');
  }
  for(const p of previousCallouts){
   const el=host.querySelector<HTMLElement>('[data-testid="stage-'+p.id+'"]');
   if(el){el.style.transform='translate('+p.x.toFixed(1)+'px,'+p.y.toFixed(1)+'px)';el.style.visibility='visible';}
  }
 }
 function draw(){
  if(disposed)return;
  renderer.render(scene,camera);labels();
  canvas.dataset.renderer='webgl';canvas.dataset.islands='7';canvas.dataset.selected=state.selected;
  canvas.dataset.actorX=actor.root.position.x.toFixed(3);canvas.dataset.actorZ=actor.root.position.z.toFixed(3);
  canvas.dataset.actorIsland=currentIsland;canvas.dataset.actorWalking=String(!!travel);
  canvas.dataset.actorProgress=(travel?.progress??1).toFixed(4);
  canvas.dataset.actorLeg=actor.leftLeg.rotation.x.toFixed(4);
  canvas.dataset.actorTarget=travel?.to??currentIsland;
  canvas.dataset.azimuth=controls.getAzimuthalAngle().toFixed(3);canvas.dataset.zoom=camera.zoom.toFixed(2);
 }
 function frame(t:number){
  raf=0;if(disposed)return;
  const dt=lastTime?Math.max(0,(t-lastTime)/1000):0;lastTime=t;
  if(travel&&inView&&!document.hidden){
   const path=route();if(!path){cancel();onLocked('關卡尚未解鎖，請先完成前一關。');}
   else{
    travel.progress=Math.min(1,travel.progress+dt/travel.duration);const p=sampleIslandWalk(path,travel.progress);
    actor.root.position.set(p.x,1.16*ISLAND_SCENE_SCALE,p.z);const turn=Math.atan2(Math.sin(p.yaw-actor.root.rotation.y),Math.cos(p.yaw-actor.root.rotation.y));actor.root.rotation.y+=turn*Math.min(1,dt*12);
    phase+=dt*8.8;actor.pose(phase,true);if(travel.progress>=1)finish();
   }
  }
  if(disposed)return;
  if(moving&&inView&&!document.hidden){model.boat.rotation.z=Math.sin(t*.0007)*.035;model.boat.position.y=.05+Math.sin(t*.0006)*.025;}
  draw();if((moving||travel)&&inView&&!document.hidden)raf=requestAnimationFrame(frame);
 }
 function invalidate(){if(!raf&&!disposed)raf=requestAnimationFrame(frame);}
 function fit(reset=false){
  const rect=host.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
  const wasPortrait=portrait;
  width=rect.width;height=rect.height;
  // The backdrop's extra height must not switch an iPad from its existing wide island layout.
  portrait=width/Math.max(1,height-180)<.85;model.layout(portrait);
  const azimuthLimit=portrait?.14:.42;
  controls.minAzimuthAngle=-azimuthLimit;controls.maxAzimuthAngle=azimuthLimit;
  const viewHeight=portrait?44*height/670:Math.max(20,27/(width/height)),viewWidth=viewHeight*width/height;
  baseHeight=viewHeight;camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;
  camera.zoom=zoom;camera.updateProjectionMatrix();renderer.setSize(width,height,false);positionActor();
  if(reset||portrait!==wasPortrait){camera.position.set(0,portrait?28:24,portrait?36:40);controls.target.set(0,.9,portrait?-2.5:-.6);camera.lookAt(controls.target);controls.update();}
  else if(Math.abs(controls.getAzimuthalAngle())>azimuthLimit)controls.update();
  frameCallouts();invalidate();
 }
 const observer=new ResizeObserver(()=>fit());observer.observe(host);
 const intersection=new IntersectionObserver(entries=>{lastTime=0;inView=entries[0]?.isIntersecting??true;if(inView)invalidate();});intersection.observe(host);
 controls.addEventListener('change',()=>{frameCallouts();invalidate();});
 function visibility(){lastTime=0;if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else invalidate();}
 document.addEventListener('visibilitychange',visibility);
 function motion(){moving=!reduced.matches;if(reduced.matches&&travel)finish();if(!moving){model.boat.rotation.z=0;model.boat.position.y=.05;}invalidate();}
 reduced.addEventListener('change',motion);
 let downX=0,downY=0,tapPointer:number|null=null;
 const activePointers=new Set<number>();
 function down(e:PointerEvent){activePointers.add(e.pointerId);if(activePointers.size===1){downX=e.clientX;downY=e.clientY;tapPointer=e.pointerId;}else tapPointer=null;}
 function cancelPointer(e:PointerEvent){activePointers.delete(e.pointerId);tapPointer=null;}
 function up(e:PointerEvent){
  const tap=tapPointer===e.pointerId;activePointers.delete(e.pointerId);if(!activePointers.size)tapPointer=null;
  if(!tap||e.button!==0||Math.hypot(e.clientX-downX,e.clientY-downY)>6||travel)return;
  const rect=canvas.getBoundingClientRect(),pointer=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(pointer,camera);
  const hit=ray.intersectObjects([...model.islands,model.formulationBuilding],true)[0];
  for(let object:THREE.Object3D|null=hit?.object??null;object;object=object.parent)if(object===model.formulationBuilding){onLandmark?.();return;}
  const id=hit?.object.userData.stageId as StageId|undefined;
  if(!id||travel)return;
  onSelect(id);
 }
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancelPointer);
 canvas.addEventListener('webglcontextlost',lost);
 function lost(e:Event){e.preventDefault();onLocked('3D地圖暫停，請切換「關卡清單」繼續選擇。');}
 function rotate(delta:number){
  if(travel)return;
  const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);
  s.theta=THREE.MathUtils.clamp(s.theta+delta,controls.minAzimuthAngle,controls.maxAzimuthAngle);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));controls.update();invalidate();
 }
 function key(e:KeyboardEvent){
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();rotate(e.key==='ArrowLeft'?-.14:.14);}
  else if(e.key==='Home'){e.preventDefault();zoom=1;fit(true);}
 }
 canvas.addEventListener('keydown',key);
 model.state(state.selected,state.completed);fit(true);
 return {
  update(next:IslandState){state=next;if(!stageUnlocked(currentIsland,next.completed)){cancel();currentIsland=next.completed.at(-1)??sevenStages[0].id;atGate=false;islandSession={id:currentIsland,atGate};positionActor();}if(travel&&!stageUnlocked(travel.to,next.completed)){cancel();onLocked('關卡尚未解鎖，請先完成前一關。');}model.state(next.selected,next.completed);invalidate();},
  walk(to:StageId,arrive:()=>void,onCancel?:()=>void){
   if(travel||!stageUnlocked(to,state.completed))return false;
   if(currentIsland===to&&atGate){arrive();return true;}
   zoom=1;fit(true);
   const path=planIslandWalk(currentIsland,to,state.completed,portrait,atGate);if(!path)return false;
   travel={from:currentIsland,to,fromGate:atGate,progress:0,duration:Math.max(1.2,path.length/4),arrive,cancel:onCancel};
   controls.enableRotate=false;lastTime=0;phase=0;
   if(reduced.matches)finish();else{draw();invalidate();}return true;
  },
  cancel,skip(){finish();},
  rotate,zoom(delta:number){if(travel)return;zoom=THREE.MathUtils.clamp(zoom+delta,.8,1.25);frameCallouts();invalidate();},
  home(){if(travel)return;zoom=1;fit(true);},
  pause(){moving=false;invalidate();},resume(){moving=!reduced.matches;invalidate();},
  dispose(){
   disposed=true;if(raf)cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();controls.dispose();
   document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',motion);
   canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancelPointer);canvas.removeEventListener('keydown',key);canvas.removeEventListener('webglcontextlost',lost);
   const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
   scene.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]){materials.add(m);const map=(m as THREE.MeshBasicMaterial).map;if(map)textures.add(map);}});
   geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());renderer.dispose();canvas.remove();leaderLayer.remove();
  }
 };
}
