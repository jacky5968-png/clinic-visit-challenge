import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {unzipSync} from 'fflate';
import Papa from 'papaparse';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const backup='backups/before-10-questions-5-products-20261025-154903.zip';
const before=Object.fromEntries(Object.entries(unzipSync(await fs.readFile(backup))).map(([p,b])=>[p.replaceAll('\\','/'),b]));
const allowed=new Set([
 'README.md','src/App.tsx','src/engine/quiz.ts','src/engine/state.ts','src/engine/stageProgress.ts','src/engine/clinic.ts','src/hooks/useStageProgress.ts',
 'src/screens/Products.tsx','src/screens/Quiz.tsx','src/screens/Result.tsx','src/screens/Home.tsx','src/screens/Clinic.tsx','src/screens/Consultation.tsx',
 'src/components/MissionSelector.tsx','src/components/HelpDialog.tsx','src/components/DoctorSceneDialogue.tsx',
 'src/data/sevenStages.ts','src/data/visitMissions.ts','src/data/sceneLocations.ts','src/data/csvLoader.ts','src/styles/readability.css',
 'tests/quiz.test.ts','tests/sevenStages.test.ts','tests/doctorSceneConversation.test.ts','tests/stages-e2e/journey.spec.ts',
]);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=[];
for(const [file,bytes] of Object.entries(before)){
 if(file.endsWith('/')||allowed.has(file))continue;
 const current=await fs.readFile(file);files.push({file,unchanged:hash(current)===hash(bytes),sha256:hash(current)});
}
const prior=JSON.parse(await fs.readFile('output/island-callout-preservation-audit.json','utf8'));
for(const entry of prior.files.filter(f=>f.file.startsWith('public/')||path.isAbsolute(f.file))){
 const current=await fs.readFile(entry.file);files.push({file:entry.file,unchanged:hash(current)===entry.sha256,sha256:hash(current)});
}
const oldLoader=Buffer.from(before['src/data/csvLoader.ts']).toString(),loader=await fs.readFile('src/data/csvLoader.ts','utf8');
const oldStages=Buffer.from(before['src/data/sevenStages.ts']).toString(),stages=await fs.readFile('src/data/sevenStages.ts','utf8');
const stageDefinitions=s=>s.slice(s.indexOf('export const sevenStages:'),s.indexOf('export const defaultStage'));
const structuralChecks=[
 {name:'CSV parsing and original question/option/answer handling unchanged',passed:oldLoader.replace('隨機抽出5題','隨機抽出10題')===loader},
 {name:'Seven stages, people and assigned categories unchanged',passed:stageDefinitions(oldStages)===stageDefinitions(stages)},
];
const sourceFile='output/island-walking-live-source.csv',source=await fs.readFile(sourceFile);
const sourceUnchanged=hash(source)==='51327db997201f34ee15cd5c29e122962892717342972ac23ab91b20a9665b6d';
const rows=Papa.parse(source.toString('utf8'),{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim()}).data;
const products=new Map();
for(const r of rows){const name=r['產品'].trim();if(!products.has(name))products.set(name,{name,category:(r['顯示分類']||r['藥理分類']).trim(),prompts:new Set()});products.get(name).prompts.add(r['題目'].trim());}
const categories=[['新人必修'],['商品名測驗'],['呼吸系統'],['自費'],['胃腸藥'],['肌肉骨骼'],['糖尿病','高血壓','高血脂','泌尿科','痛風']];
const availability=categories.map((tags,i)=>({stage:i+1,categories:tags,eligibleProducts:[...products.values()].filter(p=>tags.some(t=>p.category.split(/[|｜]/).map(c=>c.trim()).includes(t))&&p.prompts.size>=10).length}));
const unit=JSON.parse(await fs.readFile('output/ten-question-five-product-unit.json','utf8'));
const ui=JSON.parse(await fs.readFile('output/ten-question-five-product-ui.json','utf8'));
const report={checkedAt:new Date().toISOString(),backup,files,structuralChecks,source:{file:sourceFile,sha256:hash(source),unchanged:sourceUnchanged,products:products.size,questions:rows.length},availability,unit:{total:unit.numTotalTests,passed:unit.numPassedTests,success:unit.success},ui,localOnly:true,published:false};
report.allPassed=files.every(f=>f.unchanged)&&structuralChecks.every(c=>c.passed)&&sourceUnchanged&&availability.every(a=>a.eligibleProducts>=5)&&unit.success&&ui.allPassed;
await fs.writeFile('output/ten-question-five-product-verification.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({protectedFiles:files.length,structuralChecks,availability,unit:report.unit,uiRuns:ui.runs.length,allPassed:report.allPassed},null,2));
if(!report.allPassed)process.exitCode=1;
