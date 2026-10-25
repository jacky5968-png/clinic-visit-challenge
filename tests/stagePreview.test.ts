import {expect,it} from 'vitest';
import {sevenStages,type StageId} from '../src/data/sevenStages';
import {stageUnlockPreview} from '../src/engine/stagePreview';
import type {StageCompletion,StageQualifications} from '../src/engine/stageProgress';

function qualifications(counts:Partial<Record<StageId,number>>={}):StageQualifications{
 return Object.fromEntries(sevenStages.map(stage=>[stage.id,Array.from({length:counts[stage.id]??0},(_,i):StageCompletion=>({missionId:stage.id,productKey:'key-'+i,productName:'topic-'+i,completedAt:0,questionCount:10,correctCount:10}))])) as StageQualifications;
}
it('the first stage has no prerequisites',()=>{
 expect(stageUnlockPreview('new-training',[],qualifications())).toEqual({unlocked:true,requirements:[],remaining:0});
});
it('the next locked stage reports five missing qualifications in the first stage',()=>{
 const result=stageUnlockPreview('product-names',[],qualifications());
 expect(result.unlocked).toBe(false);expect(result.remaining).toBe(5);
 expect(result.requirements.map(r=>[r.stage.id,r.remaining])).toEqual([['new-training',5]]);
});
it('partial qualifications reduce the prerequisite shortfall without counting the previewed stage',()=>{
 const result=stageUnlockPreview('product-names',[],qualifications({'new-training':3,'product-names':4}));
 expect(result.unlocked).toBe(false);expect(result.remaining).toBe(2);
});
it('a distant island totals every prerequisite instead of reporting only the previous stage',()=>{
 const result=stageUnlockPreview('family',[],qualifications());
 expect(result.remaining).toBe(30);expect(result.requirements).toHaveLength(6);
});
it('completed stages are excluded and each unfinished prerequisite keeps its own shortfall',()=>{
 const result=stageUnlockPreview('family',['new-training','product-names'],qualifications({'new-training':6,'product-names':5,ent:2}));
 expect(result.remaining).toBe(18);
 expect(result.requirements.map(r=>[r.stage.id,r.remaining])).toEqual([['ent',3],['pharmacy-client',5],['gastro',5],['orthopedics',5]]);
});
it('preview calculations never grant access or mutate qualification records',()=>{
 const data=qualifications({'new-training':7}),before=JSON.stringify(data);
 const result=stageUnlockPreview('product-names',[],data);
 expect(result.remaining).toBe(0);expect(result.unlocked).toBe(false);
 expect(JSON.stringify(data)).toBe(before);
});
it('an already unlocked stage keeps the original access decision',()=>{
 const result=stageUnlockPreview('product-names',['new-training'],qualifications({'new-training':5}));
 expect(result).toEqual({unlocked:true,requirements:[],remaining:0});
});
