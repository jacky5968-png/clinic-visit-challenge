import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {unzipSync} from 'fflate';
const project=fileURLToPath(new URL('..',import.meta.url));process.chdir(project);
const baseline='backups/v5-before-distinct-stage-scenes-20261025.zip';
const before=unzipSync(await fs.readFile(baseline));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const allowed=new Set(['src/three/buildClinic.ts','README.md']);
const files=[];
for(const [file,bytes] of Object.entries(before)){
 if(allowed.has(file))continue;
 const now=await fs.readFile(file);files.push({file,unchanged:hash(now)===hash(bytes),sha256:hash(now)});
}
const prior=JSON.parse(await fs.readFile('output/seven-stage-preservation-audit.json','utf8'));
for(const entry of prior.files.filter(f=>path.isAbsolute(f.file))){
 const current=await fs.readFile(entry.file);files.push({file:entry.file,unchanged:hash(current)===entry.sha256,sha256:hash(current)});
}
const report={checkedAt:new Date().toISOString(),baseline,allowedChanges:[...allowed],files,allPassed:files.every(f=>f.unchanged)};
await fs.writeFile('output/distinct-scenes-preservation-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({protectedFiles:files.length,allPassed:report.allPassed}));
if(!report.allPassed)process.exitCode=1;
