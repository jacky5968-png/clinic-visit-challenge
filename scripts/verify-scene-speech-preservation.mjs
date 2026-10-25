import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { unzipSync } from 'fflate';
const project=fileURLToPath(new URL('..',import.meta.url));
process.chdir(project);
const before=unzipSync(await fs.readFile('backups/v5-before-scene-speech-20261025.zip'));
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const allowed=new Set(["src/components/Clinic3DExplorer.tsx","src/three/createClinicRenderer.ts","src/styles/readability.css","README.md"]);
const files=[];
for(const [file,bytes] of Object.entries(before)){
  if(allowed.has(file))continue;
  const current=await fs.readFile(file);
  files.push({file,unchanged:hash(current)===hash(bytes),sha256:hash(current)});
}
const originalRoot=path.join(path.dirname(path.dirname(project)),'互動式問答','quiz-web','src');
for(const [file,expected] of [
  ['config/quiz.ts','e295f380339e55325ff9e244806ef7071d742efaee12aa388f91200d91ab351c'],
  ['services/quizDataService.ts','5854f6d1c3eeef65719dac0abd6f399a48c74584768b912dc0e65028759872ef']
]){
  const full=path.join(originalRoot,file),current=await fs.readFile(full);
  files.push({file:full,unchanged:hash(current)===expected,sha256:hash(current)});
}
async function pair(file){return [Buffer.from(before[file]).toString(),await fs.readFile(file,'utf8')];}
const structure=[];
for(const [file,part,label] of [
  ['src/engine/clinic.ts',s=>s.slice(0,s.indexOf('export const locations')),'stable navigation IDs and coordinates'],
  ['src/engine/clinic.ts',s=>s.slice(s.indexOf('export function planClinicRoute')),'unchanged visit route and progress logic'],
  ['src/engine/freeWalk.ts',s=>s.slice(s.indexOf('export function isWalkable')),'unchanged movement, interaction and A-star algorithms'],
  ['src/engine/clinic3d.ts',s=>s.slice(0,s.indexOf('export const labelAnchors')),'unchanged world conversion and destinations'],
  ['src/data/visitMissions.ts',s=>JSON.stringify(s.match(/required:\s*\[[^\]]*\]/g)),'unchanged mission prerequisite IDs']
]){
  const [a,b]=await pair(file);structure.push({label,unchanged:part(a)===part(b)});
}
const allPassed=files.every(f=>f.unchanged)&&structure.every(f=>f.unchanged);
const report={checkedAt:new Date().toISOString(),backup:'backups/v5-before-scene-speech-20261025.zip',files,structure,allPassed};
await fs.writeFile('output/scene-speech-preservation-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({files:files.length,structuralChecks:structure.length,allPassed}));
if(!allPassed)process.exitCode=1;
