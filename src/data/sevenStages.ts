import {getMission,type VisitMission} from './visitMissions';
import {stageConversation} from './stageConversations';
export type StageId='new-training'|'product-names'|'ent'|'pharmacy-client'|'gastro'|'orthopedics'|'family';
export interface StageMission extends VisitMission {
 id:StageId; stageNumber:number; kind:'training'|'clinic'|'pharmacy'; allowedCategories:string[]; target:'doctor'|'reception';
}
function make(id:StageId,stageNumber:number,clinic:string,name:string,specialty:string,categories:string[],kind:StageMission['kind'],base='cheng-xin'):StageMission {
 const source=getMission(base);
 const conversation=stageConversation(id);
 return {...source,id,stageNumber,clinic,english:'STAGE '+String(stageNumber).padStart(2,'0'),kind,
  title:clinic,brief:kind==='training'?'選擇本關主題，與教室角色交流後，完成10題全對的考驗。':'拜訪'+name+'，介紹本關指定類別；每項產品10題全對即合格。',
  required:['reception','waiting'],allowedCategories:categories,target:'doctor',
  doctor:{...source.doctor,name,specialty,initial:name[0],stethoscope:kind==='clinic',
   coat:kind==='training'?0x2877ce:source.doctor.coat,
   greeting:conversation?.greeting??source.doctor.greeting,
   invitation:conversation?.invitation??source.doctor.invitation}};
}
export const sevenStages:StageMission[]=[
 make('new-training',1,'新訓中心','外勤主管','新人訓練',['新人必修'],'training'),
 make('product-names',2,'認識產品','產品教官','商品名測驗',['商品名測驗'],'training','qing-chuan'),
 make('ent',3,'耳鼻喉科診所','林醫師','耳鼻喉科',['呼吸系統'],'clinic','qing-chuan'),
 make('pharmacy-client',4,'生達大藥局','謝藥師','自費品項',['自費'],'pharmacy'),
 make('gastro',5,'胃腸科診所','王醫師','胃腸科',['胃腸藥'],'clinic','xiang-yang'),
 make('orthopedics',6,'骨科診所','李醫師','骨科',['肌肉骨骼'],'clinic','qing-chuan'),
 make('family',7,'家醫科診所','陳醫師','家庭醫學科',['糖尿病','高血壓','高血脂','泌尿科','痛風'],'clinic'),
];
export const defaultStage=sevenStages[0];
export function getStage(id:string){return sevenStages.find(s=>s.id===id)??defaultStage;}
export function challengeLabel(m:VisitMission){return m.kind==='training'?(m.stageNumber===1?'開始新人必修考驗':'開始商品名測驗'):m.kind==='pharmacy'?'接受藥師挑戰':'接受醫師挑戰';}
