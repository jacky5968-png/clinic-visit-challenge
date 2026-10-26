import {useState} from 'react';
import {MapPin,Target,ChevronRight,Info,FileSpreadsheet} from 'lucide-react';
import type {Product} from '../types';
import type {SceneConsultation} from '../components/DoctorSceneDialogue';
import {ClinicMap} from '../components/ClinicMap';
import {AssetImage} from '../components/AssetImage';
import {initialClinicProgress,type ClinicProgress} from '../engine/clinic';
import {useVisitMission} from '../context/VisitContext';
import {mainTarget,sceneLocations} from '../data/sceneLocations';
import {VisitSequenceProvider,useVisitSequence} from '../context/VisitSequenceContext';
type Props={product:Product;onEnter:()=>void;consultation?:SceneConsultation};
export function Clinic(props:Props){
 const mission=useVisitMission();
 return <VisitSequenceProvider key={mission.id+':'+props.product.id}><ClinicSession {...props}/></VisitSequenceProvider>;
}
function ClinicSession({product,onEnter,consultation}:Props){
 const mission=useVisitMission(),target=mainTarget(mission),locations=sceneLocations(mission);
 const [progress,setProgress]=useState<ClinicProgress>(initialClinicProgress),[blocked,setBlocked]=useState(false);
 const sequence=useVisitSequence(),at=progress.freeRoam?progress.nearby===target:progress.location===target;
 function enter(){if(!sequence.canInteract(target)){setBlocked(true);return;}onEnter();}
 return <section className="content-screen">
  <div className="section-heading compact"><span className="eyebrow">STAGE {mission.stageNumber??''} / FIELD TRAINING</span>
   <h1>{consultation?'與'+mission.doctor.name+'交流。':'歡迎來到，'+mission.clinic+'。'}</h1>
   <p>{consultation?'完成三段交流後接受本關10題考驗。':'先完成01、02櫃台對話，再到03與'+mission.doctor.name+'交流。抵達已開放定位點即自動對話。'}</p>
  </div>
  <div className="visit-layout">
   <aside className="mission-panel">
    <div className="active-visit-profile" style={{borderColor:mission.theme.accent}}><span>第{mission.stageNumber}關 · {mission.title}</span><b>{mission.doctor.name} · {mission.doctor.specialty}</b><small>{mission.clinic} · 虛構訓練情境</small></div>
    <div className="mission-label"><Target size={19}/>目前任務<span>{locations[sequence.next].marker}</span></div>
    <h2>{consultation?'與'+mission.doctor.name+'交流。':progress.moving?'正在前往'+locations[progress.destination!].name:'下一站：'+locations[sequence.next].marker+' '+locations[sequence.next].name}</h2>
    <p>{mission.brief}</p>
    {blocked&&!sequence.canInteract(target)&&<p role="alert">請先完成01、02櫃台對話。</p>}
    <div className="mission-product">{mission.kind==='training'?<FileSpreadsheet size={38}/>:<AssetImage src={product.image} alt={product.name}/>}<div><small>本關選定題庫</small><b>{product.name}</b>{product.imageCaption&&<small className="photo-caption">{product.imageCaption}</small>}</div></div>
    <ol className="mission-checklist"><li className="done"><span>✓</span>選擇本關題庫</li>{(['reception','waiting'] as const).map(id=><li key={id} className={sequence.status(id)==='complete'?'done':sequence.next===id?'active':''}><span>{sequence.status(id)==='complete'?'✓':locations[id].marker}</span>與{locations[id].speaker}完成對話{sequence.next===id&&<ChevronRight size={14}/>}</li>)}<li className={consultation?'active':at&&sequence.canInteract(target)?'done':''}><span>03</span>與{mission.doctor.name}交流及考核</li><li><span>10</span>10題全對合格，累積5項通關</li></ol>
    <div className="mission-tip"><Info size={17}/><span>{consultation?'可旋轉縮放觀察場景，或按 × 返回探索。':'藍色圓圈是下一站，綠色表示已完成；灰色鎖頭需先完成前站。回應後按「完成對話」，外勤會自動沿動線走到下一站，抵達即開啟對話。'}</span></div>
   </aside>
   <div className="map-panel"><div className="panel-title"><span><MapPin size={16}/>{mission.clinic}</span><small>3D探索與互動</small></div><ClinicMap interactive onEnter={enter} onProgress={setProgress} consultation={consultation}/></div>
  </div>
 </section>;
}
