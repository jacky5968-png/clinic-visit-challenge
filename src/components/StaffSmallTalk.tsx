import { staffSmallTalk } from '../data/staffSmallTalk';
import type { LocationId } from '../engine/clinic';
import { useVisitMission } from '../context/VisitContext';
import { useState } from 'react';
export function StaffSmallTalk({ location, speaker, round, reminder, onComplete }: {
  location: LocationId; speaker: string; round: number; reminder: string; onComplete: () => void;
}) {
  const mission = useVisitMission();
  const talk = staffSmallTalk(location, round, mission);
  const [replying,setReplying]=useState(false);
  return <div className="staff-small-talk">
    <div key={round} className="staff-chat-lines" aria-live="polite" aria-atomic="true">
      {replying?<p className="staff-chat-bubble representative"><b>你</b><span>{talk.reply}</span></p>:<p className="staff-chat-bubble"><b>{speaker}</b><span>{talk.greeting}</span></p>}
    </div>
    <button className="button primary staff-continue" onClick={replying?onComplete:()=>setReplying(true)}>{replying?'完成對話':'回應'}</button>
    <details className="staff-visit-note"><summary>拜訪提醒</summary><p>{reminder}</p></details>
  </div>;
}
