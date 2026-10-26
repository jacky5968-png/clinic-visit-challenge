import {useEffect,useRef,useState,forwardRef,useImperativeHandle} from 'react';
import {CheckCircle2,Map,Rows3,RotateCcw,RotateCw,House,Plus,Minus,Compass,Flag} from 'lucide-react';
import type {CSSProperties} from 'react';
import {sevenStages,getStage,type StageId} from '../data/sevenStages';
import {islandThemes} from '../data/islandStages';
import type {StageQualifications} from '../engine/stageProgress';
import type {createIslandRenderer} from '../three/createIslandRenderer';
import '../styles/islands.css';
import {FormulationViewer} from './FormulationViewer';
import {StageBrief} from './StageBrief';
type Controller=ReturnType<typeof createIslandRenderer>;
export interface IslandDepartureHandle {depart:(onArrival:()=>void)=>void;}
interface Props {
 selectedId:StageId;onSelect:(id:StageId)=>void;onBrowse:(id:StageId)=>void;completed:StageId[];storageAvailable:boolean;onTravelChange?:(busy:boolean)=>void;
 qualifications:StageQualifications;legacyProgressAvailable:boolean;
}
export const MissionSelector=forwardRef<IslandDepartureHandle,Props>(function MissionSelector({selectedId,onSelect,onBrowse,completed,qualifications,legacyProgressAvailable,storageAvailable,onTravelChange},ref){
 const [travelling,setTravelling]=useState<StageId|null>(null),[briefId,setBriefId]=useState<StageId|null>(null),[landmarkOpen,setLandmarkOpen]=useState(false);
 const landmarkButton=useRef<HTMLButtonElement>(null),trigger=useRef<HTMLElement|null>(null);
 const requestToken=useRef(0),selectByMap=useRef<(id:StageId)=>void>(()=>{});
 const [mode,setMode]=useState<'map'|'list'>('map'),[status,setStatus]=useState<'loading'|'ready'|'fallback'>('loading'),[notice,setNotice]=useState('');
 const host=useRef<HTMLDivElement>(null),controller=useRef<Controller|null>(null);
 const viewedId=briefId??selectedId;
 const latest=useRef({selectedId,viewedId,onSelect,completed,onTravelChange});latest.current={selectedId,viewedId,onSelect,completed,onTravelChange};
 useEffect(()=>{
  let cancelled=false;
  import('../three/createIslandRenderer').then(({createIslandRenderer})=>{
   if(cancelled||!host.current)return;
   try{const value=latest.current;controller.current=createIslandRenderer(host.current,{selected:value.viewedId,completed:value.completed},id=>selectByMap.current(id),setNotice,()=>setLandmarkOpen(true));if(cancelled){controller.current.dispose();return;}setStatus('ready');}
   catch{setStatus('fallback');setMode('list');}
  }).catch(()=>{if(!cancelled){setStatus('fallback');setMode('list');}});
  return()=>{cancelled=true;requestToken.current++;controller.current?.dispose();controller.current=null;};
 },[]);
 useEffect(()=>{controller.current?.update({selected:viewedId,completed});setNotice('');},[viewedId,completed]);
 useEffect(()=>{if(mode==='list'||landmarkOpen||briefId)controller.current?.pause();else controller.current?.resume();},[mode,landmarkOpen,briefId,status]);
 function closeLandmark(){setLandmarkOpen(false);setMode('map');controller.current?.home();requestAnimationFrame(()=>{landmarkButton.current?.focus({preventScroll:true});host.current?.scrollIntoView({behavior:'instant',block:'start'});});}
 function beginJourney(id:StageId,afterArrival:()=>void){
  if(travelling)return;
  if(id!==latest.current.selectedId)latest.current.onSelect(id);setNotice('');
  if(!controller.current){afterArrival();return;}
  setMode('map');setTravelling(id);latest.current.onTravelChange?.(true);
  const token=++requestToken.current;
  const clear=()=>{if(token!==requestToken.current)return;setTravelling(null);latest.current.onTravelChange?.(false);};
  const accepted=controller.current.walk(id,()=>{if(token!==requestToken.current)return;clear();afterArrival();},clear);
  if(!accepted){clear();return;}host.current?.scrollIntoView({behavior:'instant',block:'center'});
 }
 function chooseIsland(id:StageId){if(travelling)return;trigger.current=host.current?.querySelector<HTMLElement>('[data-testid="stage-'+id+'"]')??null;setBriefId(id);setNotice('');}
 function closeBrief(){setBriefId(null);requestAnimationFrame(()=>trigger.current?.focus({preventScroll:true}));}
 selectByMap.current=chooseIsland;
 useImperativeHandle(ref,()=>({depart:callback=>beginJourney(latest.current.selectedId,callback)}));
 function cancelTravel(){requestToken.current++;controller.current?.cancel();setTravelling(null);latest.current.onTravelChange?.(false);setNotice('已取消前往，可重新選擇島嶼。');}
 return <section className="mission-selector island-selector" aria-label="七關任務選擇">
  <div className="mission-selector-heading island-heading"><div><span className="eyebrow">CHOOSE YOUR ADVENTURE</span><h2>七座島嶼，自由出發</h2><p>點島嶼查看任務說明，再選擇本關題庫。每項10題，全對即合格。</p></div><div className="world-access-badge"><Compass size={22}/><span><b>7 座島嶼</b><small>全數開放</small></span></div></div>
  <div className="island-toolbar" aria-label="島嶼地圖工具"><div className="island-view-tabs"><button type="button" aria-pressed={mode==='map'} disabled={status==='fallback'||!!travelling} onClick={()=>setMode('map')}><Map size={18}/>3D島嶼</button><button type="button" aria-pressed={mode==='list'} disabled={!!travelling} onClick={()=>setMode('list')}><Rows3 size={18}/>關卡清單</button></div><div className="island-camera-tools" hidden={mode!=='map'}><button type="button" aria-label="島嶼全景" disabled={!!travelling} onClick={()=>controller.current?.home()}><House size={18}/><span>全景</span></button><button type="button" aria-label="島嶼向左旋轉" disabled={!!travelling} onClick={()=>controller.current?.rotate(-.14)}><RotateCcw size={18}/></button><button type="button" aria-label="島嶼向右旋轉" disabled={!!travelling} onClick={()=>controller.current?.rotate(.14)}><RotateCw size={18}/></button><button type="button" aria-label="放大島嶼地圖" disabled={!!travelling} onClick={()=>controller.current?.zoom(.1)}><Plus size={18}/></button><button type="button" aria-label="縮小島嶼地圖" disabled={!!travelling} onClick={()=>controller.current?.zoom(-.1)}><Minus size={18}/></button></div></div>
  {travelling&&<div className="island-travel-bar" data-testid="island-travel-status" role="status"><span>外勤正前往第{getStage(travelling).stageNumber}關：{getStage(travelling).clinic}</span><div><button type="button" onClick={()=>controller.current?.skip()}>略過移動</button><button type="button" onClick={cancelTravel}>取消前往</button></div></div>}
  <div className={'archipelago full-world '+(mode==='list'?'list-view':'map-view')} data-testid="seven-islands"><div className="archipelago-viewport" ref={host}>
   {status==='loading'&&mode==='map'&&<div className="island-map-loading" role="status"><Compass size={28}/><b>正在展開七島地圖…</b><span>也可使用關卡清單選擇。</span></div>}
   <div className="island-stage-labels" role="group" aria-label="七個關卡">{sevenStages.map(s=>{const count=qualifications[s.id].length;return <button key={s.id} type="button" data-testid={'stage-'+s.id} disabled={!!travelling} className={'island-stage-button '+(s.id===viewedId?'selected ':'')+(count?'passed':'')} style={{'--island-color':'#'+islandThemes[s.id].color.toString(16).padStart(6,'0')} as CSSProperties} aria-label={'選擇第'+s.stageNumber+'關・'+s.clinic} aria-pressed={s.id===viewedId} onClick={()=>chooseIsland(s.id)}><span className="island-button-title"><i>{String(s.stageNumber).padStart(2,'0')}</i><strong>{s.clinic}</strong></span><span className="island-button-status">{count?<><CheckCircle2 size={14}/>已合格 {count} 項</>:<><Flag size={14}/>自由挑戰</>}</span><span className="island-list-details">{s.doctor.name} · {s.allowedCategories.join('、')}</span></button>;})}</div>
   <span className="island-actor-label" data-testid="island-actor-label" aria-hidden="true">外勤</span>
   {mode==='map'&&<button ref={landmarkButton} type="button" className="island-landmark-label" aria-label="放大查看生達製劑大樓" title="點選放大查看" aria-haspopup="dialog" aria-expanded={landmarkOpen} disabled={status!=='ready'||!!travelling} onClick={()=>setLandmarkOpen(true)}>生達製劑大樓</button>}
   {mode==='map'&&<div className="island-map-caption" aria-label="拖曳旋轉，點島嶼查看任務"><Compass size={15}/><span className="island-hint-long">拖曳旋轉 · 點島嶼查看任務</span><span className="island-hint-short">拖曳旋轉</span></div>}
  </div></div>
  {(status==='fallback'||notice)&&<p className="mission-storage-note" role="status">{notice||'此裝置無法顯示3D島嶼，已切換關卡清單；題庫與挑戰照常使用。'}</p>}
  {legacyProgressAvailable&&<p className="mission-storage-note">舊版紀錄已保留；本版合格以每項10題全對記錄。</p>}
  {!storageAvailable&&<p className="mission-storage-note" role="status">此瀏覽器無法儲存，仍可完成本次挑戰；關閉後進度不保留。</p>}
  {briefId&&<StageBrief id={briefId} qualified={qualifications[briefId].length} onClose={closeBrief} onChoose={()=>{const id=briefId;setBriefId(null);onBrowse(id);}}/>}
  {landmarkOpen&&<FormulationViewer onClose={closeLandmark}/>}
 </section>;
});
