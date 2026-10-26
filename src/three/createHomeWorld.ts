import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {buildAssessmentScene} from './buildAssessmentScene';
import {defaultStage} from '../data/sevenStages';
// Render the title-screen diorama only when its view changes.
export function createHomeWorld(host:HTMLElement){
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 const canvas=renderer.domElement;canvas.dataset.testid='home-world-canvas';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','外勤代表與外勤主管的立體訓練中心，可拖曳旋轉');host.append(canvas);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xc9f4ed);
 let model:ReturnType<typeof buildAssessmentScene>;
 try{model=buildAssessmentScene(defaultStage);}catch(error){renderer.dispose();renderer.forceContextLoss();canvas.remove();throw error;}
 scene.add(model.root);scene.add(new THREE.HemisphereLight(0xf4ffff,0x648a91,1.6));
 const light=new THREE.DirectionalLight(0xffefd2,3);light.position.set(-3,8,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:30});light.shadow.camera.updateProjectionMatrix();light.shadow.normalBias=.02;scene.add(light);
 const camera=new THREE.OrthographicCamera(-4,4,3,-3,.1,60);camera.position.set(6.5,5,8.1);
 const controls=new OrbitControls(camera,canvas);controls.target.set(0,1.15,0);controls.enablePan=false;controls.enableZoom=false;controls.enableDamping=false;controls.minPolarAngle=.65;controls.maxPolarAngle=1.2;
 let frame=0,disposed=false,draws=0;
 function invalidate(){if(!disposed&&!frame)frame=requestAnimationFrame(()=>{frame=0;if(!disposed){renderer.render(scene,camera);canvas.dataset.renderer='webgl';canvas.dataset.renderMode='on-demand';canvas.dataset.frames=String(++draws);canvas.dataset.drawCalls=String(renderer.info.render.calls);}});}
 function resize(){const {width,height}=host.getBoundingClientRect();if(!width||!height)return;const span=Math.max(4.5,6.6/(width/height));camera.left=-span*width/height/2;camera.right=-camera.left;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();renderer.setSize(width,height,false);invalidate();}
 controls.addEventListener('change',invalidate);controls.update();const observer=new ResizeObserver(resize);observer.observe(host);resize();
 return {dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();const geometry=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();scene.traverse(object=>{if(object instanceof THREE.Mesh){geometry.add(object.geometry);for(const m of Array.isArray(object.material)?object.material:[object.material]){materials.add(m);if('map'in m&&m.map instanceof THREE.Texture)textures.add(m.map);}}});geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();}};
}
