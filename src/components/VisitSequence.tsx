import { Check, LockKeyhole, MessageCircle } from 'lucide-react';
import { useVisitMission } from '../context/VisitContext';
import { useVisitSequence } from '../context/VisitSequenceContext';
import { sceneLocations } from '../data/sceneLocations';
import { visitOrder } from '../engine/visitSequence';

export function VisitSequence() {
  const sequence = useVisitSequence(), locations = sceneLocations(useVisitMission());
  return <div className="visit-sequence" aria-label="櫃台對話順序" data-next={sequence.next}>
    <ol>{visitOrder.map(id => <li key={id} data-status={sequence.status(id)}>
      <strong>{locations[id].marker}</strong><span>{locations[id].name}<small>{sequence.status(id) === 'complete' ? '已完成對話' : sequence.status(id) === 'locked' ? '待解鎖' : '下一站'}</small></span>
      {sequence.status(id) === 'complete' ? <Check size={17}/> : sequence.status(id) === 'locked' ? <LockKeyhole size={17}/> : <MessageCircle size={17}/>}
    </li>)}</ol>
    <p role="status">請依序完成01、02對話，再到03交流與考核。</p>
  </div>;
}
