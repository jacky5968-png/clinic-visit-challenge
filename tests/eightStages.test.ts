import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {getStage,sevenStages} from '../src/data/sevenStages';
import {allowedInStage} from '../src/data/stageRules';
import {parseQuizCsv} from '../src/data/csvLoader';
import {availableQuestionCount} from '../src/engine/quiz';
import {missionProductKey} from '../src/engine/missionProgress';
import {stageQualifications,parseStageProgress,type StageCompletion} from '../src/engine/stageProgress';

const {products,questions}=parseQuizCsv(readFileSync('tests/fixtures/seven-stage-source.csv','utf8'));
it('the original bank supplies all four internal-medicine categories and all three family categories without crossing them',()=>{
 const internal=getStage('internal-medicine'),family=getStage('family');
 expect(internal.stageNumber).toBe(7);expect(family.stageNumber).toBe(8);
 for(const stage of [internal,family])for(const category of stage.allowedCategories){
  const eligible=products.filter(p=>allowedInStage(p,{...stage,allowedCategories:[category]}));
  expect(eligible.length,category).toBeGreaterThan(0);
  expect(eligible.every(p=>availableQuestionCount(questions,p.id)>=10),category).toBe(true);
 }
 expect(products.filter(p=>allowedInStage(p,internal)&&allowedInStage(p,family))).toEqual([]);
 expect(sevenStages.map(s=>s.stageNumber)).toEqual([1,2,3,4,5,6,7,8]);
});
it('redistributes old family urology and gout qualifications while retaining chronic-2 records and untouched serialized evidence',()=>{
 const categories=['泌尿科','痛風','糖尿病','高血壓','高血脂'];
 const records:StageCompletion[]=categories.map(category=>{
  const product=products.find(p=>allowedInStage(p,{...getStage('family'),allowedCategories:[category]}))!;
  return {missionId:'family',productKey:missionProductKey(product,questions),productName:product.name,completedAt:Date.now(),questionCount:10,correctCount:10};
 });
 const before=JSON.stringify(records),saved=parseStageProgress(JSON.stringify({version:2,completed:records}));
 const qualified=stageQualifications(saved,products,questions);
 expect(qualified['internal-medicine'].map(r=>r.productName)).toEqual(records.slice(0,2).map(r=>r.productName));
 expect(qualified.family.map(r=>r.productName)).toEqual(records.slice(2).map(r=>r.productName));
 expect(JSON.stringify(saved)).toBe(before);
 const replay={...records[0],missionId:'internal-medicine' as const};
 expect(stageQualifications([...saved,replay],products,questions)['internal-medicine']).toHaveLength(2);
 const invalid=saved.map((r,i)=>i===0?{...r,productKey:'stale'}:r);
 expect(stageQualifications(invalid,products,questions)['internal-medicine']).toHaveLength(1);
});
