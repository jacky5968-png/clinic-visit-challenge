import {describe,it,expect} from 'vitest';
import {sevenStages,getStage} from '../src/data/sevenStages';
import {allowedInStage} from '../src/data/stageRules';
import {completedStages,stageQualifications,recordStageCompletion,parseStageProgress,stageUnlocked,STAGE_STORAGE_KEY,LEGACY_STAGE_STORAGE_KEY,type StageCompletion} from '../src/engine/stageProgress';
import {MISSION_STORAGE_KEY,missionProductKey} from '../src/engine/missionProgress';
import type {Product,Question} from '../src/types';
function fixture(){
 const products:Product[]=sevenStages.flatMap((s,i)=>Array.from({length:5},(_,j)=>({id:'p'+i+'-'+j,name:'測試主題'+i+'-'+j,category:s.allowedCategories[0],ingredient:'',image:'',description:'',demo:false})));
 const bank:Question[]=products.flatMap(p=>Array.from({length:10},(_,i)=>({id:p.id+'-q'+i,productId:p.id,prompt:p.name+'第'+i+'題',options:['A','B','C','D'] as Question['options'],correctIndex:0})));
 const records:StageCompletion[]=products.map((p,i)=>({missionId:sevenStages[Math.floor(i/5)].id,productKey:missionProductKey(p,bank),productName:p.name,questionCount:10,correctCount:10,completedAt:Date.now()}));
 return{products,bank,records};
}
describe('seven stage restrictions',()=>{
 it('keeps all seven names, roles and classification rules',()=>{
  expect(sevenStages.map(s=>s.clinic)).toEqual(['新訓中心','認識產品','耳鼻喉科診所','藥局客戶','胃腸科診所','骨科診所','家醫科診所']);
  expect(sevenStages.slice(2).map(s=>s.doctor.name)).toEqual(['林醫師','謝藥師','王醫師','李醫師','陳醫師']);
  expect(getStage('pharmacy-client').target).toBe('reception');
 });
 it('filters by exact category tags, not product names or partial matches',()=>{
  const {products}=fixture(),p=products[0];
  expect(allowedInStage({...p,name:'呼吸系統',category:'商品名測驗'},getStage('product-names'))).toBe(true);
  expect(allowedInStage({...p,name:'呼吸系統',category:'商品名測驗'},getStage('ent'))).toBe(false);
  expect(allowedInStage({...p,name:'糖尿病',category:'商品名測驗'},getStage('family'))).toBe(false);
  expect(allowedInStage({...p,category:'糖尿病學'},getStage('family'))).toBe(false);
  for(const category of ['泌尿科|自費',' 泌尿科 ｜ 自費 ']){
   expect(allowedInStage({...p,category},getStage('pharmacy-client'))).toBe(true);
   expect(allowedInStage({...p,category},getStage('family'))).toBe(true);
  }
  expect(allowedInStage({...p,demo:true},sevenStages[0])).toBe(false);
 });
 it('unlocks sequentially and allows replay of completed stages',()=>{
  expect(stageUnlocked('new-training',[])).toBe(true);expect(stageUnlocked('product-names',[])).toBe(false);
  expect(stageUnlocked('product-names',['new-training'])).toBe(true);
  expect(stageUnlocked('family',['new-training'])).toBe(false);
 });
 it('counts a stage independently of the product used in later stages',()=>{
  const {products,bank,records}=fixture();
  expect(completedStages(records,products,bank)).toEqual(sevenStages.map(s=>s.id));
  expect(completedStages(records.slice(1),products,bank)).toEqual([]);
  expect(completedStages([records[0]],products,bank)).toEqual([]);
  expect(completedStages(records.slice(0,4),products,bank)).toEqual([]);
  expect(completedStages(records.slice(0,5),products,bank)).toEqual(['new-training']);
 });
 it('invalidates changed bank content or changed eligibility without erasing records',()=>{
  const {products,bank,records}=fixture();
  const changed=bank.map((q,i)=>i===0?{...q,prompt:q.prompt+'版本2'}:q);
  expect(completedStages(records,products,changed)).toEqual([]);
  expect(completedStages(records,products.map((p,i)=>i===0?{...p,category:'其他'}:p),bank)).toEqual([]);
  expect(completedStages(records,products,bank)).toHaveLength(7);
  expect(records).toHaveLength(35);
 });
 it('uses a separate storage key and rejects malformed completions',()=>{
  expect(STAGE_STORAGE_KEY).not.toBe(MISSION_STORAGE_KEY);
  expect(STAGE_STORAGE_KEY).not.toBe(LEGACY_STAGE_STORAGE_KEY);
  expect(parseStageProgress('bad')).toEqual([]);
  expect(parseStageProgress(JSON.stringify({version:1,completed:[{missionId:'new-training'}]}))).toEqual([]);
  const {records}=fixture();expect(parseStageProgress(JSON.stringify({version:1,completed:records}))).toEqual([]);
  expect(parseStageProgress(JSON.stringify({version:2,completed:records}))).toHaveLength(35);
 });
 it('does not count a replay, a 90-point attempt or an old five-question pass',()=>{
  const {products,bank,records}=fixture(),first=records[0];
  let saved=recordStageCompletion([],first);
  for(let i=0;i<8;i++)saved=recordStageCompletion(saved,{...first,completedAt:Date.now()+i});
  expect(saved).toHaveLength(1);
  expect(recordStageCompletion(saved,{...records[1],correctCount:9})).toBe(saved);
  expect(recordStageCompletion(saved,{...records[1],questionCount:5,correctCount:5})).toBe(saved);
  expect(stageQualifications([...saved,first,first],products,bank)['new-training']).toHaveLength(1);
  expect(completedStages([...saved,first,first,first,first],products,bank)).toEqual([]);
 });
 it('keeps the next stage locked until the fifth distinct product and survives serialization',()=>{
  const {products,bank,records}=fixture();
  for(let n=0;n<5;n++)expect(stageUnlocked('product-names',completedStages(records.slice(0,n),products,bank))).toBe(false);
  const restored=parseStageProgress(JSON.stringify({version:2,completed:records.slice(0,5)}));
  expect(stageUnlocked('product-names',completedStages(restored,products,bank))).toBe(true);
  expect(stageUnlocked('ent',completedStages(restored,products,bank))).toBe(false);
 });
 it('rejects mismatched categories, too-short banks and invalid evidence without removing history',()=>{
  const {products,bank,records}=fixture();
  const bad=[{...records[0],questionCount:5,correctCount:5},{...records[1],correctCount:9}];
  expect(parseStageProgress(JSON.stringify({version:2,completed:bad}))).toEqual([]);
  const short=bank.filter(q=>q.productId!==products[0].id||q.id!==products[0].id+'-q9');
  expect(completedStages(records,products,short)).toEqual([]);
  expect(stageQualifications(records,products,short)['new-training']).toHaveLength(4);
  expect(records).toHaveLength(35);
 });
});
