import type {Product,Question} from '../types';
import {sevenStages,type StageId} from '../data/sevenStages';
import {allowedInStage,categoryTags} from '../data/stageRules';
import {missionProductKey} from './missionProgress';
import {availableQuestionCount} from './quiz';
import {QUESTION_COUNT} from '../config/challenge';
export const LEGACY_STAGE_STORAGE_KEY='field-training-seven-stages-v1';
export const STAGE_STORAGE_KEY='field-training-seven-stages-v2';
export const STAGE_PROGRESS_VERSION=2;
export interface StageCompletion {
 missionId:StageId;productKey:string;productName:string;completedAt:number;
 questionCount:number;correctCount:number;
}
export type StageQualifications=Record<StageId,StageCompletion[]>;
export function validStageCompletion(value:unknown):value is StageCompletion{
 if(!value||typeof value!=='object')return false;
 const r=value as StageCompletion;
 return sevenStages.some(s=>s.id===r.missionId)&&typeof r.productKey==='string'&&r.productKey.length>0&&r.productKey.length<2000&&typeof r.productName==='string'&&Boolean(r.productName.trim())&&r.productName.length<500&&Number.isFinite(r.completedAt)&&r.completedAt>=0&&r.completedAt<=Date.now()+86400000&&r.questionCount===QUESTION_COUNT&&r.correctCount===QUESTION_COUNT;
}
export function recordStageCompletion(records:StageCompletion[],record:StageCompletion):StageCompletion[]{
 if(!validStageCompletion(record)||records.some(r=>r.missionId===record.missionId&&r.productKey===record.productKey))return records;
 return [...records,record].slice(-1000);
}
export function parseStageProgress(raw:string|null):StageCompletion[]{
 if(!raw||raw.length>500000)return [];
 try{
  const data=JSON.parse(raw);if(data?.version!==STAGE_PROGRESS_VERSION||!Array.isArray(data.completed))return [];
  return data.completed.filter(validStageCompletion).slice(-1000).reduce(recordStageCompletion,[] as StageCompletion[]);
 }catch{return [];}
}
export function hasLegacyStageProgress(raw:string|null){
 if(!raw||raw.length>500000)return false;
 try{const data=JSON.parse(raw);return data?.version===1&&Array.isArray(data.completed)&&data.completed.length>0;}catch{return false;}
}
export function stageQualifications(records:StageCompletion[],products:Product[],bank:Question[]):StageQualifications{
 const qualified=Object.fromEntries(sevenStages.map(s=>[s.id,[]])) as unknown as StageQualifications;
 const keys=new Map(products.filter(p=>!p.demo&&availableQuestionCount(bank,p.id)>=QUESTION_COUNT).map(p=>[p.name,{product:p,key:missionProductKey(p,bank)}]));
 for(const record of records){
  if(!validStageCompletion(record))continue;
  const current=keys.get(record.productName);
  if(!current||current.key!==record.productKey)continue;
  let stage=sevenStages.find(s=>s.id===record.missionId)!;
  // Keep seven-island family records intact in storage; display moved categories in the new internal-medicine stage.
  if(record.missionId==='family'&&!allowedInStage(current.product,stage)&&categoryTags(current.product.category).some(tag=>tag==='泌尿科'||tag==='痛風'))stage=sevenStages.find(s=>s.id==='internal-medicine')!;
  if(!allowedInStage(current.product,stage))continue;
  if(!qualified[stage.id].some(r=>r.productName===record.productName))qualified[stage.id].push(stage.id===record.missionId?record:{...record,missionId:stage.id});
 }
 return qualified;
}
export function completedStagesFromQualifications(qualified:StageQualifications):StageId[]{
 const done:StageId[]=[];
 for(const stage of sevenStages){
  if(qualified[stage.id].length>0)done.push(stage.id);
 }
 return done;
}
export function completedStages(records:StageCompletion[],products:Product[],bank:Question[]):StageId[]{
 return completedStagesFromQualifications(stageQualifications(records,products,bank));
}
export function stageUnlocked(id:StageId,_completed:StageId[]=[]){return sevenStages.some(stage=>stage.id===id);}
