import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {batchIslandSurfaces,createIslandWaterTexture} from '../src/three/islandSurface';

describe('lightweight island artwork',()=>{
 it('uses one bounded, repeatable blue-green water texture without external assets',()=>{
  const texture=createIslandWaterTexture(),image=texture.image;
  expect(image.width*image.height).toBeLessThanOrEqual(256*256);
  expect(texture.wrapS).toBe(THREE.RepeatWrapping);expect(texture.wrapT).toBe(THREE.RepeatWrapping);
  const data=image.data as Uint8Array;
  for(let i=0;i<data.length;i+=4){expect(data[i+1]).toBeGreaterThan(data[i]);expect(data[i+2]).toBeGreaterThan(data[i+1]);expect(data[i+3]).toBe(255);}
  texture.dispose();
 });
 it('batches static furnishings without shifting their silhouette or named interaction objects',()=>{
  const group=new THREE.Group(),paint=new THREE.MeshStandardMaterial();
  const one=new THREE.Mesh(new THREE.BoxGeometry(1,2,3),paint);one.position.set(-2,1,.5);one.rotation.y=.4;one.castShadow=true;
  const two=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),paint);two.position.set(3,2,-1);two.scale.set(.6,1.5,2);two.receiveShadow=true;
  const marker=new THREE.Mesh(new THREE.TorusGeometry(3,.05,5,24),paint);marker.name='island-selection-ring';
  group.add(one,two,marker);
  const before=new THREE.Box3().setFromObject(group);batchIslandSurfaces(group);
  const after=new THREE.Box3().setFromObject(group);
  expect(group.children).toHaveLength(2);expect(group.getObjectByName(marker.name)).toBe(marker);
  expect(before.min.distanceTo(after.min)).toBeLessThan(.00001);expect(before.max.distanceTo(after.max)).toBeLessThan(.00001);
  const combined=group.children.find(c=>c!==marker) as THREE.Mesh;
  expect(combined.material).toBe(paint);expect(combined.castShadow).toBe(true);expect(combined.receiveShadow).toBe(true);
  group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});paint.dispose();
 });
});
