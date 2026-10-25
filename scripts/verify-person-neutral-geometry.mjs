import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {unzipSync} from 'fflate';
const require=createRequire(import.meta.url);
const before=unzipSync(await fs.readFile('backups/v5-before-staff-animation-20261025.zip'));
function load(source){
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m={exports:{}};new Function('require','exports','module',compiled)(require,m.exports,m);return m.exports.createPerson;
}
const previous=load(Buffer.from(before['src/three/person.ts']).toString());
const current=load(await fs.readFile('src/three/person.ts','utf8'));
function neutral(rig,walking){
 rig.pose(1.2,walking);rig.root.updateMatrixWorld(true);
 const meshes=[];rig.root.traverse(o=>{
  if(o.isMesh)meshes.push(JSON.stringify({shape:o.geometry.type,parameters:o.geometry.parameters,color:o.material.color?.getHex(),matrix:o.matrixWorld.elements.map(n=>+n.toFixed(9))}));
 });return meshes.sort();
}
const checked=[];
for(const [role,doctor,appearance] of [
 ['外勤',false,undefined],['醫師',true,undefined],
 ['藥師',true,{hair:0x574538,coat:0xf8fff8,glasses:true,stethoscope:false,badge:0x00866a}],
 ['掛號人員',true,{hair:0x303643,coat:0x2877ce,glasses:false,stethoscope:false,badge:0xffd16a}]
]){
 for(const walking of [false,true]){
  assert.deepEqual(neutral(current(doctor,appearance),walking),neutral(previous(doctor,appearance),walking),role+' preserved geometry');
  checked.push({role,walking,unchanged:true});
 }
}
await fs.writeFile('output/person-neutral-geometry-audit.json',JSON.stringify({checked,allPassed:true},null,2));
console.log('8 original neutral/walking mesh comparisons passed');
