import {locations,type LocationId} from '../engine/clinic';
import type {VisitMission} from './visitMissions';
import {stageStaffConversation} from './stageConversations';
export function mainTarget(m:VisitMission):LocationId{return m.target??'doctor';}
export function sceneLocations(m:VisitMission){
 const target=mainTarget(m);
 return Object.fromEntries(Object.entries(locations).map(([key,value])=>{
  const id=key as LocationId;
  let name=value.name;
  if(m.kind==='training')name=id==='doctor'?(m.stageNumber===1?'新訓考場':'產品教學區'):id==='reception'?(m.id==='new-training'?'營一部':'服務台'):id==='waiting'?'報到櫃台':'中心入口';
  if(m.kind==='pharmacy')name=id==='doctor'?'產品諮詢區':id==='reception'?'藥局櫃台':id==='waiting'?'服務櫃台':'藥局入口';
  const staff=stageStaffConversation(m,id);
  const speaker=id===target?m.doctor.name:staff?.name??(id==='waiting'?'掛號人員':id==='reception'?'藥師':id==='doctor'?'產品諮詢資料':'拜訪準備');
  const message=id===target?'已抵達'+m.clinic+'，可與'+m.doctor.name+'交流，再接入10題考驗。':id==='entrance'?m.brief:staff?.reminder??(m.kind==='pharmacy'&&id==='doctor'?'這裡可整理自費品項的介紹資料；謝藥師在藥局櫃台等候與您交流。':'您好，歡迎來到'+m.clinic+'，準備好後可前往與'+m.doctor.name+'交流。');
  return [id,{...value,name,speaker,message}];
 })) as typeof locations;
}
export function targetAction(m:VisitMission){return m.kind==='training'?'與'+m.doctor.name+'交流':m.kind==='pharmacy'?'與謝藥師交流':'進入診間';}
