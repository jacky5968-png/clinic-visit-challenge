import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {buildClinic} from './buildClinic';
// Reuse the original clinic floor plan; draw at high resolution only when its view changes.
export function createHomeWorld(host:HTMLElement){
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 const canvas=renderer.domElement;canvas.dataset.testid='home-world-canvas';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','高畫質生達診所全景：藥局、掛號櫃台、醫師診間與外勤代表，可拖曳旋轉');host.append(canvas);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xc9f4ed);
 let model:ReturnType<typeof buildClinic>;
 try{model=buildClinic();}catch(error){renderer.dispose();renderer.forceContextLoss();canvas.remove();throw error;}
 model.markers.forEach(marker=>{marker.visible=false;});
 model.actor.root.position.set(-.8,.15,1.1);model.actor.root.rotation.y=-Math.PI/4;
 const anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 model.root.traverse(object=>{if(object instanceof THREE.Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material])if('map'in material&&material.map instanceof THREE.Texture)material.map.anisotropy=anisotropy;});
 model.root.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(model.root),corners:THREE.Vector3[]=[];
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(new THREE.Vector3(x,y,z));
 scene.add(model.root);scene.add(new THREE.HemisphereLight(0xf4ffff,0x648a91,1.6));
 const light=new THREE.DirectionalLight(0xffefd2,3);light.position.set(-8,20,12);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.1,far:60});light.shadow.camera.updateProjectionMatrix();light.shadow.normalBias=.02;scene.add(light);
 const camera=new THREE.OrthographicCamera(-10,10,7,-7,.1,100);camera.position.set(15,13,17);
 const controls=new OrbitControls(camera,canvas);controls.target.set(0,.8,0);controls.enablePan=false;controls.enableZoom=false;controls.enableDamping=false;controls.minPolarAngle=.65;controls.maxPolarAngle=1.2;controls.minAzimuthAngle=.12;controls.maxAzimuthAngle=1.38;
 let frame=0,disposed=false,draws=0,width=1,height=1;
 function fit(){
  camera.updateMatrixWorld(true);
  const view=corners.map(p=>p.clone().applyMatrix4(camera.matrixWorldInverse)),xs=view.map(p=>p.x),ys=view.map(p=>p.y);
  const centerX=(Math.min(...xs)+Math.max(...xs))/2,centerY=(Math.min(...ys)+Math.max(...ys))/2,aspect=width/height;
  const span=Math.max(Math.max(...ys)-Math.min(...ys),(Math.max(...xs)-Math.min(...xs))/aspect)*1.06;
  camera.left=centerX-span*aspect/2;camera.right=centerX+span*aspect/2;camera.top=centerY+span/2;camera.bottom=centerY-span/2;camera.updateProjectionMatrix();
 }
 function invalidate(){if(!disposed&&!frame)frame=requestAnimationFrame(()=>{frame=0;if(!disposed){renderer.render(scene,camera);canvas.dataset.renderer='webgl';canvas.dataset.renderMode='on-demand';canvas.dataset.scene='original-clinic';canvas.dataset.frames=String(++draws);canvas.dataset.drawCalls=String(renderer.info.render.calls);canvas.dataset.pixelRatio=renderer.getPixelRatio().toFixed(2);canvas.dataset.shadowSize=String(light.shadow.mapSize.x);canvas.dataset.textureAnisotropy=String(anisotropy);const projected=corners.map(p=>p.clone().project(camera)),xs=projected.map(p=>(p.x+1)*width/2),ys=projected.map(p=>(1-p.y)*height/2);canvas.dataset.modelArea=JSON.stringify({x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)});}});}
 function change(){fit();invalidate();}
 function resize(){const rect=host.getBoundingClientRect();if(!rect.width||!rect.height)return;width=rect.width;height=rect.height;renderer.setPixelRatio(Math.min(2,Math.sqrt(2400000/(width*height))));renderer.setSize(width,height,false);fit();invalidate();}
 controls.addEventListener('change',change);controls.update();const observer=new ResizeObserver(resize);observer.observe(host);resize();
 return {dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();const geometry=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();scene.traverse(object=>{if(object instanceof THREE.Mesh){geometry.add(object.geometry);for(const m of Array.isArray(object.material)?object.material:[object.material]){materials.add(m);if('map'in m&&m.map instanceof THREE.Texture)textures.add(m.map);}}});geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());light.shadow.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();}};
}
