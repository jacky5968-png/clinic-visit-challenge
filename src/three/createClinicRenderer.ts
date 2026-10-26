import {mainTarget} from '../data/sceneLocations';
import { visitMarkerColors, visitPointStatus } from '../engine/visitSequence';
import { createDoctorAnimator } from './doctorAnimation';
import { layoutSceneSpeech } from './layoutSceneSpeech';
import { createStaffAnimator } from './staffAnimation';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildClinic } from './buildClinic';
import { layoutSceneLabels, type SceneLabel } from './layoutSceneLabels';
import {
  CAMERA_LIMITS,
  clampZoom,
  labelAnchors,
  sampleWorldRoute,
  worldToClinic,
  type WorldPoint,
} from '../engine/clinic3d';
import {
  cameraRelativeInput,
  moveWithCollision,
  nearbyLocation,
  WALK_SPEED,
  type WalkDirection,
} from '../engine/freeWalk';
import { nodes, type ClinicProgress, type LocationId } from '../engine/clinic';
import type { ClinicJourney } from '../hooks/useClinicJourney';
import type { VisitMission } from '../data/visitMissions';

export interface RenderState {
  progress: ClinicProgress;
  completedDialogues?: readonly LocationId[];
  journey: ClinicJourney | null;
  reduced: boolean;
  conversation?: LocationId | null;
  conversationSequence?: number;
  speechSpeaker?: 'staff' | 'representative';
  talkingToDoctor?: boolean;
}
export interface CameraSnapshot {
  zoom: number;
  azimuth: number;
  polar: number;
}
export interface ClinicRendererAPI {
  rotate: (horizontal: number, vertical?: number) => void;
  zoom: (factor: number) => void;
  reset: () => void;
  top: () => void;
  setDirection: (direction: WalkDirection, pressed: boolean) => void;
  stopMovement: () => void;
  focus: () => void;
  dispose: () => void;
}
interface Options {
  mission: VisitMission;
  host: HTMLDivElement;
  state: { current: RenderState };
  labels: { current: Record<LocationId, HTMLButtonElement | null> };
  player: { current: HTMLDivElement | null };
  miniPlayer: { current: SVGCircleElement | null };
  speech: { current: HTMLElement | null };
  speechLine: { current: SVGLineElement | null };
  onVisit: (id: LocationId) => void;
  onReady: () => void;
  onFailure: () => void;
  onCamera: (camera: CameraSnapshot) => void;
  position: { current: WorldPoint };
  onManualStart: () => void;
  onMotion: (moving: boolean) => void;
  onProximity: (id: LocationId | null) => void;
  onInteract: (id: LocationId) => void;
}
export function createClinicRenderer(options: Options): ClinicRendererAPI {
  const { host } = options;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.dataset.testid = 'clinic-3d-canvas';
  canvas.dataset.renderer = 'loading';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '可旋轉縮放的3D場景');
  canvas.setAttribute(
    'aria-keyshortcuts',
    'ArrowLeft ArrowRight ArrowUp ArrowDown w a s d e Enter + - Home',
  );
  canvas.setAttribute('aria-describedby', 'free-walk-instructions');
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(options.mission.theme.soft);
  const hemisphere = new THREE.HemisphereLight(0xf3fcff, 0x729b91, 1.25);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xfff7e5, 2.8);
  sun.position.set(-7, 18, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  sun.shadow.normalBias = 0.025;
  sun.shadow.bias = -0.0002;
  scene.add(sun);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: options.mission.theme.soft, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.35;
  ground.receiveShadow = true;
  scene.add(ground);
  const model = buildClinic(options.mission);
  let doctorFigure: THREE.Object3D | null = null;
  model.root.traverse(object=>{ if(object.userData.doctorName) doctorFigure=object; });
  const animateStaff = createStaffAnimator(model.staff.filter(s=>s.rig!==model.doctor));
  const animateDoctor = createDoctorAnimator(model.doctor);
  let characterAnimationActive = false;
  canvas.dataset.missionId = options.mission.id;
  canvas.dataset.doctor = options.mission.doctor.name;
  canvas.dataset.staffCount = String(model.staff.length);
  canvas.dataset.staffNames = JSON.stringify(model.staff.map(s => s.name));
  scene.add(model.root);
  const camera = new THREE.OrthographicCamera(-10, 10, 7, -7, 0.1, 150);
  camera.position.set(15, 13, 17);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.6, 0.3);
  controls.enablePan = false;
  controls.enableDamping = !options.state.current.reduced;
  controls.dampingFactor = 0.1;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.85;
  controls.minPolarAngle = CAMERA_LIMITS.minPolar;
  controls.maxPolarAngle = CAMERA_LIMITS.maxPolar;
  controls.minZoom = CAMERA_LIMITS.minZoom;
  controls.maxZoom = CAMERA_LIMITS.maxZoom;
  controls.update();
  controls.saveState();
  let width = 1,
    height = 1,
    disposed = false,
    dirty = true,
    ready = false,
    frameId = 0,
    lastState: RenderState | null = null,
    lastPose = 0,
    lastSnapshot = '';
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2(),
    spherical = new THREE.Spherical(),
    vector = new THREE.Vector3();
  const resize = () => {
    const bounds = host.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    const aspect = width / height,
      span = Math.max(13.8, 17.5 / aspect);
    camera.left = (-span * aspect) / 2;
    camera.right = (span * aspect) / 2;
    camera.top = span / 2;
    camera.bottom = -span / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    dirty = true;
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const speechObserver = new ResizeObserver(()=>{ dirty = true; });
  let observedSpeech: HTMLElement | null = null;
  resize();
  const cameraChanged = () => {
    dirty = true;
  };
  controls.addEventListener('change', cameraChanged);
  const rotate = (horizontal: number, vertical = 0) => {
    spherical.setFromVector3(camera.position.clone().sub(controls.target));
    spherical.theta += horizontal;
    spherical.phi = THREE.MathUtils.clamp(
      spherical.phi + vertical,
      CAMERA_LIMITS.minPolar,
      CAMERA_LIMITS.maxPolar,
    );
    camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(controls.target));
    controls.update();
    dirty = true;
  };
  const zoom = (factor: number) => {
    camera.zoom = clampZoom(camera.zoom * factor);
    camera.updateProjectionMatrix();
    controls.update();
    dirty = true;
  };
  const reset = () => {
    controls.reset();
    resize();
    dirty = true;
  };
  const top = () => {
    spherical.setFromVector3(camera.position.clone().sub(controls.target));
    spherical.phi = 0.32;
    camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(controls.target));
    controls.update();
    dirty = true;
  };
  const keyboard = new Set<string>(),
    touchDirections = new Set<WalkDirection>();
  const directionKeys: Record<string, WalkDirection> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    KeyW: 'up',
    KeyS: 'down',
    KeyA: 'left',
    KeyD: 'right',
  };
  let manualOverride = false,
    motionReported = false,
    lastNearby: LocationId | null | undefined;
  const reportMotion = (moving: boolean) => {
    if (motionReported !== moving) {
      motionReported = moving;
      options.onMotion(moving);
    }
  };
  const stopMovement = () => {
    keyboard.clear();
    touchDirections.clear();
    reportMotion(false);
    dirty = true;
  };
  const beginManual = () => {
    manualOverride = true;
    options.onManualStart();
    dirty = true;
  };
  const setDirection = (direction: WalkDirection, pressed: boolean) => {
    if (pressed && options.state.current.talkingToDoctor) return;
    if (pressed) {
      if (!touchDirections.has(direction)) beginManual();
      touchDirections.add(direction);
    } else {
      touchDirections.delete(direction);
      dirty = true;
    }
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || document.querySelector('dialog[open]')) return;
    if (options.state.current.talkingToDoctor && (directionKeys[event.code] || ['KeyE','Enter'].includes(event.code)) && !event.altKey) { event.preventDefault(); return; }
    if (!event.altKey && directionKeys[event.code]) {
      event.preventDefault();
      if (!event.repeat && !keyboard.has(event.code)) {
        keyboard.add(event.code);
        beginManual();
      }
      return;
    }
    if (!event.altKey && (event.code === 'KeyE' || event.code === 'Enter')) {
      event.preventDefault();
      if (!event.repeat) {
        stopMovement();
        const id = nearbyLocation(options.position.current);
        if (id) options.onInteract(id);
      }
      return;
    }
    const actions: Record<string, () => void> = {
      ...(event.altKey
        ? {
            ArrowLeft: () => rotate(-Math.PI / 12),
            ArrowRight: () => rotate(Math.PI / 12),
            ArrowUp: () => rotate(0, -0.12),
            ArrowDown: () => rotate(0, 0.12),
          }
        : {}),
      '+': () => zoom(1.15),
      '=': () => zoom(1.15),
      '-': () => zoom(1 / 1.15),
      Home: reset,
    };
    if (actions[event.key]) {
      event.preventDefault();
      actions[event.key]();
    }
  };
  const onKeyUp = (event: KeyboardEvent) => {
    keyboard.delete(event.code);
    dirty = true;
  };
  const onVisibility = () => {
    if (document.hidden) stopMovement();
  };
  let down: { x: number; y: number; id: number } | null = null,
    multiTouch = false;
  const activePointers = new Set<number>();
  const pointerDown = (event: PointerEvent) => {
    activePointers.add(event.pointerId);
    if (activePointers.size > 1) multiTouch = true;
    if (event.button === 0) {
      down = { x: event.clientX, y: event.clientY, id: event.pointerId };
      canvas.focus({ preventScroll: true });
    }
  };
  const pointerUp = (event: PointerEvent) => {
    activePointers.delete(event.pointerId);
    if (
      down &&
      down.id === event.pointerId &&
      !multiTouch &&
      Math.hypot(event.clientX - down.x, event.clientY - down.y) < 6 &&
      !options.state.current.progress.moving
    ) {
      const bounds = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      for (const hit of raycaster.intersectObjects(model.pickables, true)) {
        let object: THREE.Object3D | null = hit.object;
        while (object && !object.userData.location) object = object.parent;
        if (object?.userData.location) {
          options.onVisit(object.userData.location as LocationId);
          break;
        }
      }
    }
    down = null;
    if (!activePointers.size) multiTouch = false;
  };
  const cancelPointer = () => {
    down = null;
    multiTouch = false;
    activePointers.clear();
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    if (!disposed) options.onFailure();
  };
  // Overlay labels remain clickable, while wheel input still reaches OrbitControls.
  const stage = host.parentElement;
  const wheelOverLabel = (event: WheelEvent) => {
    if (!(event.target instanceof Element) || !event.target.closest('.three-hotspot')) return;
    event.preventDefault();
    canvas.dispatchEvent(new WheelEvent('wheel', {
      deltaX: event.deltaX, deltaY: event.deltaY, deltaZ: event.deltaZ,
      deltaMode: event.deltaMode, clientX: event.clientX, clientY: event.clientY,
      ctrlKey: event.ctrlKey, shiftKey: event.shiftKey, altKey: event.altKey,
      metaKey: event.metaKey, cancelable: true,
    }));
  };
  stage?.addEventListener('wheel', wheelOverLabel, { passive: false });
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', cancelPointer);
  canvas.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('blur', stopMovement);
  window.addEventListener('blur', stopMovement);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', contextLost);
  const project = (point: { x: number; y: number; z: number }) =>
    vector.set(point.x, point.y, point.z).project(camera).clone();
  const pickTargets: Record<LocationId, THREE.Vector3> = {
    entrance: new THREE.Vector3(-3.55, 1.45, 4.37),
    reception: new THREE.Vector3(-3.15, 0.7, -0.36),
    waiting: new THREE.Vector3(2.95, 0.65, 2.01),
    doctor: new THREE.Vector3(3.35, 0.96, -1.96),
  };
  let previousTime = performance.now();
  function render(now: number) {
    frameId = requestAnimationFrame(render);
    if (disposed) return;
    const dt = Math.min(0.05, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    const state = options.state.current,
      changed = lastState !== state;
    if (changed) {
      dirty = true;
      lastState = state;
      controls.enableDamping = !state.reduced;
      if(state.talkingToDoctor) stopMovement();
    }
    const orbiting = controls.update();
    const directions = new Set(
      [...keyboard].map((key) => directionKeys[key]).concat([...touchDirections]),
    );
    const horizontal = Number(directions.has('right')) - Number(directions.has('left'));
    const vertical = Number(directions.has('down')) - Number(directions.has('up'));
    if (!state.journey) manualOverride = false;
    const manual = Boolean(horizontal || vertical);
    if (!dirty && !state.journey && !orbiting && !manual && !characterAnimationActive) return;
    const journey = manualOverride || manual ? null : state.journey;
    let moving = false;
    if (manual) {
      const direction = cameraRelativeInput(horizontal, vertical, controls.getAzimuthalAngle());
      const before = options.position.current;
      const after = moveWithCollision(before, {
        x: direction.x * WALK_SPEED * dt,
        z: direction.z * WALK_SPEED * dt,
      });
      moving = Math.hypot(after.x - before.x, after.z - before.z) > 0.00001;
      options.position.current = after;
      if (moving) model.actor.root.rotation.y = Math.atan2(after.x - before.x, after.z - before.z);
    }
    reportMotion(moving);
    const sample =
      journey && !state.reduced
        ? sampleWorldRoute(journey.points, (now - journey.startedAt) / journey.duration)
        : { ...options.position.current, yaw: model.actor.root.rotation.y };
    options.position.current = { x: sample.x, z: sample.z };
    model.actor.root.position.set(sample.x, 0.15, sample.z);
    if (journey && !state.reduced) {
      const difference = Math.atan2(
        Math.sin(sample.yaw - model.actor.root.rotation.y),
        Math.cos(sample.yaw - model.actor.root.rotation.y),
      );
      model.actor.root.rotation.y += difference * 0.22;
    }
    const walking = (Boolean(journey) || moving) && !state.reduced;
    model.actor.pose(now * 0.012, walking);
    lastPose = model.actor.leftLeg.rotation.x;
    const mini = options.miniPlayer.current;
    if (mini) {
      const exactStop = !state.progress.freeRoam && !journey && !manual;
      const point = exactStop ? nodes[state.progress.location] : worldToClinic(sample);
      mini.setAttribute('cx', exactStop ? String(point.x) : point.x.toFixed(3));
      mini.setAttribute('cy', exactStop ? String(point.y) : point.y.toFixed(3));
    }
    const nearby = nearbyLocation(options.position.current);
    if (nearby !== lastNearby) {
      lastNearby = nearby;
      options.onProximity(nearby);
    }
    const staffMotion = animateStaff({
      now:now/1000,dt,actor:sample,nearby,conversation:state.conversation??null,
      sequence:state.conversationSequence??0,reduced:state.reduced,
    });

    const doctorMotion = animateDoctor({
      now:now/1000,dt,actor:sample,nearby:nearby===mainTarget(options.mission)?'doctor':null,
      talking:Boolean(state.talkingToDoctor),
      listening:state.speechSpeaker==='representative',
      sequence:state.conversationSequence??0,reduced:state.reduced,
    });
    characterAnimationActive = staffMotion.active || doctorMotion.active;
    canvas.dataset.doctorMotion = JSON.stringify(doctorMotion);
    canvas.dataset.staffMotion = JSON.stringify(staffMotion.frames);
    for (const [id, marker] of model.markers) {
      const material = marker.material as THREE.MeshBasicMaterial;
      const markerStatus = visitPointStatus(id, state.completedDialogues ?? []);
      material.opacity = markerStatus === 'locked' ? 0.8 : 1;
      material.color.setHex(visitMarkerColors[markerStatus]);
      marker.scale.setScalar(
        state.progress.destination === id && !state.reduced ? 1 + Math.sin(now * 0.006) * 0.12 : 1,
      );
    }
    for (const wall of model.wallMaterials) {
      const behind = wall.side === 'back' ? camera.position.z < -0.3 : camera.position.x < -1;
      wall.material.opacity = behind ? 0.17 : 1;
      wall.material.depthWrite = !behind;
    }
    renderer.render(scene, camera);
    canvas.dataset.renderer = 'webgl';
    canvas.dataset.actorX = sample.x.toFixed(4);
    canvas.dataset.actorZ = sample.z.toFixed(4);
    canvas.dataset.walkPose = lastPose.toFixed(4);
    canvas.dataset.nearby = nearby ?? '';
    canvas.dataset.manualMoving = String(moving);
    canvas.dataset.zoom = camera.zoom.toFixed(4);
    canvas.dataset.azimuth = controls.getAzimuthalAngle().toFixed(4);
    canvas.dataset.polar = controls.getPolarAngle().toFixed(4);
    canvas.dataset.drawCalls = String(renderer.info.render.calls);
    const sceneLabels: SceneLabel[] = [];
    for (const id of ['doctor', 'reception', 'waiting', 'entrance'] as LocationId[]) {
      const label = options.labels.current[id];
      if (!label) continue;
      const point = project(labelAnchors[id]),
        visible =
          point.z > -1 && point.z < 1 && Math.abs(point.x) < 1.18 && Math.abs(point.y) < 1.18;
      label.style.visibility = visible ? 'visible' : 'hidden';
      if (visible) sceneLabels.push({ id, x: (point.x * 0.5 + 0.5) * width,
        y: (-point.y * 0.5 + 0.5) * height, width: label.offsetWidth, height: label.offsetHeight });
      const target = project(pickTargets[id]);
      canvas.dataset[`pick${id}`] = JSON.stringify({
        x: (target.x * 0.5 + 0.5) * width,
        y: (-target.y * 0.5 + 0.5) * height,
      });
    }
    // Leave a 44px hit area around each physical object free of overlay labels.
    const pickAreas = (Object.keys(pickTargets) as LocationId[]).map(id => {
      const target = project(pickTargets[id]);
      return { left: (target.x * 0.5 + 0.5) * width - 22,
        top: (-target.y * 0.5 + 0.5) * height - 22, width: 44, height: 44 };
    });
    // Keep visible faces and person click targets clear of navigation labels.
    for (const staff of model.staff) {
      const head = staff.rig.root.localToWorld(new THREE.Vector3(0, 1.68, 0));
      const target = project(head);
      const x = (target.x * 0.5 + 0.5) * width, y = (-target.y * 0.5 + 0.5) * height;
      canvas.dataset['staff' + staff.id] = JSON.stringify({ x, y });
      pickAreas.push({ left:x-22, top:y-28, width:44, height:56 });
    }


    // Protect complete silhouettes, including waving arms and the visiting representative.
    const people = [...model.staff.map(s=>({id:s.id,root:s.rig.root})),
      {id:'representative',root:model.actor.root},...(doctorFigure?[{id:'doctor',root:doctorFigure}]:[])].filter((p,i,all)=>all.findIndex(other=>other.root===p.root)===i);
    const peopleAreas = people.map(({id,root})=>{
      const bounds=new THREE.Box3().setFromObject(root);
      const points=[];
      for(const x of [bounds.min.x,bounds.max.x])
        for(const y of [bounds.min.y,bounds.max.y])
          for(const z of [bounds.min.z,bounds.max.z]) points.push(project({x,y,z}));
      const xs=points.map(p=>(p.x*.5+.5)*width),ys=points.map(p=>(-p.y*.5+.5)*height);
      return {id,left:Math.min(...xs)-8,top:Math.min(...ys)-8,
        width:Math.max(...xs)-Math.min(...xs)+16,height:Math.max(...ys)-Math.min(...ys)+16};
    });
    canvas.dataset.peopleAreas=JSON.stringify(peopleAreas);
    const speech = options.speech.current;
    if (observedSpeech !== speech) {
      if (observedSpeech) speechObserver.unobserve(observedSpeech);
      if (speech) speechObserver.observe(speech);
      observedSpeech = speech;
    }
    if (speech) {
      const staff = model.staff.find(s=>s.location===state.conversation);
      const speaker = state.speechSpeaker==='representative' ? model.actor : state.conversation==='doctor' ? model.doctor : staff?.rig;
      if (speaker) {
        const head = project(speaker.root.localToWorld(new THREE.Vector3(0,1.68,0)));
        const x=(head.x*.5+.5)*width, y=(-head.y*.5+.5)*height;
        const actorHead=project({x:sample.x,y:1.83,z:sample.z});
        const actorX=(actorHead.x*.5+.5)*width, actorY=(-actorHead.y*.5+.5)*height;
        const placed=layoutSceneSpeech({x,y:y-28},{width:speech.offsetWidth,height:speech.offsetHeight},
          {width,height},[...peopleAreas,{left:actorX-24,top:actorY-48,width:48,height:76},
            {left:0,top:height-80,width:200,height:80}]);
        speech.style.left=placed.left+'px';speech.style.top=placed.top+'px';
        speech.style.visibility='visible';
        speech.dataset.anchor=JSON.stringify({x,y:y-28,speaker:state.speechSpeaker});
        const line=options.speechLine.current;
        if(line){
          line.setAttribute('x1',String(placed.tailX));line.setAttribute('y1',String(placed.tailY));
          line.setAttribute('x2',String(Math.max(8,Math.min(width-8,x))));
          line.setAttribute('y2',String(Math.max(8,Math.min(height-8,y-28))));
        }
        pickAreas.push({left:placed.left,top:placed.top,width:speech.offsetWidth,height:speech.offsetHeight});
      }
    }
    for (const placed of layoutSceneLabels(sceneLabels, width, height, pickAreas)) {
      const label = options.labels.current[placed.id as LocationId]!;
      label.style.left = `${placed.left + placed.width / 2}px`;
      label.style.top = `${placed.top + placed.height}px`;
    }
    if (options.player.current) {
      const point = project({ x: sample.x, y: 2.13, z: sample.z });
      options.player.current.style.left = `${(point.x * 0.5 + 0.5) * width}px`;
      options.player.current.style.top = `${(-point.y * 0.5 + 0.5) * height}px`;
      options.player.current.style.visibility =
        Math.abs(point.x) < 1.1 && Math.abs(point.y) < 1.1 ? 'visible' : 'hidden';
    }
    const snapshot = {
      zoom: Number(camera.zoom.toFixed(3)),
      azimuth: Number(controls.getAzimuthalAngle().toFixed(3)),
      polar: Number(controls.getPolarAngle().toFixed(3)),
    };
    const snapshotKey = JSON.stringify(snapshot);
    if (lastSnapshot !== snapshotKey) {
      lastSnapshot = snapshotKey;
      options.onCamera(snapshot);
    }
    if (!ready) {
      ready = true;
      options.onReady();
    }
    dirty = false;
  }
  frameId = requestAnimationFrame(render);
  return {
    rotate,
    zoom,
    reset,
    top,
    setDirection,
    stopMovement,
    focus: () => canvas.focus({ preventScroll: true }),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      speechObserver.disconnect();
      controls.removeEventListener('change', cameraChanged);
      controls.dispose();
      stage?.removeEventListener('wheel', wheelOverLabel);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', cancelPointer);
      canvas.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('blur', stopMovement);
      window.removeEventListener('blur', stopMovement);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', contextLost);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>(),
        textures = new Set<THREE.Texture>();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material)
          for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            materials.add(material);
            for (const value of Object.values(material))
              if (value instanceof THREE.Texture) textures.add(value);
          }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      sun.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
