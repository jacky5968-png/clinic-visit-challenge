import {furnishStage} from './stageFurnishings';
import {mainTarget,sceneLocations} from '../data/sceneLocations';
import { clinicStaff } from '../data/clinicStaff';
import { examinerAppearance, type ProfessionalRole } from '../data/characterRoles';
import * as THREE from 'three';
import { worldLocations } from '../engine/clinic3d';
import type { LocationId } from '../engine/clinic';
import { createPerson } from './person';
import { defaultMission, type VisitMission } from '../data/visitMissions';

export function buildClinic(mission: VisitMission = defaultMission) {
  const target=mainTarget(mission),names=sceneLocations(mission);
  const root = new THREE.Group();
  root.userData.missionId = mission.id;
  const pickables: THREE.Object3D[] = [];
  const wallMaterials: { material: THREE.MeshStandardMaterial; side: 'back' | 'left' }[] = [];
  const mat = (color: number, roughness = 0.82) =>
    new THREE.MeshStandardMaterial({ color, roughness });
  const white = mat(0xf1f0e5),
    floor = mat(mission.theme.floor),
    teal = mat(mission.theme.furniture),
    wood = mat(mission.theme.wood),
    dark = mat(0x294e4c),
    steel = mat(0xa2b4a6, 0.45),
    green = mat(mission.theme.chairs);
  function box(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(
    parent: THREE.Object3D,
    r: number,
    h: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
  ) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 18), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function group(id?: LocationId) {
    const g = new THREE.Group();
    root.add(g);
    if (id) {
      g.userData.location = id;
      pickables.push(g);
    }
    return g;
  }
  function text(
    parent: THREE.Object3D,
    value: string,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    bg = '#ffffff',
    color = '#142e43',
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = color;
    ctx.font = '700 92px "Microsoft JhengHei", "微軟正黑體", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value, 512, 132, 960);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false }),
    );
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function plant(parent: THREE.Object3D, x: number, z: number, size = 1) {
    const p = new THREE.Group();
    p.position.set(x, 0.14, z);
    p.scale.setScalar(size);
    parent.add(p);
    cylinder(p, 0.19, 0.35, 0, 0.175, 0, mat(0xc2b799));
    cylinder(p, 0.13, 0.4, 0, 0.54, 0, mat(0x7b8a62));
    for (let i = 0; i < 7; i++) {
      const theta = (i * Math.PI * 2) / 7;
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 10, 8),
        mat(i % 2 ? 0x779c73 : 0x9ab78b),
      );
      leaf.scale.set(0.7, 1.9, 0.65);
      leaf.rotation.z = Math.cos(theta) * 0.6;
      leaf.rotation.x = Math.sin(theta) * 0.6;
      leaf.position.set(Math.cos(theta) * 0.13, 0.76, Math.sin(theta) * 0.13);
      leaf.castShadow = true;
      p.add(leaf);
    }
  }
  function chair(parent: THREE.Object3D, x: number, z: number, rotation = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0.13, z);
    g.rotation.y = rotation;
    parent.add(g);
    box(g, 0.62, 0.15, 0.62, 0, 0.48, 0, teal);
    box(g, 0.62, 0.63, 0.12, 0, 0.85, -0.26, green);
    for (const px of [-0.24, 0.24])
      for (const pz of [-0.23, 0.23]) box(g, 0.045, 0.43, 0.045, px, 0.22, pz, steel);
    return g;
  }
  const base = group();
  box(base, 13.5, 0.28, 10.8, 0, -0.2, 0.4, mat(0xc8d6bd));
  box(base, 12.3, 0.2, 9.6, 0, -0.03, 0.15, white);
  box(base, 11.6, 0.12, 8.8, 0, 0.08, 0, floor);
  const seams: number[] = [];
  for (let x = -5.6; x < 5.8; x += 0.8) seams.push(x, 0.147, -4.35, x, 0.147, 4.35);
  for (let z = -4.3; z < 4.4; z += 0.8) seams.push(-5.75, 0.147, z, 5.75, 0.147, z);
  const grid = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(seams, 3)),
    new THREE.LineBasicMaterial({ color: 0xc9d4c4, transparent: true, opacity: 0.65 }),
  );
  base.add(grid);
  const back = mat(mission.theme.wall),
    left = mat(mission.theme.wall);
  back.transparent = left.transparent = true;
  wallMaterials.push({ material: back, side: 'back' }, { material: left, side: 'left' });
  box(base, 11.9, 2.75, 0.2, 0, 1.5, -4.45, back);
  box(base, 0.2, 2.75, 8.9, -5.86, 1.5, -0.02, left);
  box(base, 12.1, 0.16, 0.34, 0, 2.92, -4.45, white);
  box(base, 0.34, 0.16, 9.08, -5.86, 2.92, -0.02, white);
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x9cc7bd,
    roughness: 0.35,
    metalness: 0.12,
  });
  for (const x of [-4.6, -3, -1.4]) {
    box(base, 1.26, 1.5, 0.07, x, 1.87, -4.3, white);
    box(base, 1.12, 1.35, 0.08, x, 1.87, -4.25, windowMat);
    box(base, 0.035, 1.35, 0.09, x, 1.87, -4.19, white);
    box(base, 1.12, 0.04, 0.09, x, 1.87, -4.19, white);
  }
  text(base, [...mission.clinic].join(' '), 2.8, 0.7, 2.85, 2.25, -4.3);
  text(base, mission.english, 2.5, 0.4, 2.85, 1.8, -4.29, '#e5eadc', mission.theme.accent);
  const cross = group();
  cross.visible=mission.kind!=='training';
  cross.position.set(-5.73, 1.8, 1.4);
  box(cross, 0.08, 0.5, 0.15, 0, 0, 0, teal);
  box(cross, 0.08, 0.15, 0.5, 0, 0, 0, teal);

  // The former reception area is now a pharmacy; keep its service approach clear.
  const reception = group('reception');
  reception.name = 'pharmacy';
  box(reception, 3.4, 0.92, 0.94, -3.15, 0.61, -0.85, white).name = 'pharmacy-counter';
  box(reception, 3.6, 0.12, 1.06, -3.15, 1.1, -0.85, white);
  box(reception, 3.18, 0.68, 0.035, -3.15, 0.64, -0.365, teal);
  text(reception, names.reception.name, 1.5, 0.38, -3.15, 0.67, -0.34, mission.theme.accent, '#ffffff');
  box(reception, 0.52, 0.1, 0.48, -3.15, 1.22, -0.95, steel);
  box(reception, 0.91, 0.57, 0.08, -3.15, 1.53, -1.05, dark);
  box(reception, 0.79, 0.46, 0.015, -3.15, 1.53, -0.998, mat(0x9cbab1));
  box(reception, 0.7, 0.025, 0.23, -3.15, 1.18, -0.5, steel);
  const shelf = new THREE.Group();
  shelf.name = 'pharmacy-shelving';
  reception.add(shelf);
  box(shelf, 3.02, 2.3, 0.09, -3.6, 1.29, -4.02, teal);
  for (const x of [-5.06, -2.14]) box(shelf, 0.1, 2.38, 0.64, x, 1.33, -3.78, white);
  for (const y of [0.3, 0.88, 1.46, 2.04, 2.5])
    box(shelf, 3.02, 0.07, 0.64, -3.6, y, -3.78, white);
  const packColors = [mat(0x2877ce), mat(0x0d9b74), mat(0xe98c27)];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 7; i++) {
    const x = -4.73 + i * 0.375, y = 0.5 + row * 0.58;
    box(shelf, 0.25, 0.32, 0.3, x, y, -3.73, white).name = 'medicine-carton';
    box(shelf, 0.254, 0.09, 0.02, x, y + 0.055, -3.57, packColors[(row+i)%3]);
  }
  for (let i = 0; i < 5; i++) {
    const x = -4.65 + i * 0.48;
    cylinder(shelf, 0.085, 0.26, x, 2.205, -3.7, mat(0xb77422)).name = 'medicine-bottle';
    cylinder(shelf, 0.09, 0.055, x, 2.36, -3.7, white);
    box(shelf, 0.12, 0.12, 0.02, x, 2.2, -3.615, white);
  }
  text(reception, mission.kind==='training'?'教 材 陳 列':'藥 品 陳 列', 2.2, 0.32, -3.6, 2.74, -3.7, '#ffffff', '#142e43').name='shelf-label';
  box(reception, 0.32, 0.26, 0.18, -2.16, 1.29, -0.72, white);
  box(reception, 0.22, 0.07, 0.2, -2.55, 1.2, -0.62, packColors[1]);
  plant(base, -4.36, -0.8, 0.68);

  const entrance = group('entrance');
  for (const x of [-3.55, -1.65]) box(entrance, 0.09, 2.25, 0.12, x, 1.28, 4.37, teal);
  box(entrance, 2, 0.12, 0.18, -2.6, 2.45, 4.37, teal);
  text(entrance, names.entrance.name, 1.65, 0.34, -2.6, 2.45, 4.47, mission.theme.accent, '#ffffff');
  const glass = new THREE.MeshStandardMaterial({
    color: 0xa6d7cb,
    transparent: true,
    opacity: 0.25,
    roughness: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  // Open sliding doors leave a 1.2m gap for V4 free walking.
  box(entrance, 0.4, 1.94, 0.045, -3.4, 1.26, 4.37, glass);
  box(entrance, 0.4, 1.94, 0.045, -1.8, 1.26, 4.37, glass);
  box(entrance, 0.025, 0.38, 0.035, -3.21, 1.2, 4.43, steel);
  box(entrance, 0.025, 0.38, 0.035, -1.99, 1.2, 4.43, steel);
  box(entrance, 1.72, 0.025, 0.76, -2.6, 0.16, 4.86, mat(0xb1c5a7));
  box(base, 2.8, 0.65, 0.13, -0.1, 0.47, 4.39, white);
  text(
    base,
    [...mission.clinic].join(' '),
    1.75,
    0.38,
    -0.1,
    0.51,
    4.46,
    '#f1f0e5',
    mission.theme.accent,
  );
  box(base, 1.2, 0.65, 0.13, -4.55, 0.47, 4.39, white);

  // Replace the waiting furniture with a staffed-service style registration desk.
  const waiting = group('waiting');
  waiting.name = 'registration';
  box(waiting, 3, 0.98, 0.74, 2.95, 0.64, 1.62, white).name = 'registration-counter';
  box(waiting, 3.12, 0.12, 0.84, 2.95, 1.19, 1.62, wood).name = 'registration-worktop';
  box(waiting, 2.8, 0.7, 0.025, 2.95, 0.65, 2.002, teal);
  text(waiting, names.waiting.name, 2.1, 0.38, 2.95, 0.67, 2.025, mission.theme.accent, '#ffffff');
  box(waiting, 0.17, 0.2, 0.12, 2.3, 1.36, 1.55, steel);
  box(waiting, 0.82, 0.54, 0.08, 2.3, 1.65, 1.55, dark).name = 'registration-computer';
  text(waiting, '掛 號', 0.66, 0.3, 2.3, 1.65, 1.595, '#1856b4', '#ffffff');
  box(waiting, 0.66, 0.025, 0.22, 2.3, 1.27, 1.86, steel);
  box(waiting, 0.36, 0.16, 0.28, 3.52, 1.34, 1.78, dark).name = 'health-card-reader';
  box(waiting, 0.18, 0.014, 0.24, 3.61, 1.43, 1.78, white);
  text(waiting, '健保卡', 0.46, 0.16, 3.52, 1.34, 1.925, '#ffffff', '#142e43');
  box(waiting, 0.36, 0.25, 0.32, 4.08, 1.375, 1.49, white).name = 'receipt-printer';
  box(waiting, 0.18, 0.015, 0.3, 4.08, 1.51, 1.66, white);
  box(waiting, 0.25, 0.035, 0.18, 4.08, 1.39, 1.66, dark);
  cylinder(waiting, 0.035, 0.58, 3.24, 1.54, 1.4, steel);
  box(waiting, 0.85, 0.36, 0.06, 3.24, 1.98, 1.4, dark).name = 'queue-display';
  text(waiting, '008', 0.74, 0.29, 3.24, 1.98, 1.435, '#142e43', '#ffe05b');
  box(waiting, 0.45, 1.15, 0.43, 5.08, 0.72, 3.6, white);
  cylinder(waiting, 0.16, 0.39, 5.08, 1.49, 3.6, windowMat);
  plant(waiting, 5.05, 1, 0.9);

  const office = group('doctor');
  box(office, 4.82, 0.025, 3.95, 3.2, 0.16, -2.3, mat(0xdce7da));
  box(office, 0.085, 2.12, 3.9, 0.73, 1.22, -2.32, glass);
  for (const z of [-4.27, -2.32, -0.38]) box(office, 0.065, 2.24, 0.065, 0.73, 1.27, z, steel);
  box(office, 0.1, 0.075, 3.95, 0.73, 2.42, -2.32, steel);
  box(office, 1.48, 0.7, 0.1, 1.47, 0.5, -0.38, white);
  box(office, 1.08, 0.7, 0.1, 5.12, 0.5, -0.38, white);
  box(office, 1.48, 0.8, 0.045, 1.47, 1.25, -0.38, glass);
  box(office, 1.08, 0.8, 0.045, 5.12, 1.25, -0.38, glass);
  box(office, 2.9, 0.14, 1.08, 3.35, 0.96, -1.96, wood);
  for (const x of [2.18, 4.52]) box(office, 0.12, 0.77, 0.88, x, 0.5, -1.96, white);
  box(office, 0.12, 0.23, 0.12, 3.25, 1.15, -2.06, steel);
  box(office, 0.88, 0.52, 0.06, 3.25, 1.47, -2.09, dark);
  box(office, 0.77, 0.42, 0.02, 3.25, 1.47, -2.045, mat(0xb0cbc3));
  box(office, 0.67, 0.025, 0.22, 3.25, 1.05, -1.66, steel);
  box(office, 0.4, 0.03, 0.32, 4.1, 1.055, -1.72, white);
  chair(office, 3.4, -2.85);
  box(office, 2.75, 0.95, 0.64, 3.62, 0.64, -3.89, white);
  box(office, 2.9, 0.08, 0.75, 3.62, 1.16, -3.89, wood);
  for (const x of [2.72, 3.62, 4.52]) box(office, 0.06, 0.055, 0.04, x, 0.83, -3.54, steel);
  const doctor = createPerson(true, examinerAppearance(mission));
  doctor.root.userData.doctorName = mission.doctor.name;
  doctor.root.position.set(3.4, -0.21, -2.85);
  doctor.leftLeg.rotation.x = doctor.rightLeg.rotation.x = -Math.PI / 2;
  doctor.leftKnee.rotation.x = doctor.rightKnee.rotation.x = Math.PI / 2;
  if(target!=='reception') office.add(doctor.root);
  let primary=doctor;
  text(office, target==='reception'?'產品諮詢區':mission.doctor.name, 0.68, 0.22, 4.15, 1.16, -1.4, '#f8fbef', mission.theme.accent);
  plant(office, 4.65, -3.9, 0.7);

  plant(base, -5.02, 3.3, 1.15);
  function tree(x: number, z: number, size = 1) {
    const g = group();
    g.position.set(x, -0.1, z);
    g.scale.setScalar(size);
    cylinder(g, 0.09, 1.4, 0, 0.7, 0, mat(0x9b9c77));
    for (const [px, py, pz, r] of [
      [0, 1.9, 0, 0.65],
      [-0.34, 1.7, 0.08, 0.5],
      [0.3, 2.05, 0.05, 0.46],
    ]) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(r, 12, 10),
        mat(py > 2 ? 0xa4bd88 : 0x86a777),
      );
      mesh.position.set(px, py, pz);
      mesh.castShadow = true;
      g.add(mesh);
    }
    cylinder(g, 0.65, 0.12, 0, 0.03, 0, mat(0xbdcfb0));
  }
  tree(-6.7, -2.8, 0.9);
  tree(6.7, 3.6, 0.8);
  tree(-6.6, 4.3, 0.65);
  furnishStage(mission,{root,reception,waiting,office,shelf,text});
  const staff = clinicStaff.map(profile => {
    const isMain=target==='reception' && profile.location===target;
    const displayName=names[profile.location].speaker;
    const outfit:ProfessionalRole=mission.kind==='training'?'staff':profile.location==='reception'?'pharmacist':'staff';
    const appearance={...profile.appearance,outfit,...(mission.kind==='training'?{coat:0x2877ce,badge:0xffd16a}:{})};
    const rig = createPerson(true, isMain?examinerAppearance(mission):appearance);
    if(isMain){primary=rig;rig.root.userData.doctorName=mission.doctor.name;}
    rig.root.name = 'staff-' + profile.id;
    rig.root.userData.location = profile.location;
    rig.root.userData.staffName = displayName;
    rig.root.position.set(profile.x, 0.15, profile.z);
    const destination = worldLocations[profile.location];
    rig.root.rotation.y = Math.atan2(destination.x-profile.x, destination.z-profile.z);
    (profile.location === 'reception' ? reception : waiting).add(rig.root);
    return { ...profile, name:displayName, rig };
  });
  const actor = createPerson();
  actor.root.position.set(worldLocations.entrance.x, 0.15, worldLocations.entrance.z);
  root.add(actor.root);
  const markers = new Map<LocationId, THREE.Mesh>();
  for (const id of ['entrance', 'reception', 'waiting', 'doctor'] as LocationId[]) {
    const point = worldLocations[id];
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.39, 36),
      new THREE.MeshBasicMaterial({
        color: 0x9eb77a,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(point.x, 0.17, point.z);
    ring.userData.location = id;
    root.add(ring);
    pickables.push(ring);
    markers.set(id, ring);
  }
  return { root, pickables, wallMaterials, actor, markers, staff, doctor:primary };
}
