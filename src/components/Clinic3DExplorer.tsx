import {mainTarget,sceneLocations,targetAction} from '../data/sceneLocations';
import { DoctorSceneDialogue, type SceneConsultation } from './DoctorSceneDialogue';
import { Consultation } from '../screens/Consultation';
import { useClinicConversation } from '../hooks/useClinicConversation';
import { useArrivalInteraction } from '../hooks/useArrivalInteraction';
import { StaffSceneDialogue } from './StaffSceneDialogue';
import { clinicStaff } from '../data/clinicStaff';
import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Check,
  LockKeyhole,
  Compass,
  Footprints,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  RotateCcw,
  View,
  X,
} from 'lucide-react';
import { type ClinicProgress, type LocationId } from '../engine/clinic';
import { useClinicJourney } from '../hooks/useClinicJourney';
import { useReducedMotion } from '../hooks/useMotion';
import {
  createClinicRenderer,
  type ClinicRendererAPI,
  type RenderState,
  type CameraSnapshot,
} from '../three/createClinicRenderer';
import { ClinicMiniMap } from './ClinicMiniMap';
import { ClinicExplorer } from './ClinicExplorer';
import { nearbyLocation, type WalkDirection } from '../engine/freeWalk';
import type { WorldPoint } from '../engine/clinic3d';
import { useVisitMission } from '../context/VisitContext';
import { useVisitSequence } from '../context/VisitSequenceContext';
import { VisitSequence } from './VisitSequence';

