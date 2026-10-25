import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { unzipSync } from 'fflate';
const project=fileURLToPath(new URL('..',import.meta.url));
const root=path.dirname(path.dirname(project));
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const before=unzipSync(await fs.readFile('backups/v5-before-readability-20261025.zip'));
const allowed=new Set(['src/styles.css','src/styles/clinic3d.css','src/styles/missions.css','src/main.tsx','src/data/visitMissions.ts','src/three/buildClinic.ts','src/three/createClinicRenderer.ts','README.md']);
const checked=[];
for(const [file,data] of Object.entries(before)){
  if(allowed.has(file))continue;
  const current=await fs.readFile(file);
  checked.push({file,unchanged:hash(data)===hash(current),sha256:hash(current)});
}
const originals=[
  ['config/quiz.ts','e295f380339e55325ff9e244806ef7071d742efaee12aa388f91200d91ab351c'],
  ['services/quizDataService.ts','5854f6d1c3eeef65719dac0abd6f399a48c74584768b912dc0e65028759872ef']
];
for(const [file,expected] of originals){
  const p=path.join(root,'互動式問答','quiz-web','src',file);
  const data=await fs.readFile(p);
  checked.push({file:p,unchanged:hash(data)===expected,sha256:hash(data)});
}
const themeOnly=Buffer.from(before['src/data/visitMissions.ts']).toString().replace(/theme:\s*\{[^}]+\}/g,'theme: {}')===(await fs.readFile('src/data/visitMissions.ts','utf8')).replace(/theme:\s*\{[^}]+\}/g,'theme: {}');
const report={themeOnly,checkedAt:new Date().toISOString(),backup:'backups/v5-before-readability-20261025.zip',checked,allPassed:themeOnly && checked.every(p=>p.unchanged)};
await fs.writeFile('output/readability-preservation-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({checked:checked.length,allPassed:report.allPassed}));
if(!report.allPassed)process.exitCode=1;
