import { useEffect, useRef, type RefObject } from 'react';
import { X } from 'lucide-react';
import type { LocationId } from '../engine/clinic';
import { staffSmallTalk } from '../data/staffSmallTalk';
import { useVisitMission } from '../context/VisitContext';

export function StaffSceneDialogue({location,speaker,round,replying,reminder,panel,line,onReply,onContinue,onClose}:{
  location:LocationId; speaker:string; round:number; replying:boolean; reminder:string;
  panel:RefObject<HTMLElement|null>; line:RefObject<SVGLineElement|null>;
  onReply:()=>void; onContinue:()=>void; onClose:()=>void;
}){
  const mission=useVisitMission();
  const talk=staffSmallTalk(location,round,mission);
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
  },[panel,replying,round]);
  return <>
    <svg className="scene-speech-link" aria-hidden="true"><line ref={line}/></svg>
    <section ref={panel} className={'scene-speech '+(replying?'is-reply':'')}
      data-testid="scene-speech" data-speaker={replying?'representative':'staff'}
      aria-label="診所互動對話">
      <header><h3>{replying?'你':speaker}</h3>
        <button className="icon-button" onClick={onClose} aria-label="關閉診所互動對話"><X size={18}/></button>
      </header>
      <p className="scene-speech-text" aria-live="polite" aria-atomic="true">{replying?talk.reply:talk.greeting}</p>
      <button ref={next} className="button primary scene-speech-next" onClick={replying?onContinue:onReply}>
        {replying?'繼續聊聊':'回應'} <span aria-hidden="true">→</span>
      </button>
      <details className="scene-speech-note"><summary>拜訪提醒</summary><p>{reminder}</p></details>
    </section>
  </>;
}