interface Props {
  consultation?: SceneConsultation;
  onEnter?: () => void;
  onProgress?: (progress: ClinicProgress) => void;
}
function ThreeCanvas({
  state,
  labels,
  player,
  miniPlayer,
  speech,
  speechLine,
  api,
  onVisit,
  onReady,
  onFailure,
  onCamera,
  position,
  onManualStart,
  onMotion,
  onProximity,
  onInteract,
}: {
  state: RenderState;
  labels: RefObject<Record<LocationId, HTMLButtonElement | null>>;
  player: RefObject<HTMLDivElement | null>;
  miniPlayer: RefObject<SVGCircleElement | null>;
  speech: RefObject<HTMLElement | null>;
  speechLine: RefObject<SVGLineElement | null>;
  api: RefObject<ClinicRendererAPI | null>;
  onVisit: (id: LocationId) => void;
  onReady: () => void;
  onFailure: () => void;
  onCamera: (snapshot: CameraSnapshot) => void;
  position: RefObject<WorldPoint>;
  onManualStart: () => void;
  onMotion: (moving: boolean) => void;
  onProximity: (id: LocationId | null) => void;
  onInteract: (id: LocationId) => void;
}) {
  const mission = useVisitMission();
  const host = useRef<HTMLDivElement>(null),
    stateRef = useRef(state),
    callbacks = useRef({
      onVisit,
      onReady,
      onFailure,
      onCamera,
      onManualStart,
      onMotion,
      onProximity,
      onInteract,
    });
  stateRef.current = state;
  callbacks.current = {
    onVisit,
    onReady,
    onFailure,
    onCamera,
    onManualStart,
    onMotion,
    onProximity,
    onInteract,
  };
  useEffect(() => {
    let renderer: ClinicRendererAPI | null = null;
    try {
      renderer = createClinicRenderer({
        mission,
        host: host.current!,
        state: stateRef,
        labels,
        player,
        miniPlayer,
        speech,
        speechLine,
        onVisit: (id) => callbacks.current.onVisit(id),
        onReady: () => callbacks.current.onReady(),
        onFailure: () => callbacks.current.onFailure(),
        onCamera: (s) => callbacks.current.onCamera(s),
        position,
        onManualStart: () => callbacks.current.onManualStart(),
        onMotion: (moving) => callbacks.current.onMotion(moving),
        onProximity: (id) => callbacks.current.onProximity(id),
        onInteract: (id) => callbacks.current.onInteract(id),
      });
      api.current = renderer;
    } catch {
      callbacks.current.onFailure();
    }
    return () => {
      renderer?.dispose();
      if (api.current === renderer) api.current = null;
    };
  }, []);
  return <div className="three-canvas-mount" ref={host} />;
}
function ThreeClinicSession({ onEnter, onProgress, onFailure, consultation }: Props & { onFailure: () => void }) {
  const mission = useVisitMission();
  const target=mainTarget(mission),locations=sceneLocations(mission);
  const sequence=useVisitSequence();
  const [sequenceNotice,setSequenceNotice]=useState('');
  const blockedMessage='請先完成'+locations[sequence.next].marker+' '+locations[sequence.next].name+'的對話。';
  const visitDialogue=(_:unknown,id:LocationId)=>locations[id];
  const consulting=Boolean(consultation);
  const [doctorLine,setDoctorLine]=useState(0);
  const reduced = useReducedMotion(),
    movement = useClinicJourney(reduced),
    { progress, journey } = movement;
  const [ready, setReady] = useState(false),
    [camera, setCamera] = useState<CameraSnapshot>({ zoom: 1, azimuth: 0, polar: 1 });
  const conversation = useClinicConversation();
  const { opened } = conversation;
  const [replying,setReplying] = useState(false);
  const speech = useRef<HTMLElement|null>(null), speechLine = useRef<SVGLineElement|null>(null);
  useEffect(()=>setReplying(false),[conversation.sequence]);
  const staffTalking = !consulting && !progress.moving && opened!==target && (opened === 'reception' || opened === 'waiting');
  const api = useRef<ClinicRendererAPI | null>(null),
    player = useRef<HTMLDivElement>(null),
    miniPlayer = useRef<SVGCircleElement>(null);
  const labels = useRef<Record<LocationId, HTMLButtonElement | null>>({
    entrance: null,
    reception: null,
    waiting: null,
    doctor: null,
  });
  useEffect(() => {
    onProgress?.(progress);
  }, [progress, onProgress]);
  useEffect(() => {
    if (!progress.freeRoam && !progress.moving && progress.visited.length && progress.location==='entrance')
      conversation.open(progress.location, false);
  }, [progress.freeRoam, progress.moving, progress.location, progress.visited]);
  useEffect(() => {
    if (progress.freeRoam) conversation.keepOnly(progress.nearby);
  }, [progress.freeRoam, progress.nearby]);
  useEffect(()=>{
    setDoctorLine(0);
    api.current?.stopMovement();
    if(!consulting) api.current?.focus();
  },[consulting]);
  function interact(id: LocationId) {
    if (consulting) return false;
    api.current?.stopMovement();
    if (!sequence.canInteract(id)) { setSequenceNotice(blockedMessage); return false; }
    setSequenceNotice('');
    if (!movement.interactAt(id)) return false;
    if (id === target) { conversation.close(); onEnter?.(); }
    else conversation.open(id);
    return true;
  }
  function visit(id: LocationId) {
    if (progress.moving || consulting) return;
    if (!sequence.canInteract(id)) { setSequenceNotice(blockedMessage); return; }
    setSequenceNotice('');
    if (nearbyLocation(movement.position.current) === id) return interact(id);
    api.current?.stopMovement();
    conversation.close();
    movement.moveTo(id);
  }
  const directionButtons = [
    ['up', '向前走', ArrowUp],
    ['left', '向左走', ArrowLeft],
    ['down', '向後走', ArrowDown],
    ['right', '向右走', ArrowRight],
  ] as const;
  const arrival = progress.freeRoam ? progress.nearby ?? null : progress.visited.length ? progress.location : null;
  useArrivalInteraction(arrival, !ready || consulting || progress.moving || Boolean(arrival&&!sequence.canInteract(arrival)), interact);
  const nearbyStaff = clinicStaff.find(s => s.location === progress.nearby);
  const interactionBlocked = Boolean(progress.nearby&&!sequence.canInteract(progress.nearby));
  function setDirection(direction: WalkDirection, pressed: boolean) {
    api.current?.setDirection(direction, pressed);
  }
  return (
    <div className={'clinic-explorer clinic3d-explorer'+(consulting?' doctor-conversation':'')}>
      <VisitSequence/>
      {sequenceNotice&&<p className="visit-sequence-notice" role="status">{sequenceNotice}</p>}
      <div className="clinic3d-toolbar">
        <div className="three-status">
          <span className="live-dot" />
          <b>{consulting?'3D '+mission.doctor.name+'交流':'3D 自由探索'}</b>
          <small>{consulting?'拖曳旋轉 · 滾輪／雙指縮放':'方向鍵行走 · 拖曳旋轉 · 滾輪／雙指縮放'}</small>
        </div>
        <div className="camera-actions" role="group" aria-label="3D視角控制">
          <button
            disabled={!ready}
            onClick={() => api.current?.rotate(-Math.PI / 8)}
            aria-label="向左旋轉"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            disabled={!ready}
            onClick={() => api.current?.rotate(Math.PI / 8)}
            aria-label="向右旋轉"
          >
            <ArrowRight size={16} />
          </button>
          <span className="camera-divider" />
          <button
            disabled={!ready}
            onClick={() => api.current?.zoom(1 / 1.15)}
            aria-label="縮小場景"
          >
            <Minus size={16} />
          </button>
          <output aria-label="場景縮放比例">{Math.round(camera.zoom * 100)}%</output>
          <button disabled={!ready} onClick={() => api.current?.zoom(1.15)} aria-label="放大場景">
            <Plus size={16} />
          </button>
          <button disabled={!ready} onClick={() => api.current?.top()} aria-label="俯視診所">
            <View size={16} />
          </button>
          <button disabled={!ready} onClick={() => api.current?.reset()} aria-label="重設視角">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
      <div className={'clinic3d-stage'+((staffTalking||consulting)?' has-staff-dialogue':'')} data-testid="clinic-map" data-scene="threejs">
        <ThreeCanvas
          state={{ progress, journey, reduced, completedDialogues:sequence.completed, conversation:consulting?target:opened, conversationSequence:consulting?doctorLine:conversation.sequence, speechSpeaker:consulting?(doctorLine===1?'representative':'staff'):(replying?'representative':'staff'), talkingToDoctor:consulting }}
          labels={labels}
          player={player}
          miniPlayer={miniPlayer}
          speech={speech}
          speechLine={speechLine}
          api={api}
          onVisit={visit}
          onReady={() => {
            setReady(true);
            api.current?.focus();
          }}
          onFailure={onFailure}
          onCamera={setCamera}
          position={movement.position}
          onManualStart={() => {
            movement.beginManual();
            conversation.close();
          }}
          onMotion={movement.setManualMoving}
          onProximity={movement.setNearby}
          onInteract={interact}
        />


        {consultation && (
          <DoctorSceneDialogue consultation={consultation} line={doctorLine}
            onNext={()=>setDoctorLine(n=>Math.min(2,n+1))} panel={speech} link={speechLine}/>
        )}
        {staffTalking && opened && (
          <StaffSceneDialogue key={conversation.sequence} location={opened}
            speaker={visitDialogue(mission,opened).speaker} round={conversation.round}
            replying={replying} reminder={visitDialogue(mission,opened).message}
            panel={speech} line={speechLine} onReply={()=>setReplying(true)}
            onComplete={()=>{sequence.complete(opened);setReplying(false);conversation.close();setSequenceNotice('');api.current?.focus();}}
            onClose={()=>{conversation.close();api.current?.focus();}} />
        )}
        {!ready && (
          <div className="three-loading" role="status">
            <Compass size={25} />
            <b>正在準備3D診所…</b>
          </div>
        )}
        {(['entrance', 'reception', 'waiting', 'doctor'] as LocationId[]).map((id) => {
          const here =
            !progress.moving &&
            (progress.freeRoam ? progress.nearby === id : progress.location === id);
          return (
            <button
              key={id}
              ref={(el) => {
                labels.current[id] = el;
              }}
              className={`three-hotspot hotspot-${id} ${here ? 'current' : ''}`}
              data-visit-status={sequence.status(id)}
              aria-disabled={!sequence.canInteract(id)||undefined}
              disabled={!ready || progress.moving || consulting}
              aria-label={
                id === target
                  ? consulting ? '交流中' : here
                    ? targetAction(mission)
                    : '前往'+locations[id].name
                  : `${here ? '查看' : '前往'}${locations[id].name}`
              }
              onClick={() => visit(id)}
            >
              <span>
                {locations[id].marker}
              </span>
              <b>{id === target && consulting ? '交流中' : id === target && here ? targetAction(mission) : locations[id].name}</b>
              {sequence.status(id)==='complete'?<Check size={17}/>:sequence.status(id)==='locked'?<LockKeyhole size={17}/>:id === 'doctor' ? <ArrowRight size={17} /> : <MessageCircle size={17} />}
            </button>
          );
        })}
        <div
          ref={player}
          data-testid="map-player"
          className={`scene3d-player-tag ${progress.moving || progress.manualMoving ? 'walking' : progress.freeRoam ? 'free-roam' : progress.location === 'doctor' ? 'arrived' : progress.location === 'entrance' ? 'start' : `at-${progress.location}`}`}
          aria-label={`外勤代表${progress.freeRoam ? '自由行走中' : progress.moving ? '移動中' : `位於${locations[progress.location].name}`}`}
        >
          你
        </div>
        <span className="three-scene-caption">
          {mission.english} <span>FIELD VISIT / {mission.doctor.name}</span>
        </span>
      </div>
      <div className="free-walk-controls">
        <div className="walk-pad" role="group" aria-label="外勤行走控制">
          {directionButtons.map(([direction, label, Icon]) => (
            <button
              key={direction}
              className={`walk-${direction}`}
              aria-label={label}
              disabled={!ready}
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                setDirection(direction, true);
              }}
              onPointerUp={() => setDirection(direction, false)}
              onPointerCancel={() => setDirection(direction, false)}
              onLostPointerCapture={() => setDirection(direction, false)}
              onKeyDown={(event) => {
                if (['Enter', ' '].includes(event.key)) {
                  event.preventDefault();
                  if (!event.repeat) setDirection(direction, true);
                }
              }}
              onKeyUp={(event) => {
                if (['Enter', ' '].includes(event.key)) setDirection(direction, false);
              }}
              onBlur={() => setDirection(direction, false)}
            >
              <Icon size={17} />
            </button>
          ))}
        </div>
        <div className="walk-instructions" id="free-walk-instructions">
          <b>方向鍵 / WASD 自由行走</b>
          <span>先點場景再操作；方向跟隨視角，手機可長按方向按鈕。</span>
          <small>抵達定位點自動對話 · 關閉後可按 E 或 Enter 再聊</small>
        </div>
        <div
          className={`proximity-action ${progress.nearby ? 'available' : ''}`}
          data-testid="proximity-action"
        >
          <span role="status">
            {interactionBlocked
              ? blockedMessage
              : progress.nearby
                ? `附近：${locations[progress.nearby].name}`
                : '靠近'+mission.doctor.name+'或其他人員，即可互動'}
          </span>
          <button
            className="button primary"
            disabled={!ready || !progress.nearby || progress.moving || interactionBlocked || consulting}
            onClick={() => {
              if (progress.nearby) interact(progress.nearby);
            }}
            aria-label={
              progress.nearby === target
                ? '與'+mission.doctor.name+'互動'
                : progress.nearby === 'reception'
                  ? '與'+locations.reception.speaker+'互動'
                  : progress.nearby === 'waiting'
                    ? '與'+locations.waiting.speaker+'互動'
                    : '查看拜訪準備'
            }
          >
            <MessageCircle size={15} />
            {progress.nearby === target ? '與'+mission.doctor.name+'交流' : nearbyStaff ? '與' + locations[nearbyStaff.location].speaker + '對話' : '互動'}
            <kbd>E</kbd>
          </button>
        </div>
      </div>
      <ClinicMiniMap
        progress={progress}
        route={journey?.points ?? []}
        onNavigate={visit}
        playerRef={miniPlayer}
      />
      <div className="explorer-task" role="status">
        <Footprints size={18} />
        <div>
          <b>
            {progress.moving
              ? `正在前往${locations[progress.destination!].name}`
              : progress.freeRoam
                ? progress.manualMoving
                  ? '正在自由行走'
                  : '自由探索中'
                : progress.location === target
                  ? '已抵達'+locations[target].name
                  : `目前位置：${locations[progress.location].name}`}
          </b>
          <span>
            {progress.moving
              ? '3D外勤正沿走道移動，可繼續旋轉視角觀察。'
              : progress.freeRoam
                ? progress.nearby
                  ? `已靠近${locations[progress.nearby].name}，抵達後自動對話；關閉後可再次互動。`
                  : '方向鍵可繼續探索；桌椅與牆面會擋住角色。'
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
      {movement.routeError && (
        <p className="three-fallback" role="alert">
          {movement.routeError}，請先用方向鍵移至走道再試。
        </p>
      )}
      {opened && !progress.moving && !staffTalking && !consulting && (
        <section className="clinic-interaction-card" aria-label="診所互動對話">
          <span className="interaction-avatar">
            {opened === 'reception' ? '藥' : opened === 'waiting' ? '掛' : <MapPin size={22} />}
          </span>
          <div>
            <small>{locations[opened].name}</small>
            <h3>{visitDialogue(mission, opened).speaker}</h3>
            <p>{visitDialogue(mission, opened).message}</p>
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
export default function Clinic3DExplorer(props: Props) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div data-testid="3d-fallback">
        <div className="three-fallback" role="status">
          此裝置暫時無法啟用3D，已切換簡易場景。拜訪與答題功能仍可使用。
        </div>
        <div hidden={Boolean(props.consultation)}><ClinicExplorer {...props} /></div>
        {props.consultation && <Consultation {...props.consultation} />}
      </div>
    );
  return <ThreeClinicSession {...props} onFailure={() => setFailed(true)} />;
}
