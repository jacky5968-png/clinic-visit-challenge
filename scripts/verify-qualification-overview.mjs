import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {unzipSync} from 'fflate';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const backup='backups/before-qualification-overview-20261025-161338.zip';
const before=unzipSync(await fs.readFile(backup));
const allowed=new Set(['src/screens/Products.tsx','README.md']);
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const files=[];
for(const [entry,bytes] of Object.entries(before)){
 const file=entry.replaceAll('\\','/');
 if(file.endsWith('/')||allowed.has(file))continue;
 const current=await fs.readFile(file);files.push({file,unchanged:hash(current)===hash(bytes),sha256:hash(current)});
}
const previous=JSON.parse(await fs.readFile('output/ten-question-five-product-verification.json','utf8'));
for(const entry of previous.files.filter(f=>f.file.startsWith('public/')||path.isAbsolute(f.file))){
 const current=await fs.readFile(entry.file);files.push({file:entry.file,unchanged:hash(current)===entry.sha256,sha256:hash(current)});
}
const source=await fs.readFile(previous.source.file);
const sourceUnchanged=hash(source)===previous.source.sha256;
const unit=JSON.parse(await fs.readFile('output/qualification-overview-unit.json','utf8'));
const ui=JSON.parse(await fs.readFile('output/qualification-overview-ui.json','utf8'));
const report={checkedAt:new Date().toISOString(),backup,changedExistingSource:['src/screens/Products.tsx'],newSource:['src/components/QualificationOverview.tsx','src/styles/qualification-overview.css'],files,source:{file:previous.source.file,unchanged:sourceUnchanged,sha256:hash(source)},unit:{total:unit.numTotalTests,passed:unit.numPassedTests,success:unit.success},ui,localOnly:true,published:false};
report.allPassed=files.every(f=>f.unchanged)&&sourceUnchanged&&unit.success&&ui.allPassed;
await fs.writeFile('output/qualification-overview-verification.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({protectedFiles:files.length,sourceUnchanged,unit:report.unit,stages:ui.stages.length,sourceEntries:ui.stages.reduce((n,s)=>n+s.qualified.length+s.pending.length,0),allPassed:report.allPassed},null,2));
if(!report.allPassed)process.exitCode=1;
