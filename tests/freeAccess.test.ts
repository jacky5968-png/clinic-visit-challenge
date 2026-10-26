import {expect,it} from 'vitest';
import {sevenStages} from '../src/data/sevenStages';
import {completedStagesFromQualifications,stageUnlocked,type StageQualifications} from '../src/engine/stageProgress';
import {planIslandWalk} from '../src/engine/islandWalk';
import {gameRules} from '../src/data/gameRules';
it('a player may start with the eighth island and keep an independent qualification there',()=>{
 const qualifications=Object.fromEntries(sevenStages.map(stage=>[stage.id,[]])) as unknown as StageQualifications;
 qualifications.family=[{missionId:'family',productKey:'version',productName:'主題',correctCount:10,questionCount:10,completedAt:0}];
 expect(completedStagesFromQualifications(qualifications)).toEqual(['family']);
 expect(sevenStages.every(stage=>stageUnlocked(stage.id,[]))).toBe(true);
});
it('the longest first visit still follows all neighboring bridges',()=>{
 const route=planIslandWalk('new-training','family',[],false)!;
 expect(route.points.filter(point=>point.surface==='bridge').map(point=>point.bridge)).toEqual(sevenStages.slice(0,-1).map((stage,index)=>[stage.id,sevenStages[index+1].id]));
});
it('the current manual describes an explicit briefing-to-bank step and retains the original assessment',()=>{
 expect(gameRules).toHaveLength(6);
 const text=gameRules.map(rule=>rule.text).join('');
 expect(text).toContain('選擇本關題庫');expect(text).toContain('全部開放');expect(text).toContain('10題全對');expect(text).toContain('01、02');
 expect(text).not.toMatch(/累積5|至少5項|解鎖下一關|先完成前一關/);
});
