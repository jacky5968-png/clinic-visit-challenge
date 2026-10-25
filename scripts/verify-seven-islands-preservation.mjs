import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {unzipSync} from 'fflate';
const project=fileURLToPath(new URL('..',import.meta.url));process.chdir(project);
const baseline='backups/v5-before-seven-islands-20261025.zip',before=unzipSync(await fs.readFile(baseline));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const allowed=new Set(['README.md','src/components/MissionSelector.tsx','src/screens/Products.tsx']),files=[];
for(const [file,bytes] of Object.entries(before)){
 if(allowed.has(file))continue;
 const now=await fs.readFile(file);files.push({file,unchanged:hash(now)===hash(bytes),sha256:hash(now)});
}
const prior=JSON.parse(await fs.readFile('output/distinct-scenes-preservation-audit.json','utf8'));
for(const entry of prior.files.filter(f=>path.isAbsolute(f.file))){
 const now=await fs.readFile(entry.file);files.push({file:entry.file,unchanged:hash(now)===entry.sha256,sha256:hash(now)});
}
const oldProducts=Buffer.from(before['src/screens/Products.tsx']).toString(),newProducts=await fs.readFile('src/screens/Products.tsx','utf8');
const strip=s=>s.replace(/<MissionSelector[\s\S]*?\/>/,'').replace(/\s+/g,'');
const structuralChecks=[{name:'Products only moves the existing mission selector before bank selection; all quiz loading, filtering and start logic remains identical',passed:strip(oldProducts)===strip(newProducts)}];
const report={checkedAt:new Date().toISOString(),baseline,allowedChanges:[...allowed],files,structuralChecks,allPassed:files.every(f=>f.unchanged)&&structuralChecks.every(c=>c.passed)};
await fs.writeFile('output/seven-islands-preservation-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({protectedFiles:files.length,structuralChecks:structuralChecks.length,allPassed:report.allPassed}));
if(!report.allPassed)process.exitCode=1;
