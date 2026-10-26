import {useVisitMission} from '../context/VisitContext';
import {sceneLocations} from '../data/sceneLocations';
import { Check, Compass, LockKeyhole } from 'lucide-react';
import { useVisitSequence } from '../context/VisitSequenceContext';
import { visitMarkerColors } from '../engine/visitSequence';
import type { RefObject } from 'react';
import {
  nodes,
  type ClinicProgress,
  type LocationId,
  type Point,
} from '../engine/clinic';
export function ClinicMiniMap({
  progress,
  route,
  onNavigate,
  playerRef,
}: {
  progress: ClinicProgress;
  route: Point[];
  onNavigate: (id: LocationId) => void;
  playerRef: RefObject<SVGCircleElement | null>;
}) {
  const locations=sceneLocations(useVisitMission());
  const sequence=useVisitSequence();
  const current = progress.freeRoam ? progress.nearby : progress.location;
  return (
    <aside className="clinic-minimap" aria-label="診所小地圖">
      <div className="minimap-heading">
        <Compass size={14} />
        <b>診所導覽</b>
        <span>1F</span>
      </div>
      <svg viewBox="130 170 710 350" aria-hidden="true">
        <polygon
          points="450,170 811,353 527,505 166,312"
          fill="#e7eedf"
          stroke="#c0d0b6"
          strokeWidth="7"
        />
        <path d="M450 170L811 353M450 170L166 312" stroke="#b2c6aa" strokeWidth="13" />
        <path d="M650 270L720 305 610 370 540 333Z" fill="#c2d7c3" />
        <path d="M335 265L440 320" stroke="#9cb8a6" strokeWidth="28" />
        <path d="M485 410L585 465" stroke="#bdd0af" strokeWidth="24" />
        {route.length > 1 && (
          <polyline
            points={route.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#7e9d56"
            strokeWidth="6"
            strokeDasharray="10 8"
          />
        )}
        {(['reception', 'waiting', 'doctor'] as LocationId[]).map((id) => (
          <circle
            key={id}
            cx={nodes[id].x}
            cy={nodes[id].y}
            r="16"
            fill={'#'+visitMarkerColors[sequence.status(id)].toString(16).padStart(6,'0')}
            stroke="#ffffff"
            strokeWidth="5"
          />
        ))}
        <circle
          ref={playerRef}
          data-testid="minimap-player"
          cx={nodes[progress.location].x}
          cy={nodes[progress.location].y}
          r="12"
          fill="#d3b977"
          stroke="#fff"
          strokeWidth="5"
        />
        {progress.moving && progress.destination && (
          <circle
            cx={nodes[progress.destination].x}
            cy={nodes[progress.destination].y}
            r="23"
            fill="none"
            stroke="#9fb875"
            strokeWidth="4"
            strokeDasharray="5 5"
          />
        )}
      </svg>
      <div className="minimap-destinations">
        {(['reception', 'waiting', 'doctor'] as LocationId[]).map((id) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            disabled={progress.moving}
            data-visit-status={sequence.status(id)}
            aria-disabled={!sequence.canInteract(id)||undefined}
            aria-label={`小地圖：${locations[id].name}`}
            aria-current={current === id ? 'location' : undefined}
          >
            <span>
              {locations[id].marker}
            </span>
            {locations[id].name}
            {sequence.status(id)==='complete'?<Check size={15}/>:sequence.status(id)==='locked'?<LockKeyhole size={15}/>:null}
          </button>
        ))}
      </div>
    </aside>
  );
}
