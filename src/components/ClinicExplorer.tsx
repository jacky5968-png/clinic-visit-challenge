import {mainTarget,sceneLocations,targetAction} from '../data/sceneLocations';
import { useClinicConversation } from '../hooks/useClinicConversation';
import { useArrivalInteraction } from '../hooks/useArrivalInteraction';
import { useVisitSequence } from '../context/VisitSequenceContext';
import { VisitSequence } from './VisitSequence';
import { StaffSmallTalk } from './StaffSmallTalk';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, Footprints, MapPin, MessageCircle, LockKeyhole, X } from 'lucide-react';
import { assets } from '../data/assets';
import { nodes, type ClinicProgress, type LocationId } from '../engine/clinic';
import { useClinicMovement } from '../hooks/useClinicMovement';
import { AssetImage } from './AssetImage';
import { Character } from './Character';
import { ClinicMiniMap } from './ClinicMiniMap';
import { useVisitMission } from '../context/VisitContext';


export function ClinicExplorer({
  onEnter,
  onProgress,
}: {
  onEnter?: () => void;
  onProgress?: (progress: ClinicProgress) => void;
}) {
  const mission = useVisitMission();
  const target=mainTarget(mission),locations=sceneLocations(mission);
  const sequence=useVisitSequence(),[notice,setNotice]=useState('');
  const blockedMessage='請先完成'+locations[sequence.next].marker+' '+locations[sequence.next].name+'的對話。';
  const visitDialogue=(_:unknown,id:LocationId)=>locations[id];
  const movement = useClinicMovement();
  const { progress, journey } = movement;
  const conversation = useClinicConversation();
  const { opened } = conversation;
  useEffect(() => {
    onProgress?.(progress);
    if (!progress.moving && progress.visited.length && progress.location==='entrance') conversation.open(progress.location, false);
  }, [progress, onProgress]);
  useArrivalInteraction(progress.visited.length ? progress.location : null, progress.moving || !sequence.canInteract(progress.location), (id) => {
    if(id===target) {
      if(!sequence.canInteract(id)) return false;
      onEnter?.();
    } else conversation.open(id);
    return true;
  });
  function visit(id: LocationId) {
    if (progress.moving) return;
    if(!sequence.canInteract(id)){setNotice(blockedMessage);return;}
    setNotice('');
    if (progress.location === id) {
      if (id === target) onEnter?.();
      else conversation.open(id);
      return;
    }
    conversation.close();
    movement.moveTo(id);
  }
  const route = journey?.points ?? [];
  return (
    <div className="clinic-explorer">
      <VisitSequence/>
      {notice&&<p className="visit-sequence-notice" role="status">{notice}</p>}
      <div className="clinic-stage" data-testid="clinic-map">
        <div className="map-grid" />
        <div className="scene-artwork">
          <AssetImage
            src={assets.clinic}
            alt={`${mission.clinic}簡易場景：前往${locations[target].name}與${mission.doctor.name}交流`}
            className="clinic-art"
          />
        </div>
        <span className="explorer-location">
          <span className="live-dot" />
          {mission.clinic}
          <small>{mission.english}</small>
        </span>
        <svg className="explorer-route" viewBox="0 0 1100 650" aria-hidden="true">
          {route.length > 1 && (
            <polyline
              points={route.map((p) => `${p.x + 100},${p.y}`).join(' ')}
              fill="none"
              stroke="#af9a5e"
              strokeWidth="3"
              strokeDasharray="7 7"
            />
          )}
          {progress.moving && (
            <circle
              cx={nodes[journey!.to].x + 100}
              cy={nodes[journey!.to].y}
              r="14"
              fill="none"
              stroke="#8fae6e"
              strokeWidth="3"
              className="destination-ring"
            />
          )}
        </svg>
        {(['entrance', 'reception', 'waiting', 'doctor'] as LocationId[]).map((id) => {
          const location = locations[id],
            here = progress.location === id && !progress.moving;
          return (
            <button
              key={id}
              className={`explorer-hotspot hotspot-${id} ${here ? 'current' : ''} ${progress.visited.includes(id) ? 'visited' : ''}`}
              data-visit-status={sequence.status(id)}
              aria-disabled={!sequence.canInteract(id)||undefined}
              style={{
                left: `${((location.label.x + 100) / 1100) * 100}%`,
                top: `${(location.label.y / 650) * 100}%`,
              }}
              disabled={progress.moving}
              onClick={() => visit(id)}
              aria-label={
                id === target
                  ? here
                    ? targetAction(mission)
                    : '前往'+locations[id].name
                  : `${here ? '查看' : '前往'}${location.name}`
              }
            >
              <span className="hotspot-marker">
                {location.marker}
              </span>
              <span>{id === target && here ? targetAction(mission) : location.name}</span>
              {sequence.status(id)==='complete'?<Check size={17}/>:sequence.status(id)==='locked'?<LockKeyhole size={17}/>:id === 'doctor' ? <ArrowRight size={17} /> : <MessageCircle size={17} />}
            </button>
          );
        })}
        <div
          ref={movement.travelerRef}
          className="map-traveler"
          style={{ transform: movement.transform }}
        >
          <div
            className={`map-player v2-player ${progress.moving ? 'walking' : progress.location === 'doctor' ? 'arrived' : progress.location === 'entrance' ? 'start' : `at-${progress.location}`}`}
            data-testid="map-player"
          >
            <div
              className="representative-facing"
              style={{ transform: `scaleX(${movement.facing})` }}
            >
              <Character role="representative" articulated walking={progress.moving} />
            </div>
            <span className="player-tag">你</span>
          </div>
        </div>
        <span className="explorer-compass" aria-hidden="true">
          N<span>◇</span>
        </span>
      </div>
      <ClinicMiniMap
        playerRef={movement.miniMapPlayerRef}
        progress={progress}
        route={route}
        onNavigate={visit}
      />
      <div className="explorer-task" role="status">
        <Footprints size={18} />
        <div>
          <b>
            {progress.moving
              ? `正在前往${locations[progress.destination!].name}`
              : progress.location === target
                ? '已抵達'+locations[target].name
                : `目前位置：${locations[progress.location].name}`}
          </b>
          <span>
            {progress.moving
              ? '沿路線自動移動中，抵達後即可互動。'
              : progress.location === target
                ? '抵達後自動展開交流；關閉後可再次點選人物對話。'
                : '請依01 → 02 → 03的順序，完成櫃台對話再接受考核。'}
          </span>
        </div>
        {progress.moving && (
          <button className="text-button" onClick={movement.skip}>
            略過移動
            <ArrowRight size={14} />
          </button>
        )}
      </div>
      {opened && !progress.moving && (
        <section className="clinic-interaction-card" aria-label="診所互動對話">
          <span className="interaction-avatar">
            <MapPin size={22} />
          </span>
          <div>
            <small>{locations[opened].name}</small>
            <h3>{visitDialogue(mission, opened).speaker}</h3>
            {opened!==target && (opened === 'reception' || opened === 'waiting') ? (
              <StaffSmallTalk key={conversation.sequence} location={opened} speaker={visitDialogue(mission, opened).speaker}
                round={conversation.round} reminder={visitDialogue(mission, opened).message}
                onComplete={() => {
                  const destination=sequence.complete(opened);
                  conversation.close();setNotice('');
                  if(destination)movement.moveTo(destination);
                }} />
            ) : <p>{visitDialogue(mission, opened).message}</p>}
          </div>
          <button
            className="icon-button"
            onClick={() => conversation.close()}
            aria-label="關閉診所互動對話"
          >
            <X size={16} />
          </button>
        </section>
      )}
    </div>
  );
}
