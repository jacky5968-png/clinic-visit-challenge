import {useEffect,useRef,useState,forwardRef,useImperativeHandle} from 'react';
import {ArrowDown,CheckCircle2,LockKeyhole,Map,Rows3,RotateCcw,RotateCw,House,Plus,Minus,Compass,Flag} from 'lucide-react';
import type {CSSProperties} from 'react';
import {sevenStages,getStage,type StageId} from '../data/sevenStages';
import {islandThemes} from '../data/islandStages';
import {stageUnlocked,type StageQualifications} from '../engine/stageProgress';
import {stageUnlockPreview} from '../engine/stagePreview';
import {QUESTION_COUNT,PRODUCTS_TO_PASS_STAGE} from '../config/challenge';
import type {createIslandRenderer} from '../three/createIslandRenderer';
import '../styles/islands.css';
type Controller=ReturnType<typeof createIslandRenderer>;
export interface IslandDepartureHandle {depart:(onArrival:()=>void)=>void;}
interface MissionSelectorProps {
 previewId:StageId|null;onPreview:(id:StageId|null)=>void;
 selectedId:StageId;onSelect:(id:StageId)=>void;completed:StageId[];storageAvailable:boolean;onTravelChange?:(busy:boolean)=>void;
 qualifications:StageQualifications;legacyProgressAvailable:boolean;
}
export const MissionSelector=forwardRef<IslandDepartureHandle,MissionSelectorProps>(function MissionSelector({selectedId,onSelect,completed,qualifications,legacyProgressAvailable,storageAvailable,onTravelChange,previewId,onPreview},ref){
 const [travelling,setTravelling]=useState<StageId|null>(null);
 const requestToken=useRef(0),selectByMap=useRef<(id:StageId)=>void>(()=>{});
 const [mode,setMode]=useState<'map'|'list'>('map'),[status,setStatus]=useState<'loading'|'ready'|'fallback'>('loading'),[notice,setNotice]=useState('');
 const host=useRef<HTMLDivElement>(null),controller=useRef<Controller|null>(null);
 const viewedId=previewId??selectedId;
 const latest=useRef({selectedId,viewedId,previewId,onSelect,completed,onTravelChange});latest.current={selectedId,viewedId,previewId,onSelect,completed,onTravelChange};
 const stage=getStage(viewedId),theme=islandThemes[stage.id],done=completed.includes(stage.id);
 const unlock=stageUnlockPreview(stage.id,completed,qualifications);
 useEffect(()=>{
  let cancelled=false;
  import('../three/createIslandRenderer').then(({createIslandRenderer})=>{
   if(cancelled||!host.current)return;
   try{
    const value=latest.current;
    controller.current=createIslandRenderer(host.current,{selected:value.viewedId,completed:value.completed},id=>selectByMap.current(id),setNotice);
    if(cancelled){controller.current.dispose();return;}setStatus('ready');
   }catch{setStatus('fallback');setMode('list');}
  }).catch(()=>{if(!cancelled){setStatus('fallback');setMode('list');}});
  return()=>{cancelled=true;requestToken.current++;controller.current?.dispose();controller.current=null;};
 },[]);
 useEffect(()=>{controller.current?.update({selected:viewedId,completed});setNotice('');},[viewedId,completed]);
 useEffect(()=>{if(mode==='list')controller.current?.pause();else controller.current?.resume();},[mode]);
 function goToBanks(){if(latest.current.previewId)return;host.current?.closest('.content-screen')?.querySelector('.product-layout')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
 function beginJourney(id:StageId,afterArrival?:()=>void){
  if(travelling||!stageUnlocked(id,latest.current.completed))return;
  if(id!==latest.current.selectedId)latest.current.onSelect(id);
  setNotice('');
  if(!controller.current){setNotice('3D地圖尚未就緒，請先使用本關題庫。');if(afterArrival)afterArrival();else requestAnimationFrame(goToBanks);return;}
  setMode('map');setTravelling(id);latest.current.onTravelChange?.(true);
  const token=++requestToken.current;
  const clear=()=>{if(token!==requestToken.current)return;setTravelling(null);latest.current.onTravelChange?.(false);};
  const accepted=controller.current.walk(id,()=>{
   if(token!==requestToken.current)return;clear();setNotice('外勤已抵達'+getStage(id).clinic+'，請選擇本關題庫。');
   if(afterArrival)afterArrival();else requestAnimationFrame(goToBanks);
  },clear);
  if(!accepted){clear();return;}
  host.current?.scrollIntoView({behavior:'instant',block:'center'});
 }
 function chooseIsland(id:StageId){
  if(travelling)return;
  if(stageUnlocked(id,latest.current.completed)){onPreview(null);beginJourney(id);return;}
  onPreview(id);setNotice('');
  requestAnimationFrame(()=>{
   const card=host.current?.parentElement?.querySelector<HTMLElement>('.island-itinerary');
   card?.querySelector<HTMLElement>('h3')?.focus({preventScroll:true});
   if(matchMedia('(max-width:999px)').matches)card?.scrollIntoView({behavior:'instant',block:'nearest'});
  });
 }
 selectByMap.current=chooseIsland;
 useImperativeHandle(ref,()=>({depart:callback=>{if(!latest.current.previewId)beginJourney(latest.current.selectedId,callback);}}));
 function cancelTravel(){
  requestToken.current++;controller.current?.cancel();setTravelling(null);latest.current.onTravelChange?.(false);setNotice('已取消前往，外勤返回出發島。');
 }
 return <section className="mission-selector island-selector" aria-label="七關任務選擇">
  <div className="mission-selector-heading island-heading"><div><span className="eyebrow">FIELD TRAINING / SEVEN ISLANDS</span>
   <h2>營一外勤養成</h2><p>每項{QUESTION_COUNT}題全對合格，累積{PRODUCTS_TO_PASS_STAGE}項不同產品／主題，解鎖下一關。</p></div>
   <div className="mission-progress-count" role="status" data-testid="mission-progress-count"><b>{completed.length}<small> / 7</small></b><span>已通關島嶼</span></div>
  </div>
  <div className="island-toolbar" aria-label="島嶼地圖工具">
   <div className="island-view-tabs">
    <button type="button" aria-pressed={mode==='map'} disabled={status==='fallback'||!!travelling} onClick={()=>setMode('map')}><Map size={18}/>3D島嶼</button>
    <button type="button" aria-pressed={mode==='list'} disabled={!!travelling} onClick={()=>setMode('list')}><Rows3 size={18}/>關卡清單</button>
   </div>
   <div className="island-camera-tools" hidden={mode!=='map'}>
    <button type="button" aria-label="島嶼全景" disabled={!!travelling} onClick={()=>controller.current?.home()}><House size={18}/><span>全景</span></button>
    <button type="button" aria-label="島嶼向左旋轉" disabled={!!travelling} onClick={()=>controller.current?.rotate(-.14)}><RotateCcw size={18}/></button>
    <button type="button" aria-label="島嶼向右旋轉" disabled={!!travelling} onClick={()=>controller.current?.rotate(.14)}><RotateCw size={18}/></button>
    <button type="button" aria-label="放大島嶼地圖" disabled={!!travelling} onClick={()=>controller.current?.zoom(.1)}><Plus size={18}/></button>
    <button type="button" aria-label="縮小島嶼地圖" disabled={!!travelling} onClick={()=>controller.current?.zoom(-.1)}><Minus size={18}/></button>
   </div>
  </div>
  {travelling&&<div className="island-travel-bar" data-testid="island-travel-status" role="status"><span>外勤正前往第{getStage(travelling).stageNumber}關：{getStage(travelling).clinic}</span><div><button type="button" onClick={()=>controller.current?.skip()}>略過移動</button><button type="button" onClick={cancelTravel}>取消前往</button></div></div>}
  <div className={'archipelago '+(mode==='list'?'list-view':'map-view')} data-testid="seven-islands">
   <div className="archipelago-viewport" ref={host}>
    {status==='loading'&&mode==='map'&&<div className="island-map-loading" role="status"><Compass size={28}/><b>正在展開七島地圖…</b><span>也可使用關卡清單選擇。</span></div>}
    <div className="island-stage-labels" role="group" aria-label="七個關卡">
     {sevenStages.map(s=>{const unlocked=stageUnlocked(s.id,completed),passed=completed.includes(s.id),selected=s.id===viewedId;
      return <button key={s.id} type="button" data-testid={'stage-'+s.id} disabled={!!travelling}
       className={'island-stage-button '+(selected?'selected ':'')+(passed?'passed ':'')+(!unlocked?'locked':'')}
       style={{'--island-color':'#'+islandThemes[s.id].color.toString(16).padStart(6,'0')} as CSSProperties}
       aria-label={(unlocked?'選擇':'預覽')+'第'+s.stageNumber+'關・'+s.clinic} aria-pressed={selected} onClick={()=>chooseIsland(s.id)}>
       <span className="island-button-title"><i>{String(s.stageNumber).padStart(2,'0')}</i><strong>{s.clinic}</strong></span>
       <span className="island-button-status">{passed?<><CheckCircle2 size={14}/><span>已通關・{PRODUCTS_TO_PASS_STAGE}/{PRODUCTS_TO_PASS_STAGE}</span></>:unlocked?<><Flag size={14}/>合格 {qualifications[s.id].length}/{PRODUCTS_TO_PASS_STAGE}</>:<><LockKeyhole size={14}/>先完成第{s.stageNumber-1}關</>}</span>
       <span className="island-list-details">{s.doctor.name} · {s.allowedCategories.join('、')}</span>
      </button>;
     })}
    </div>
    <span className="island-actor-label" data-testid="island-actor-label" aria-hidden="true">外勤</span>
    {mode==='map'&&<span className="island-landmark-label">生達製劑大樓</span>}
    {mode==='map'&&<div className="island-map-caption" aria-label="拖曳旋轉，點島名選關"><Compass size={15}/><span className="island-hint-long">拖曳旋轉 · 點島名選關</span><span className="island-hint-short">拖曳旋轉</span></div>}
   </div>
   <aside className={'island-itinerary'+(!unlock.unlocked?' is-preview':'')} aria-label="所選島嶼資訊">
    <div className="island-itinerary-heading"><p className="island-kicker">第 {stage.stageNumber} 關</p><span className="island-destination-state">{!unlock.unlocked?<><LockKeyhole size={16}/>待解鎖・預覽</>:done?<><CheckCircle2 size={16}/>已通關</>:<><Flag size={16}/>目前開放</>}</span></div>
    <h3 tabIndex={-1}>{stage.clinic}</h3>
    <button type="button" className="button primary full" disabled={!!travelling||!unlock.unlocked} onClick={goToBanks}>{unlock.unlocked?<>選擇本關題庫<ArrowDown size={18}/></>:<><LockKeyhole size={18}/>尚未解鎖，無法挑戰</>}</button>
    <dl><div><dt>{stage.kind==='training'?'訓練對象':'拜訪對象'}</dt><dd>{stage.doctor.name}</dd></div><div className="island-category-field"><dt>限定題庫</dt><dd>{stage.allowedCategories.join('、')}</dd></div><div><dt>合格條件</dt><dd>每項{QUESTION_COUNT}題全對</dd></div><div><dt>{unlock.unlocked?'通關進度':'解鎖還差'}</dt><dd data-testid="island-qualified-count">{unlock.unlocked?<>{qualifications[stage.id].length}／{PRODUCTS_TO_PASS_STAGE}項（不重複）</>:<>{unlock.remaining}項合格</>}</dd></div></dl>
    {!unlock.unlocked&&<div className="island-unlock-preview" data-testid="island-unlock-preview"><p>{stage.stageNumber===2?'須先通過第1關。':`須先依序通過第1～${stage.stageNumber-1}關。`}</p><button type="button" className="island-return-current" onClick={()=>onPreview(null)}>返回第{getStage(selectedId).stageNumber}關</button></div>}
    <details className="island-itinerary-more"><summary>{unlock.unlocked?'場景與拜訪說明':'解鎖明細與場景說明'}</summary>
     {!unlock.unlocked&&<ul className="island-unlock-requirements">{unlock.requirements.map(item=><li key={item.stage.id}>第{item.stage.stageNumber}關 {item.stage.clinic}：還差{item.remaining}項合格</li>)}</ul>}
     <p className="island-feature">{theme.label} · {theme.feature}</p>
     <p className="island-route-note">點選已開放島嶼，外勤沿木橋抵達後，選好題庫即可進入島上的{stage.kind==='training'?'教室':stage.kind==='pharmacy'?'藥局':'診所'}，接續原本的場景交流與挑戰。</p>
     <p className="island-route-note">每關至少{PRODUCTS_TO_PASS_STAGE}項不同產品／主題合格，才能通關；重複合格不重複計算。</p>
     <div className="island-legend"><span><i className="legend-open"/>已開放</span><span><i className="legend-done"/>已通關</span><span><LockKeyhole size={13}/>待解鎖</span></div>
    </details>
   </aside>
  </div>
  {(status==='fallback'||notice)&&<p className="mission-storage-note" role="status">{notice||'此裝置無法顯示3D島嶼，已切換關卡清單；題庫與挑戰照常使用。'}</p>}
  {legacyProgressAvailable&&<p className="mission-storage-note" role="status">規則已更新：舊版5題通關紀錄仍保留，但不列入新版{QUESTION_COUNT}題合格進度。請重新完成每關至少{PRODUCTS_TO_PASS_STAGE}項考驗。</p>}
  {!storageAvailable&&<p className="mission-storage-note" role="status">此瀏覽器無法儲存，仍可完成本次七關；關閉後進度不保留。</p>}
 </section>;
});
