import * as THREE from 'three';
import type { ProfessionalRole } from '../data/characterRoles';

export interface PersonRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  pose: (phase: number, walking: boolean) => void;
}
export function createPerson(
  doctor = false,
  appearance?: { hair: number; coat: number; glasses: boolean; stethoscope?: boolean; badge?: number; outfit?: ProfessionalRole; tie?: number; briefcase?: boolean },
): PersonRig {
  const root = new THREE.Group(),
    body = new THREE.Group();
  root.add(body);
  const outfit = appearance?.outfit ?? (doctor ? 'doctor' : 'representative');
  root.userData.outfit = outfit;
  const skin = new THREE.MeshStandardMaterial({ color: 0xd8b293, roughness: 0.8 });
  const suit = new THREE.MeshStandardMaterial({
    color: doctor ? (appearance?.coat ?? 0xf3f4e9) : 0x37716b,
    roughness: 0.85,
  });
  const trousers = new THREE.MeshStandardMaterial({ color: 0x324f59, roughness: 0.9 });
  const hair = new THREE.MeshStandardMaterial({
    color: doctor ? (appearance?.hair ?? 0x727c75) : 0x273c3a,
    roughness: 1,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x203933, roughness: 0.8 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xf3efdd, roughness: 0.9 });
  const make = (
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  make(body, new THREE.BoxGeometry(0.42, 0.23, 0.25), trousers, 0, 0.85, 0);
  make(body, new THREE.CapsuleGeometry(0.225, 0.28, 5, 12), suit, 0, 1.18, 0).scale.z = 0.67;
  make(body, new THREE.BoxGeometry(0.16, 0.4, 0.016), shirt, 0, 1.21, 0.157);
  if (!doctor || outfit === 'supervisor') {
    const tie = new THREE.MeshStandardMaterial({ color: appearance?.tie ?? 0xbace91 });
    make(body, new THREE.BoxGeometry(0.045, 0.28, 0.022), tie, 0, 1.19, 0.176).name='professional-tie';
  }
  if (outfit === 'supervisor') {
    const lapelMat = new THREE.MeshStandardMaterial({color:0x46617c,roughness:.7,side:THREE.DoubleSide});
    for (const sign of [-1,1]) {
      const shape=new THREE.Shape();
      shape.moveTo(sign*.07,1.42);shape.lineTo(sign*.2,1.32);shape.lineTo(sign*.055,1.08);shape.closePath();
      const lapel=new THREE.Mesh(new THREE.ShapeGeometry(shape),lapelMat);
      lapel.position.z=.19;lapel.name='suit-lapel';body.add(lapel);
    }
    make(body,new THREE.SphereGeometry(.012,8,6),dark,0,1.05,.177);
    make(body,new THREE.BoxGeometry(.07,.02,.018),shirt,-.13,1.28,.18).name='suit-pocket-square';
  } else if (outfit === 'pharmacist') {
    const trim=new THREE.MeshStandardMaterial({color:0x2b9d88});
    make(body,new THREE.BoxGeometry(.18,.1,.016),trim,0,1.38,.175).name='pharmacy-collar';
    make(body,new THREE.BoxGeometry(.032,.025,.018),trim,.13,1.19,.19).name='pharmacy-badge';
  }
  make(body, new THREE.CylinderGeometry(0.07, 0.07, 0.15, 12), skin, 0, 1.45, 0);
  make(body, new THREE.SphereGeometry(0.19, 20, 16), skin, 0, 1.66, 0.015).scale.y = 1.12;
  make(
    body,
    new THREE.SphereGeometry(0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.53),
    hair,
    0,
    1.69,
    0,
  ).scale.y = 1.05;
  make(body, new THREE.SphereGeometry(0.037, 10, 8), skin, 0, 1.64, 0.2);
  for (const x of [-0.067, 0.067]) {
    make(body, new THREE.SphereGeometry(0.014, 8, 6), dark, x, 1.69, 0.183);
    make(body, new THREE.BoxGeometry(0.055, 0.012, 0.014), hair, x, 1.73, 0.178);
    if (doctor && (appearance?.glasses ?? true)) {
      const glasses = make(
        body,
        new THREE.TorusGeometry(0.047, 0.006, 6, 16),
        dark,
        x,
        1.69,
        0.195,
      );
      glasses.scale.x = 1.15;
    }
  }
  make(
    body,
    new THREE.BoxGeometry(0.065, 0.009, 0.012),
    new THREE.MeshStandardMaterial({ color: 0x9a7058 }),
    0,
    1.57,
    0.19,
  );
  for (const x of [-0.19, 0.19])
    make(body, new THREE.SphereGeometry(0.037, 10, 8), skin, x, 1.65, 0);
  make(body, new THREE.BoxGeometry(0.085, 0.12, 0.015), shirt, 0.13, 1.17, 0.16);
  make(
    body,
    new THREE.BoxGeometry(0.055, 0.035, 0.018),
    new THREE.MeshStandardMaterial({ color: appearance?.badge ?? 0x8aaf92 }),
    0.13,
    1.2,
    0.172,
  );
  const leg = (x: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.79, 0);
    root.add(pivot);
    make(pivot, new THREE.CylinderGeometry(0.078, 0.07, 0.37, 12), trousers, 0, -0.185, 0);
    const knee = new THREE.Group();
    knee.position.y = -0.35;
    pivot.add(knee);
    make(knee, new THREE.CylinderGeometry(0.069, 0.057, 0.36, 12), trousers, 0, -0.18, 0);
    make(knee, new THREE.BoxGeometry(0.14, 0.095, 0.25), dark, 0, -0.39, 0.055);
    return { pivot, knee };
  };
  const left = leg(-0.115),
    right = leg(0.115);
  const arm = (x: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.38, 0);
    body.add(pivot);
    make(pivot, new THREE.CapsuleGeometry(0.064, 0.39, 4, 10), suit, 0, -0.245, 0);
    make(pivot, new THREE.SphereGeometry(0.07, 10, 8), skin, 0, -0.54, 0);
    return pivot;
  };
  const leftArm = arm(-0.28),
    rightArm = arm(0.28);
  if (!doctor && appearance?.briefcase !== false) {
    const bagMat = new THREE.MeshStandardMaterial({ color: 0x6a6250, roughness: 0.9 });
    make(rightArm, new THREE.BoxGeometry(0.28, 0.26, 0.11), bagMat, 0.045, -0.72, 0);
    make(rightArm, new THREE.TorusGeometry(0.075, 0.014, 6, 14), bagMat, 0.045, -0.57, 0);
  } else if (outfit === 'doctor' && appearance?.stethoscope !== false) {
    const stethoscope = new THREE.MeshStandardMaterial({ color: 0x5c8680, roughness: 0.65 });
    make(
      body,
      new THREE.TorusGeometry(0.13, 0.014, 6, 22, Math.PI * 1.5),
      stethoscope,
      0,
      1.25,
      0.175,
    ).rotation.z = -Math.PI * 0.25;
    body.children.at(-1)!.name='stethoscope';
    make(body, new THREE.SphereGeometry(0.035, 10, 8), stethoscope, 0.11, 1.13, 0.19);
  }
  // Reparent existing facial meshes without changing their neutral world pose.
  const head = new THREE.Group();
  head.position.y = 1.45;
  for (const child of [...body.children]) {
    if (child instanceof THREE.Mesh && child.position.y > 1.45) {
      child.position.y -= 1.45;
      head.add(child);
    }
  }
  body.add(head);
  const pose = (phase: number, walking: boolean) => {
    const gait = walking ? Math.sin(phase) * 0.48 : 0;
    left.pivot.rotation.x = gait;
    right.pivot.rotation.x = -gait;
    left.knee.rotation.x = Math.max(0, -gait) * 1.3;
    right.knee.rotation.x = Math.max(0, gait) * 1.3;
    leftArm.rotation.x = -gait * 0.75;
    rightArm.rotation.x = gait * 0.7;
    body.position.y = walking ? Math.abs(Math.sin(phase)) * 0.025 : 0;
  };
  pose(0, false);
  return {
    root,
    body,
    head,
    leftLeg: left.pivot,
    rightLeg: right.pivot,
    leftKnee: left.knee,
    rightKnee: right.knee,
    leftArm,
    rightArm,
    pose,
  };
}
