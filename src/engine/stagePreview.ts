import {sevenStages,type StageId} from '../data/sevenStages';
import {PRODUCTS_TO_PASS_STAGE} from '../config/challenge';
import {stageUnlocked,type StageQualifications} from './stageProgress';

// Preview counts only prerequisites; it never changes qualification or unlock records.
export function stageUnlockPreview(id:StageId,completed:StageId[],qualifications:StageQualifications){
 const index=sevenStages.findIndex(stage=>stage.id===id);
 const requirements=sevenStages.slice(0,index).filter(stage=>!completed.includes(stage.id)).map(stage=>({
  stage,remaining:Math.max(0,PRODUCTS_TO_PASS_STAGE-qualifications[stage.id].length),
 }));
 return {unlocked:stageUnlocked(id,completed),requirements,
  remaining:requirements.reduce((total,item)=>total+item.remaining,0)};
}
