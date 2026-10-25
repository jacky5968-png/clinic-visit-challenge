import {challengeLabel} from '../data/sevenStages';
import { useEffect, useRef, type RefObject } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { Product } from '../types';
import { useVisitMission } from '../context/VisitContext';
import { doctorConversation } from '../data/doctorConversation';

export interface SceneConsultation {
  product: Product;
  onChallenge: () => void;
  onReturn: () => void;
}
export function DoctorSceneDialogue({ consultation, line, onNext, panel, link }: {
  consultation: SceneConsultation; line: number; onNext: () => void;
  panel: RefObject<HTMLElement|null>; link: RefObject<SVGLineElement|null>;
}) {
  const mission=useVisitMission();
  const lines=doctorConversation(mission), current=lines[line];
  const next=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    let settled=0;
    const frame=requestAnimationFrame(()=>{
      settled=requestAnimationFrame(()=>{
        next.current?.focus({preventScroll:true});
        panel.current?.scrollIntoView({block:'nearest',behavior:'instant'});
      });
    });
    return ()=>{cancelAnimationFrame(frame);cancelAnimationFrame(settled);};
  },[line,panel]);
  return <>
    <svg className="scene-speech-link" aria-hidden="true"><line ref={link}/></svg>
    <section ref={panel} className={'scene-speech doctor-scene-speech'+(current.representative?' is-reply':'')}
      data-testid="doctor-scene-speech" data-speaker={current.representative?'representative':'doctor'}
      aria-label="場景交流對話"
      onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();consultation.onReturn();}}}>
      <header><h3>{current.speaker}</h3><span className="doctor-scene-step" aria-label={'第'+(line+1)+'段，共3段對話'}>{line+1} / 3</span>
        <button className="icon-button" onClick={consultation.onReturn} aria-label="返回診所探索"><X size={18}/></button>
      </header>
      <p className="scene-speech-text" aria-live="polite" aria-atomic="true">「{current.text}」</p>
      <p className="scene-speech-product-label">{mission.kind==='training'?'本次主題：':'本次介紹：'}<b>{consultation.product.name}</b></p>
      <button ref={next} className="button primary scene-speech-next"
        onClick={line<lines.length-1?onNext:consultation.onChallenge}>
        {line<lines.length-1?'繼續對話':challengeLabel(mission)}<ArrowRight size={17}/>
      </button>
      <p className="doctor-scene-rule">10 道問題 · 每題 10 分 · 全對才算本項合格</p>
    </section>
  </>;
}
