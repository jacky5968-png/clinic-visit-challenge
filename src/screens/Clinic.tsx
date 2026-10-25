import {useState} from 'react';
import {MapPin,Target,ChevronRight,Info,FileSpreadsheet} from 'lucide-react';
import type {Product} from '../types';
import type {SceneConsultation} from '../components/DoctorSceneDialogue';
import {ClinicMap} from '../components/ClinicMap';
import {AssetImage} from '../components/AssetImage';
import {initialClinicProgress,type ClinicProgress} from '../engine/clinic';
import {useVisitMission} from '../context/VisitContext';
import {mainTarget,sceneLocations} from '../data/sceneLocations';
import {missingRequirements} from '../data/visitMissions';
export function Clinic({product,onEnter,consultation}:{product:Product;onEnter:()=>void;consultation?:SceneConsultation}){
 const mission=useVisitMission(),target=mainTarget(mission),locations=sceneLocations(mission);
 const [progress,setProgress]=useState<ClinicProgress>(initialClinicProgress),[blocked,setBlocked]=useState(false);
 const missing=missingRequirements(mission,progress.visited),at=progress.freeRoam?progress.nearby===target:progress.location===target;
 function enter(){if(missing.length){setBlocked(true);return;}onEnter();}
 return <section className="content-screen">
  <div className="section-heading compact"><span className="eyebrow">STAGE {mission.stageNumber??''} / FIELD TRAINING</span>
   <h1>{consultation?'與'+mission.doctor.name+'交流。':'歡迎來到，'+mission.clinic+'。'}</h1>
   <p>{consultation?'完成三段交流後接受本關10題考驗。':'方向鍵自由行走，抵達'+mission.doctor.name+'的定位點即自動對話，也可點選地點前往。'}</p>
  </div>
  <div className="visit-layout">
   <aside className="mission-panel">
    <div className="active-visit-profile" style={{borderColor:mission.theme.accent}}><span>第{mission.stageNumber}關 · {mission.title}</span><b>{mission.doctor.name} · {mission.doctor.specialty}</b><small>{mission.clinic} · 虛構訓練情境</small></div>
    <div className="mission-label"><Target size={19}/>目前任務<span>{consultation?'02':'01'}</span></div>
    <h2>{consultation?'與'+mission.doctor.name+'交流。':progress.moving?'正在前往'+locations[progress.destination!].name:at?'準備就緒，與'+mission.doctor.name+'交流。':'前往'+locations[target].name+'，完成本關考驗。'}</h2>
    <p>{mission.brief}</p>
    {blocked&&missing.length>0&&<p role="alert">請先完成拜訪準備。</p>}
    <div className="mission-product">{mission.kind==='training'?<FileSpreadsheet size={38}/>:<AssetImage src={product.image} alt={product.name}/>}<div><small>本關選定題庫</small><b>{product.name}</b>{product.imageCaption&&<small className="photo-caption">{product.imageCaption}</small>}</div></div>
    <ol className="mission-checklist"><li className="done"><span>✓</span>選擇本關題庫</li><li className={at?'done':'active'}><span>{at?'✓':'2'}</span>前往{locations[target].name}<ChevronRight size={14}/></li><li className={consultation?'active':''}><span>3</span>與{mission.doctor.name}交流</li><li><span>4</span>10題全對合格，累積5項通關</li></ol>
    <div className="mission-tip"><Info size={17}/><span>{consultation?'可旋轉縮放觀察場景，或按 × 返回探索。':'方向鍵／WASD行走，抵達定位點自動對話；也可點選「'+locations[target].name+'」自動前往。關閉對話後，可按 E 再聊。'}</span></div>
   </aside>
   <div className="map-panel"><div className="panel-title"><span><MapPin size={16}/>{mission.clinic}</span><small>3D探索與互動</small></div><ClinicMap interactive onEnter={enter} onProgress={setProgress} consultation={consultation}/></div>
  </div>
 </section>;
}
