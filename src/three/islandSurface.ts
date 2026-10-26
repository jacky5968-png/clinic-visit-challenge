import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Periodic colour and caustic detail: one small shared texture, no water simulation.
export function createIslandWaterTexture(){
 const size=256,data=new Uint8Array(size*size*4),tau=Math.PI*2;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size*tau,v=y/size*tau;
  const swell=Math.sin(2*u+Math.sin(3*v))*.5+Math.sin(3*v-u)*.3;
  const ripple=Math.sin(17*u+3*Math.sin(9*v))+Math.sin(19*v+2*Math.sin(7*u));
  const glint=Math.pow(Math.max(0,1-Math.abs(ripple)*5),3)*.42;
  const base=[7+swell*5,177+swell*14,215+swell*10],i=(y*size+x)*4;
  for(let c=0;c<3;c++)data[i+c]=Math.round(base[c]+([182,246,255][c]-base[c])*glint);
  data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
 texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.repeat.set(12,12);texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}

// Bake immovable furnishings per material while retaining named interaction objects.
export function batchIslandSurfaces(group:THREE.Group){
 for(const child of [...group.children])if(child instanceof THREE.Group)batchIslandSurfaces(child);
 const buckets=new Map<THREE.Material,THREE.Mesh[]>();
 for(const child of group.children)if(child instanceof THREE.Mesh&&!child.name&&!Array.isArray(child.material)){
  const list=buckets.get(child.material)??[];list.push(child);buckets.set(child.material,list);
 }
 for(const [material,meshes] of buckets){
  if(meshes.length<2)continue;
  const geometries=meshes.map(mesh=>{mesh.updateMatrix();const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();return geometry.applyMatrix4(mesh.matrix);});
  const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
  if(!geometry)continue;
  const combined=new THREE.Mesh(geometry,material);combined.castShadow=meshes.some(m=>m.castShadow);combined.receiveShadow=meshes.some(m=>m.receiveShadow);
  meshes.forEach(mesh=>{group.remove(mesh);mesh.geometry.dispose();});group.add(combined);
 }
}
