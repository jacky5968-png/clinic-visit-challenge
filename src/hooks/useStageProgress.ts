import {useCallback,useEffect,useState} from 'react';
import {STAGE_STORAGE_KEY,LEGACY_STAGE_STORAGE_KEY,STAGE_PROGRESS_VERSION,parseStageProgress,hasLegacyStageProgress,recordStageCompletion,type StageCompletion} from '../engine/stageProgress';
export function useStageProgress(){
 const [progress,setProgress]=useState(()=>{try{return parseStageProgress(localStorage.getItem(STAGE_STORAGE_KEY));}catch{return [];}});
 const [storageAvailable,setAvailable]=useState(true);
 const [legacyProgressAvailable]=useState(()=>{try{return hasLegacyStageProgress(localStorage.getItem(LEGACY_STAGE_STORAGE_KEY));}catch{return false;}});
 useEffect(()=>{try{localStorage.setItem(STAGE_STORAGE_KEY,JSON.stringify({version:STAGE_PROGRESS_VERSION,completed:progress}));setAvailable(true);}catch{setAvailable(false);}},[progress]);
 const complete=useCallback((record:StageCompletion)=>setProgress(list=>recordStageCompletion(list,record)),[]);
 return {progress,complete,storageAvailable,legacyProgressAvailable};
}
