import { staffSmallTalk } from '../data/staffSmallTalk';
import type { LocationId } from '../engine/clinic';
import { useVisitMission } from '../context/VisitContext';
export function StaffSmallTalk({ location, speaker, round, reminder, onContinue }: {
  location: LocationId; speaker: string; round: number; reminder: string; onContinue: () => void;
}) {
  const mission = useVisitMission();
  const talk = staffSmallTalk(location, round, mission);
  return <div className="staff-small-talk">
    <div key={round} className="staff-chat-lines" aria-live="polite" aria-atomic="true">
      <p className="staff-chat-bubble"><b>{speaker}</b><span>{talk.greeting}</span></p>
      <p className="staff-chat-bubble representative"><b>你</b><span>{talk.reply}</span></p>
    </div>
    <button className="text-button staff-continue" onClick={onContinue}>繼續聊聊</button>
    <details className="staff-visit-note"><summary>拜訪提醒</summary><p>{reminder}</p></details>
  </div>;
}
