import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {unzipSync} from 'fflate';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const backup='backups/before-overview-search-filter-20261025-163608.zip';
const before=unzipSync(await fs.readFile(backup));
const allowed=new Set(['src/components/QualificationOverview.tsx','src/styles/qualification-overview.css','docs/七關合格進度總覽.md','README.md']);
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const files=[];
for(const [entry,bytes] of Object.entries(before)){
 const file=entry.replaceAll('\\','/');
 if(file.endsWith('/')||allowed.has(file))continue;
 const current=await fs.readFile(file);files.push({file,unchanged:hash(current)===hash(bytes),sha256:hash(current)});
}
const previous=JSON.parse(await fs.readFile('output/qualification-overview-verification.json','utf8'));
for(const entry of previous.files.filter(f=>f.file.startsWith('public/')||path.isAbsolute(f.file))){
 const current=await fs.readFile(entry.file);files.push({file:entry.file,unchanged:hash(current)===entry.sha256,sha256:hash(current)});
}
const source=await fs.readFile(previous.source.file),sourceUnchanged=hash(source)===previous.source.sha256;
const unit=JSON.parse(await fs.readFile('output/overview-search-filter-unit.json','utf8'));
const ui=JSON.parse(await fs.readFile('output/overview-search-filter-ui.json','utf8'));
const report={checkedAt:new Date().toISOString(),backup,changedSource:['src/components/QualificationOverview.tsx','src/styles/qualification-overview.css'],files,source:{file:previous.source.file,unchanged:sourceUnchanged,sha256:hash(source)},unit:{total:unit.numTotalTests,passed:unit.numPassedTests,success:unit.success},ui,localOnly:true,published:false};
report.allPassed=files.every(f=>f.unchanged)&&sourceUnchanged&&unit.success&&ui.allPassed;
await fs.writeFile('output/overview-search-filter-verification.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({protectedFiles:files.length,sourceUnchanged,unit:report.unit,searchFilterCases:ui.cases.length,allPassed:report.allPassed},null,2));
if(!report.allPassed)process.exitCode=1;
