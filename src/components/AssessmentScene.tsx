import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, CheckCircle2, MessageCircle, ShieldCheck } from 'lucide-react';
import { useVisitMission } from '../context/VisitContext';
import { examinerRole, roleLabel } from '../data/characterRoles';
import { useReducedMotion } from '../hooks/useMotion';
import type { AssessmentState, createAssessmentRenderer } from '../three/createAssessmentRenderer';
import { Character } from './Character';

export function AssessmentScene({question,selected,submitted,correct}:{question:number;selected:number|null;submitted:boolean;correct:boolean}) {
  const mission=useVisitMission(), role=examinerRole(mission), reduced=useReducedMotion();
  const host=useRef<HTMLDivElement>(null),api=useRef<ReturnType<typeof createAssessmentRenderer>|null>(null);
  const state=useRef<AssessmentState>({question,selected,submitted,correct,reduced});
  state.current={question,selected,submitted,correct,reduced};
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
  useEffect(()=>{
    let cancelled=false;
    setReady(false);setFailed(false);
    import('../three/createAssessmentRenderer').then(({createAssessmentRenderer})=>{
      if(cancelled)return;
      try{api.current=createAssessmentRenderer(host.current!,mission,state);setReady(true);}
      catch{if(host.current)host.current.replaceChildren();setFailed(true);}
    }).catch(()=>{if(!cancelled)setFailed(true);});
    return()=>{cancelled=true;api.current?.dispose();api.current=null;};
  },[mission.id]);
  const turn=question%3;
  const prompts=mission.kind==='training'?['先別緊張，請依學過的內容回答這一題。','這一題看的是基本觀念，整理重點後再作答。','把這題當成拜訪前的練習，清楚說明即可。']:mission.kind==='pharmacy'?['請依產品教材，回答這項自費品項的問題。','向門市介紹產品時，這個重點也需要熟悉。','我們用這一題，確認您對本次品項的了解。']:['請依產品教材，向我說明這一題的答案。','今天的'+mission.doctor.specialty+'產品，我們再用這一題確認。','整理好產品重點，再清楚說明您的答案。'];
  const examinerText=submitted?(correct?['回答正確，繼續保持！','這個重點掌握得很好。','準備得很確實，我們繼續。'][turn]:'這題再確認一下，一起看看正確答案。'):prompts[turn];
  const representativeText=submitted?(correct?'了解，我會把學到的重點用在拜訪中。':'我會記下這個重點，回頭再複習。'):selected!==null?'我選擇 '+String.fromCharCode(65+selected)+'，準備確認送出。':question===0?'我準備好了，開始今天的考核。':'我會先確認題目，再整理回答重點。';
  return <aside className="assessment-panel" aria-label="3D考核對話場景" style={{'--assessment-accent':mission.theme.accent} as CSSProperties}>
    <header className="assessment-heading"><div><span className="assessment-eyebrow"><ShieldCheck size={16}/>現場考核</span><h2>{mission.clinic}</h2><p>{mission.doctor.specialty} · 雙人情境交流</p></div><span className={'assessment-status '+(submitted?(correct?'passed':'review'):'')}>{submitted?(correct?'回答正確':'複習重點'):'第 '+(question+1)+' 題'}</span></header>
    <div className="assessment-viewport" data-testid="assessment-scene" data-role={role}>
      <div ref={host} className="assessment-canvas-host"/>
      {!ready&&!failed&&<div className="assessment-loading" role="status">正在準備考核場景…</div>}
      {failed&&<div className="assessment-fallback" data-testid="assessment-fallback"><Character role="representative"/><span>面對面考核</span><Character role="doctor"/></div>}
      <div className="assessment-camera" role="group" aria-label="考核場景視角">
        <button disabled={!ready} onClick={()=>api.current?.rotate(-1)} aria-label="考核場景向左旋轉"><ArrowLeft size={17}/></button>
        <button disabled={!ready} onClick={()=>api.current?.rotate(1)} aria-label="考核場景向右旋轉"><ArrowRight size={17}/></button>
        <button disabled={!ready} onClick={()=>api.current?.reset()} aria-label="重設考核場景"><RotateCcw size={17}/></button>
      </div>
      <span className="assessment-view-hint">{failed?'簡易雙人場景':'拖曳旋轉 · 滾輪／雙指縮放'}</span>
    </div>
    <div className="assessment-people"><div><span className="assessment-person-mark">你</span><p><b>外勤代表</b><small>產品推廣與專業交流</small></p></div><span className="assessment-people-link"><MessageCircle size={20}/></span><div><span className="assessment-person-mark examiner">{mission.doctor.initial}</span><p><b>{mission.doctor.name}</b><small>{roleLabel(role)} · {role==='supervisor'?'西裝與領帶':role==='pharmacist'?'藥師白袍':'白袍與聽診器'}</small></p></div></div>
    <div className="assessment-dialogue" aria-live="polite" aria-atomic="true">
      <div className="assessment-speech examiner"><b>{mission.doctor.name}</b><p>{examinerText}</p></div>
      <div className="assessment-speech representative"><b>外勤代表 · 你</b><p>{representativeText}</p></div>
    </div>
    <div className="assessment-rule"><CheckCircle2 size={17}/><span>本項10題全對即合格 · 八關自由挑戰</span></div>
  </aside>;
}
